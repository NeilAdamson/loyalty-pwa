import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import { DAY_NAMES, normalizeStaffActivityLimit, STAFF_ACTIVITY_DEFAULT_LIMIT, TIME_BUCKETS, VendorAnalyticsService } from './vendor-analytics.service'

function createMockPrisma() {
    return {
        $queryRaw: vi.fn(),
        vendor: {
            findUnique: vi.fn(),
        },
        member: {
            count: vi.fn(),
            findMany: vi.fn(),
        },
        stampTransaction: {
            count: vi.fn(),
        },
        redemptionTransaction: {
            count: vi.fn(),
        },
        cardInstance: {
            count: vi.fn(),
        },
        staffUser: {
            count: vi.fn(),
        },
    }
}

describe('VendorAnalyticsService', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('returns active and repeat member counts from grouped stamp SQL', async () => {
        const prisma = createMockPrisma()
        prisma.$queryRaw.mockResolvedValue([{ active_members: 4, repeat_members: 2 }])

        const svc = new VendorAnalyticsService(prisma as unknown as PrismaClient)
        const rollingStart = new Date('2026-05-20T00:00:00.000Z')

        await expect(svc.getMemberVisitCounts('vendor-a', rollingStart)).resolves.toEqual({
            activeMembers: 4,
            repeatMembers: 2,
        })
    })

    it('maps top customer SQL rows to API shape', async () => {
        const prisma = createMockPrisma()
        prisma.$queryRaw.mockResolvedValue([
            {
                member_id: 'member-a',
                name: 'Alice',
                phone_e164: '+64210000001',
                stamps: 5,
            },
        ])

        const svc = new VendorAnalyticsService(prisma as unknown as PrismaClient)

        await expect(svc.getTopCustomers30d('vendor-a', new Date())).resolves.toEqual([
            {
                member_id: 'member-a',
                member_name: 'Alice',
                member_phone: '+64210000001',
                stamps: 5,
            },
        ])
    })

    it('builds behavior insight buckets from grouped SQL rows', async () => {
        const prisma = createMockPrisma()
        prisma.$queryRaw
            .mockResolvedValueOnce([{ dow: 1, stamps: 3 }])
            .mockResolvedValueOnce([
                { bucket: 0, stamps: 2 },
                { bucket: 2, stamps: 1 },
            ])

        const svc = new VendorAnalyticsService(prisma as unknown as PrismaClient)
        const insights = await svc.getBehaviorInsights('vendor-a', new Date())

        expect(insights.stamps_by_day).toHaveLength(DAY_NAMES.length)
        expect(insights.stamps_by_day[1]).toEqual({ day: 'Monday', stamps: 3 })
        expect(insights.stamps_by_time_bucket).toEqual([
            { bucket: 'AM', stamps: 2 },
            { bucket: 'PM', stamps: 0 },
            { bucket: 'Evening', stamps: 1 },
        ])
        expect(TIME_BUCKETS).toEqual(['AM', 'PM', 'Evening'])
    })

    it('returns zero average reward days when SQL aggregate is null', async () => {
        const prisma = createMockPrisma()
        prisma.$queryRaw.mockResolvedValue([{ avg_days: null }])

        const svc = new VendorAnalyticsService(prisma as unknown as PrismaClient)

        await expect(svc.getAverageTimeToRewardDays('vendor-a')).resolves.toBe(0)
    })

    it('rounds average reward days to one decimal place', async () => {
        const prisma = createMockPrisma()
        prisma.$queryRaw.mockResolvedValue([{ avg_days: 12.46 }])

        const svc = new VendorAnalyticsService(prisma as unknown as PrismaClient)

        await expect(svc.getAverageTimeToRewardDays('vendor-a')).resolves.toBe(12.5)
    })

    it('maps near-reward SQL rows for metrics and insights', async () => {
        const prisma = createMockPrisma()
        prisma.$queryRaw.mockResolvedValue([
            {
                member_id: 'member-a',
                name: 'Alice',
                phone_e164: '+64210000001',
                stamps_count: 8,
                stamps_required: 10,
                stamps_remaining: 2,
            },
        ])

        const svc = new VendorAnalyticsService(prisma as unknown as PrismaClient)

        await expect(svc.getNearRewardCustomersForMetrics('vendor-a')).resolves.toEqual([
            {
                member_id: 'member-a',
                member_name: 'Alice',
                member_phone: '+64210000001',
                stamps_remaining: 2,
                stamps_count: 8,
                stamps_required: 10,
            },
        ])

        await expect(svc.getNearRewardCustomersForInsights('vendor-a')).resolves.toEqual([
            {
                member_id: 'member-a',
                member_name: 'Alice',
                member_phone: '+64210000001',
                stamps_remaining: 2,
            },
        ])
    })

    it('clamps staff activity limit to the configured maximum', () => {
        expect(normalizeStaffActivityLimit(undefined)).toBe(STAFF_ACTIVITY_DEFAULT_LIMIT)
        expect(normalizeStaffActivityLimit('50')).toBe(50)
        expect(normalizeStaffActivityLimit('500')).toBe(STAFF_ACTIVITY_DEFAULT_LIMIT)
        expect(normalizeStaffActivityLimit('0')).toBe(STAFF_ACTIVITY_DEFAULT_LIMIT)
    })

    it('returns bounded staff activity from grouped transaction SQL', async () => {
        const prisma = createMockPrisma()
        prisma.$queryRaw.mockResolvedValue([
            {
                staff_id: 'staff-a',
                name: 'Bob',
                stamps_issued: 15,
                redemptions_processed: 2,
            },
        ])
        prisma.staffUser.count.mockResolvedValue(150)

        const svc = new VendorAnalyticsService(prisma as unknown as PrismaClient)

        await expect(svc.getStaffActivity('vendor-a', 100)).resolves.toEqual({
            staff: [
                {
                    staff_id: 'staff-a',
                    staff_name: 'Bob',
                    stamps_issued: 15,
                    redemptions_processed: 2,
                },
            ],
            total_staff: 150,
            limit: 100,
            truncated: true,
        })
    })

    it('returns null from getMetrics when vendor is missing', async () => {
        const prisma = createMockPrisma()
        prisma.vendor.findUnique.mockResolvedValue(null)

        const svc = new VendorAnalyticsService(prisma as unknown as PrismaClient)

        await expect(svc.getMetrics('vendor-a')).resolves.toBeNull()
    })

    it('assembles dashboard metrics from bounded aggregate queries', async () => {
        const prisma = createMockPrisma()
        prisma.vendor.findUnique.mockResolvedValue({
            average_visit_value: 50,
            reward_cost: 10,
        })
        prisma.member.count
            .mockResolvedValueOnce(100)
            .mockResolvedValueOnce(12)
        prisma.stampTransaction.count
            .mockResolvedValueOnce(40)
            .mockResolvedValueOnce(25)
            .mockResolvedValueOnce(18)
        prisma.redemptionTransaction.count
            .mockResolvedValueOnce(5)
            .mockResolvedValueOnce(3)
        prisma.cardInstance.count
            .mockResolvedValueOnce(20)
            .mockResolvedValueOnce(30)

        prisma.$queryRaw.mockImplementation(async (...args: unknown[]) => {
            const sql = String((args[0] as TemplateStringsArray).join(' '))
            if (sql.includes('member_stamp_counts')) {
                return [{ active_members: 10, repeat_members: 4 }]
            }
            if (sql.includes('ORDER BY stamps DESC')) {
                return []
            }
            if (sql.includes('stamps_remaining')) {
                return []
            }
            if (sql.includes('EXTRACT(DOW')) {
                return [{ dow: 0, stamps: 1 }]
            }
            if (sql.includes('EXTRACT(HOUR')) {
                return [{ bucket: 1, stamps: 1 }]
            }
            if (sql.includes('avg_days')) {
                return [{ avg_days: 7.2 }]
            }
            if (sql.includes('FROM staff_users s')) {
                return [
                    {
                        staff_id: 'staff-a',
                        name: 'Bob',
                        stamps_issued: 15,
                        redemptions_processed: 2,
                    },
                ]
            }
            return []
        })

        prisma.member.findMany.mockResolvedValue([])
        prisma.staffUser.count.mockResolvedValue(1)

        const svc = new VendorAnalyticsService(prisma as unknown as PrismaClient)
        const metrics = await svc.getMetrics('vendor-a')

        expect(metrics).not.toBeNull()
        expect(metrics?.total_members).toBe(100)
        expect(metrics?.new_members_30d).toBe(12)
        expect(metrics?.active_members_30d).toBe(10)
        expect(metrics?.total_stamps_30d).toBe(40)
        expect(metrics?.repeat_visit_indicator_30d).toBe(40)
        expect(metrics?.average_time_to_reward_days).toBe(7.2)
        expect(metrics?.estimated_revenue_current_month).toBe(1250)
        expect(metrics?.total_reward_cost_current_month).toBe(50)
        expect(metrics?.estimated_roi_ratio).toBe(25)
        expect(metrics?.staff_activity).toEqual([
            {
                staff_id: 'staff-a',
                staff_name: 'Bob',
                stamps_issued: 15,
                redemptions_processed: 2,
            },
        ])
        expect(metrics?.staff_activity_total).toBe(1)
        expect(metrics?.staff_activity_truncated).toBe(false)
    })
})
