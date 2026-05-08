import type Redis from 'ioredis'
import { ERROR_CODES } from '../plugins/errors'

export type RateLimitThrow = {
    statusCode: number
    code: string
    message: string
    retryAfterSec?: number
}

function parsePositiveInt(name: string, fallback: number): number {
    const raw = process.env[name]
    if (raw === undefined || raw === '') return fallback
    const n = Number.parseInt(raw, 10)
    if (!Number.isFinite(n) || n < 1) return fallback
    return n
}

/** ENV-configurable defaults match docs/TECH-SPEC.md §5.2 */
export function loadRateLimitOptions() {
    return {
        otpPerPhoneHour: parsePositiveInt('RATE_LIMIT_OTP_PER_PHONE_HOUR', 5),
        otpPerIpHour: parsePositiveInt('RATE_LIMIT_OTP_PER_IP_HOUR', 20),
        staffLoginPerMinute: parsePositiveInt('RATE_LIMIT_STAFF_LOGIN_PER_MINUTE', 10),
        staffLoginLockoutSec: parsePositiveInt('RATE_LIMIT_STAFF_LOGIN_LOCKOUT_SECONDS', 300),
        staffLoginMinuteWindowSec: parsePositiveInt('RATE_LIMIT_STAFF_LOGIN_WINDOW_SECONDS', 90),
        stampPerStaffHour: parsePositiveInt('RATE_LIMIT_STAMP_PER_STAFF_HOUR', 60),
        redeemPerStaffHour: parsePositiveInt('RATE_LIMIT_REDEEM_PER_STAFF_HOUR', 20),
    }
}

const LUA_INCR_UNDER_LIMIT = `
local v = redis.call('INCR', KEYS[1])
if v == 1 then redis.call('EXPIRE', KEYS[1], tonumber(ARGV[2])) end
local max = tonumber(ARGV[1])
if v > max then
  redis.call('DECR', KEYS[1])
  return {0, v - 1}
end
return {1, v}
`

function utcHourBucket(): number {
    return Math.floor(Date.now() / 3600000)
}

function utcMinuteBucket(): number {
    return Math.floor(Date.now() / 60000)
}

export class RedisRateLimiter {
    private opts = loadRateLimitOptions()

    constructor(private redis: Redis) { }

    private throwRateLimited(message: string, retryAfterSec?: number): never {
        const err: RateLimitThrow = {
            statusCode: 429,
            code: ERROR_CODES.RATE_LIMITED,
            message,
            retryAfterSec,
        }
        throw err
    }

    /** SMS OTP send: per (vendor, phone) and per IP (hourly fixed UTC windows). */
    async assertOtpRequestAllowed(vendorId: string, phone: string, clientIp: string): Promise<void> {
        const hour = utcHourBucket()
        const phoneKey = `rl:otp:vp:${vendorId}:${phone}:${hour}`
        const ipKey = `rl:otp:ip:${clientIp}:${hour}`
        const ttl = 4000

        const ok1 = await this.redis.eval(LUA_INCR_UNDER_LIMIT, 1, phoneKey, this.opts.otpPerPhoneHour, ttl) as [number, number]
        if (ok1[0] === 0) {
            this.throwRateLimited('Too many verification code requests for this number. Try again later.')
        }

        const ok2 = await this.redis.eval(LUA_INCR_UNDER_LIMIT, 1, ipKey, this.opts.otpPerIpHour, ttl) as [number, number]
        if (ok2[0] === 0) {
            await this.redis.decr(phoneKey)
            this.throwRateLimited('Too many verification code requests from this network. Try again later.')
        }
    }

    /** Staff PIN login: per IP, minute window; on exceed set lockout (TECH-SPEC §5.2). */
    async assertStaffLoginAllowed(clientIp: string): Promise<void> {
        const lockKey = `rl:staff_login:lock:${clientIp}`
        const ttlLock = await this.redis.ttl(lockKey)
        if (ttlLock > 0) {
            this.throwRateLimited('Too many login attempts. Please wait before trying again.', ttlLock)
        }

        const minute = utcMinuteBucket()
        const windowKey = `rl:staff_login:win:${clientIp}:${minute}`
        const winTtl = this.opts.staffLoginMinuteWindowSec

        const v = await this.redis.incr(windowKey)
        if (v === 1) {
            await this.redis.expire(windowKey, winTtl)
        }
        if (v > this.opts.staffLoginPerMinute) {
            await this.redis.decr(windowKey)
            await this.redis.set(lockKey, '1', 'EX', this.opts.staffLoginLockoutSec)
            this.throwRateLimited(
                'Too many login attempts. Please wait before trying again.',
                this.opts.staffLoginLockoutSec
            )
        }
    }

    async consumeStaffStampHour(staffId: string): Promise<void> {
        const hour = utcHourBucket()
        const key = `rl:stamp:staff:${staffId}:${hour}`
        const ttl = 4000
        const ok = await this.redis.eval(LUA_INCR_UNDER_LIMIT, 1, key, this.opts.stampPerStaffHour, ttl) as [number, number]
        if (ok[0] === 0) {
            this.throwRateLimited('Stamp limit reached for this period. Try again later.')
        }
    }

    async rollbackStaffStampHour(staffId: string): Promise<void> {
        const hour = utcHourBucket()
        const key = `rl:stamp:staff:${staffId}:${hour}`
        await this.redis.decr(key)
    }

    async consumeStaffRedeemHour(staffId: string): Promise<void> {
        const hour = utcHourBucket()
        const key = `rl:redeem:staff:${staffId}:${hour}`
        const ttl = 4000
        const ok = await this.redis.eval(LUA_INCR_UNDER_LIMIT, 1, key, this.opts.redeemPerStaffHour, ttl) as [number, number]
        if (ok[0] === 0) {
            this.throwRateLimited('Redeem limit reached for this period. Try again later.')
        }
    }

    async rollbackStaffRedeemHour(staffId: string): Promise<void> {
        const hour = utcHourBucket()
        const key = `rl:redeem:staff:${staffId}:${hour}`
        await this.redis.decr(key)
    }
}
