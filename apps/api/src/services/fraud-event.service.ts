import type { Prisma, PrismaClient } from '@prisma/client'
import type Redis from 'ioredis'
import type { RateLimitThrow } from './redis-rate-limiter.service'

/** Well-known actor for automated fraud telemetry (not a real user). */
export const SYSTEM_ACTOR_ID = '00000000-0000-0000-0000-000000000000'

export const FRAUD_ACTIONS = {
    STAMP_HOURLY_LIMIT: 'FRAUD_STAMP_HOURLY_LIMIT',
    REDEEM_HOURLY_LIMIT: 'FRAUD_REDEEM_HOURLY_LIMIT',
    CARD_DAILY_LIMIT: 'FRAUD_CARD_DAILY_LIMIT',
    REPEATED_COOLDOWN_DENIAL: 'FRAUD_REPEATED_COOLDOWN_DENIAL',
    MEMBER_OTP_REQUEST_LIMIT: 'FRAUD_MEMBER_OTP_REQUEST_LIMIT',
    MEMBER_OTP_VERIFY_LIMIT: 'FRAUD_MEMBER_OTP_VERIFY_LIMIT',
    STAFF_LOGIN_LIMIT: 'FRAUD_STAFF_LOGIN_LIMIT',
} as const

const COOLDOWN_DENIAL_THRESHOLD = 3
const COOLDOWN_DENIAL_WINDOW_SEC = 900

export function isRateLimitError(err: unknown): err is RateLimitThrow {
    return (
        typeof err === 'object' &&
        err !== null &&
        (err as RateLimitThrow).statusCode === 429
    )
}

export class FraudEventService {
    constructor(
        private prisma: PrismaClient,
        private redis: Redis
    ) { }

    async recordEvent(params: {
        action: string
        vendorId?: string | null
        dedupeKey?: string
        payload: Prisma.InputJsonValue
    }): Promise<void> {
        try {
            if (params.dedupeKey) {
                const hour = Math.floor(Date.now() / 3600000)
                const key = `fraud:logged:${params.dedupeKey}:${hour}`
                const set = await this.redis.set(key, '1', 'EX', 3700, 'NX')
                if (set !== 'OK') return
            }

            await this.prisma.adminAuditLog.create({
                data: {
                    actor_type: 'SYSTEM',
                    actor_id: SYSTEM_ACTOR_ID,
                    vendor_id: params.vendorId ?? null,
                    action: params.action,
                    payload: params.payload,
                },
            })
        } catch (err) {
            console.error('[FraudEventService] failed to record event', params.action, err)
        }
    }

    async recordStaffStampHourlyLimit(vendorId: string, staffId: string, ipAddress?: string): Promise<void> {
        await this.recordEvent({
            action: FRAUD_ACTIONS.STAMP_HOURLY_LIMIT,
            vendorId,
            dedupeKey: `stamp-hour:${vendorId}:${staffId}`,
            payload: { staff_id: staffId, ip_address: ipAddress ?? null },
        })
    }

    async recordStaffRedeemHourlyLimit(vendorId: string, staffId: string, ipAddress?: string): Promise<void> {
        await this.recordEvent({
            action: FRAUD_ACTIONS.REDEEM_HOURLY_LIMIT,
            vendorId,
            dedupeKey: `redeem-hour:${vendorId}:${staffId}`,
            payload: { staff_id: staffId, ip_address: ipAddress ?? null },
        })
    }

    async recordCardDailyLimit(vendorId: string, cardId: string, staffId: string, ipAddress?: string): Promise<void> {
        await this.recordEvent({
            action: FRAUD_ACTIONS.CARD_DAILY_LIMIT,
            vendorId,
            dedupeKey: `card-daily:${vendorId}:${cardId}`,
            payload: {
                card_id: cardId,
                staff_id: staffId,
                ip_address: ipAddress ?? null,
            },
        })
    }

    async trackCooldownDenial(
        vendorId: string,
        cardId: string,
        staffId: string,
        ipAddress?: string
    ): Promise<void> {
        const key = `fraud:cd:${cardId}`
        const count = await this.redis.incr(key)
        if (count === 1) {
            await this.redis.expire(key, COOLDOWN_DENIAL_WINDOW_SEC)
        }
        if (count >= COOLDOWN_DENIAL_THRESHOLD) {
            await this.recordEvent({
                action: FRAUD_ACTIONS.REPEATED_COOLDOWN_DENIAL,
                vendorId,
                dedupeKey: `cooldown:${vendorId}:${cardId}`,
                payload: {
                    card_id: cardId,
                    staff_id: staffId,
                    denial_count: count,
                    ip_address: ipAddress ?? null,
                },
            })
        }
    }

    async recordMemberOtpRequestLimit(vendorId: string, phone: string, ipAddress?: string): Promise<void> {
        await this.recordEvent({
            action: FRAUD_ACTIONS.MEMBER_OTP_REQUEST_LIMIT,
            vendorId,
            dedupeKey: `otp-req:${vendorId}:${phone}`,
            payload: {
                phone_e164: phone,
                ip_address: ipAddress ?? null,
            },
        })
    }

    async recordMemberOtpVerifyLimit(vendorId: string, phone: string, ipAddress?: string): Promise<void> {
        await this.recordEvent({
            action: FRAUD_ACTIONS.MEMBER_OTP_VERIFY_LIMIT,
            vendorId,
            dedupeKey: `otp-verify:${vendorId}:${phone}`,
            payload: {
                phone_e164: phone,
                ip_address: ipAddress ?? null,
            },
        })
    }

    async recordStaffLoginLimit(vendorId: string | null, ipAddress?: string): Promise<void> {
        await this.recordEvent({
            action: FRAUD_ACTIONS.STAFF_LOGIN_LIMIT,
            vendorId,
            dedupeKey: `staff-login:${vendorId ?? 'global'}:${ipAddress ?? 'unknown'}`,
            payload: {
                ip_address: ipAddress ?? null,
            },
        })
    }
}
