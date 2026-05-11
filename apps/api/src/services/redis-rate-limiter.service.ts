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
        passkeyOptionsPerMinute: parsePositiveInt('RATE_LIMIT_PASSKEY_OPTIONS_PER_MINUTE', 30),
        passkeyVerifyPerMinute: parsePositiveInt('RATE_LIMIT_PASSKEY_VERIFY_PER_MINUTE', 15),
        passkeyVerifyLockoutSec: parsePositiveInt('RATE_LIMIT_PASSKEY_VERIFY_LOCKOUT_SECONDS', 300),
        passkeyVerifyWindowSec: parsePositiveInt('RATE_LIMIT_PASSKEY_VERIFY_WINDOW_SECONDS', 90),
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

    private throwRateLimited(message: string, retryAfterSec?: number, code: string = ERROR_CODES.RATE_LIMITED): never {
        const err: RateLimitThrow = {
            statusCode: 429,
            code,
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

    /** Passkey / WebAuthn challenge options: per IP minute window (prevents enumeration). */
    async assertPasskeyOptionsAllowed(clientIp: string): Promise<void> {
        const minute = utcMinuteBucket()
        const key = `rl:passkey_opt:ip:${clientIp}:${minute}`
        const winTtl = 90
        const v = await this.redis.incr(key)
        if (v === 1) {
            await this.redis.expire(key, winTtl)
        }
        if (v > this.opts.passkeyOptionsPerMinute) {
            await this.redis.decr(key)
            this.throwRateLimited('Too many passkey requests. Try again shortly.', undefined, ERROR_CODES.PASSKEY_RATE_LIMITED)
        }
    }

    /** Passkey verify: per IP with lockout (mirrors staff PIN login pattern). */
    async assertPasskeyVerifyAllowed(clientIp: string): Promise<void> {
        const lockKey = `rl:passkey_verify:lock:${clientIp}`
        const ttlLock = await this.redis.ttl(lockKey)
        if (ttlLock > 0) {
            this.throwRateLimited('Too many passkey attempts. Please wait before trying again.', ttlLock, ERROR_CODES.PASSKEY_RATE_LIMITED)
        }

        const minute = utcMinuteBucket()
        const windowKey = `rl:passkey_verify:win:${clientIp}:${minute}`
        const winTtl = this.opts.passkeyVerifyWindowSec

        const v = await this.redis.incr(windowKey)
        if (v === 1) {
            await this.redis.expire(windowKey, winTtl)
        }
        if (v > this.opts.passkeyVerifyPerMinute) {
            await this.redis.decr(windowKey)
            await this.redis.set(lockKey, '1', 'EX', this.opts.passkeyVerifyLockoutSec)
            this.throwRateLimited(
                'Too many passkey attempts. Please wait before trying again.',
                this.opts.passkeyVerifyLockoutSec,
                ERROR_CODES.PASSKEY_RATE_LIMITED
            )
        }
    }
}
