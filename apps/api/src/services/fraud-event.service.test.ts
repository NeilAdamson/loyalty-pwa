import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FRAUD_ACTIONS, FraudEventService, SYSTEM_ACTOR_ID } from './fraud-event.service'

function createMockRedis() {
    const store = new Map<string, string>()
    return {
        incr: vi.fn(async (key: string) => {
            const next = Number(store.get(key) ?? '0') + 1
            store.set(key, String(next))
            return next
        }),
        expire: vi.fn(async () => 1),
        set: vi.fn(async (key: string, value: string, _mode: string, _ttl: number, nx?: string) => {
            if (nx === 'NX' && store.has(key)) return null
            store.set(key, value)
            return 'OK'
        }),
        _store: store,
    }
}

function createMockPrisma() {
    return {
        adminAuditLog: {
            create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => data),
        },
    }
}

describe('FraudEventService', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('records a fraud event with dedupe', async () => {
        const prisma = createMockPrisma()
        const redis = createMockRedis()
        const service = new FraudEventService(prisma as never, redis as never)

        await service.recordStaffStampHourlyLimit('vendor-1', 'staff-1', '127.0.0.1')
        await service.recordStaffStampHourlyLimit('vendor-1', 'staff-1', '127.0.0.1')

        expect(prisma.adminAuditLog.create).toHaveBeenCalledTimes(1)
        expect(prisma.adminAuditLog.create).toHaveBeenCalledWith({
            data: {
                actor_type: 'SYSTEM',
                actor_id: SYSTEM_ACTOR_ID,
                vendor_id: 'vendor-1',
                action: FRAUD_ACTIONS.STAMP_HOURLY_LIMIT,
                payload: {
                    staff_id: 'staff-1',
                    ip_address: '127.0.0.1',
                },
            },
        })
    })

    it('records repeated cooldown denials after threshold', async () => {
        const prisma = createMockPrisma()
        const redis = createMockRedis()
        const service = new FraudEventService(prisma as never, redis as never)

        await service.trackCooldownDenial('vendor-1', 'card-1', 'staff-1', '10.0.0.1')
        await service.trackCooldownDenial('vendor-1', 'card-1', 'staff-1', '10.0.0.1')
        expect(prisma.adminAuditLog.create).not.toHaveBeenCalled()

        await service.trackCooldownDenial('vendor-1', 'card-1', 'staff-1', '10.0.0.1')
        expect(prisma.adminAuditLog.create).toHaveBeenCalledTimes(1)
        expect(prisma.adminAuditLog.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                action: FRAUD_ACTIONS.REPEATED_COOLDOWN_DENIAL,
                payload: expect.objectContaining({
                    card_id: 'card-1',
                    staff_id: 'staff-1',
                    denial_count: 3,
                }),
            }),
        })
    })
})
