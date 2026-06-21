import { PrismaClient } from '@prisma/client'

export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const
export const TIME_BUCKETS = ['AM', 'PM', 'Evening'] as const

const startOfMonth = (base: Date): Date => new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), 1))

const addDays = (base: Date, days: number): Date => {
    const next = new Date(base)
    next.setUTCDate(next.getUTCDate() + days)
    return next
}

export type AnalyticsDateWindows = {
    now: Date
    currentMonthStart: Date
    previousMonthStart: Date
    rolling30DaysStart: Date
}

export function getAnalyticsDateWindows(): AnalyticsDateWindows {
    const now = new Date()
    const currentMonthStart = startOfMonth(now)
    const previousMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1))
    const rolling30DaysStart = addDays(now, -30)
    return { now, currentMonthStart, previousMonthStart, rolling30DaysStart }
}

export type TopCustomerInsight = {
    member_id: string
    member_name: string
    member_phone: string
    stamps: number
}

export type AtRiskCustomerInsight = {
    member_id: string
    name: string
    phone_e164: string
    last_active_at: Date
}

export type NearRewardCustomerMetrics = {
    member_id: string
    member_name: string
    member_phone: string
    stamps_remaining: number
    stamps_count: number
    stamps_required: number
}

export type NearRewardCustomerInsight = {
    member_id: string
    member_name: string
    member_phone: string
    stamps_remaining: number
}

export type BehaviorInsights = {
    stamps_by_day: Array<{ day: typeof DAY_NAMES[number]; stamps: number }>
    stamps_by_time_bucket: Array<{ bucket: typeof TIME_BUCKETS[number]; stamps: number }>
}

export type StaffActivityRow = {
    staff_id: string
    staff_name: string
    stamps_issued: number
    redemptions_processed: number
}

export const STAFF_ACTIVITY_DEFAULT_LIMIT = 100
export const STAFF_ACTIVITY_MAX_LIMIT = 100

export type StaffActivityResult = {
    staff: StaffActivityRow[]
    total_staff: number
    limit: number
    truncated: boolean
}

export function normalizeStaffActivityLimit(value: unknown): number {
    const parsed = typeof value === 'string' || typeof value === 'number' ? Number(value) : Number.NaN
    if (!Number.isFinite(parsed) || parsed < 1) return STAFF_ACTIVITY_DEFAULT_LIMIT
    return Math.min(Math.floor(parsed), STAFF_ACTIVITY_MAX_LIMIT)
}

export type VendorMetricsResponse = {
    reporting_periods: {
        current_month_start: string
        previous_month_start: string
        rolling_30_days_start: string
        as_of: string
    }
    total_members: number
    new_members_30d: number
    active_members_30d: number
    total_stamps_30d: number
    total_stamps_current_month: number
    total_stamps_previous_month: number
    total_redemptions_current_month: number
    total_redemptions_previous_month: number
    outstanding_rewards: number
    card_completion_rate: number
    average_time_to_reward_days: number
    average_visit_value: number
    reward_cost: number
    estimated_revenue_current_month: number
    total_reward_cost_current_month: number
    estimated_roi_ratio: number
    estimated_roi_label: string
    repeat_visit_indicator_30d: number
    behavior_insights: BehaviorInsights
    customer_insights: {
        top_customers_30d: TopCustomerInsight[]
        at_risk_customers_30d: AtRiskCustomerInsight[]
        near_reward_customers: NearRewardCustomerMetrics[]
    }
    staff_activity: StaffActivityRow[]
    staff_activity_total: number
    staff_activity_truncated: boolean
}

type MemberVisitCountsRow = {
    active_members: number | bigint | null
    repeat_members: number | bigint | null
}

type TopCustomerRow = {
    member_id: string
    name: string
    phone_e164: string
    stamps: number | bigint
}

type DayStampRow = {
    dow: number | bigint
    stamps: number | bigint
}

type BucketStampRow = {
    bucket: number | bigint
    stamps: number | bigint
}

type NearRewardMetricsRow = {
    member_id: string
    name: string
    phone_e164: string
    stamps_count: number | bigint
    stamps_required: number | bigint
    stamps_remaining: number | bigint
}

type AverageRewardDaysRow = {
    avg_days: number | null
}

type StaffActivitySqlRow = {
    staff_id: string
    name: string
    stamps_issued: number | bigint
    redemptions_processed: number | bigint
}

const toNumber = (value: number | bigint | null | undefined): number => {
    if (value === null || value === undefined) return 0
    return typeof value === 'bigint' ? Number(value) : value
}

export class VendorAnalyticsService {
    constructor(private prisma: PrismaClient) { }

    async getMemberVisitCounts(vendorId: string, rolling30DaysStart: Date): Promise<{ activeMembers: number; repeatMembers: number }> {
        const rows = await this.prisma.$queryRaw<MemberVisitCountsRow[]>`
            WITH member_stamp_counts AS (
                SELECT c.member_id, COUNT(st.stamp_tx_id) AS stamp_count
                FROM stamp_transactions st
                INNER JOIN card_instances c ON c.card_id = st.card_id
                WHERE st.vendor_id = ${vendorId}::uuid
                  AND st.stamped_at >= ${rolling30DaysStart}
                GROUP BY c.member_id
            )
            SELECT
                COUNT(*) FILTER (WHERE stamp_count > 0)::int AS active_members,
                COUNT(*) FILTER (WHERE stamp_count > 1)::int AS repeat_members
            FROM member_stamp_counts
        `

        return {
            activeMembers: toNumber(rows[0]?.active_members),
            repeatMembers: toNumber(rows[0]?.repeat_members)
        }
    }

    async getTopCustomers30d(vendorId: string, rolling30DaysStart: Date): Promise<TopCustomerInsight[]> {
        const rows = await this.prisma.$queryRaw<TopCustomerRow[]>`
            SELECT
                m.member_id::text AS member_id,
                m.name,
                m.phone_e164,
                COUNT(st.stamp_tx_id)::int AS stamps
            FROM stamp_transactions st
            INNER JOIN card_instances c ON c.card_id = st.card_id
            INNER JOIN members m ON m.member_id = c.member_id
            WHERE st.vendor_id = ${vendorId}::uuid
              AND st.stamped_at >= ${rolling30DaysStart}
            GROUP BY m.member_id, m.name, m.phone_e164
            HAVING COUNT(st.stamp_tx_id) > 0
            ORDER BY stamps DESC, m.name ASC
            LIMIT 10
        `

        return rows.map((row) => ({
            member_id: row.member_id,
            member_name: row.name,
            member_phone: row.phone_e164,
            stamps: toNumber(row.stamps)
        }))
    }

    async getAtRiskCustomers30d(vendorId: string, rolling30DaysStart: Date): Promise<AtRiskCustomerInsight[]> {
        return this.prisma.member.findMany({
            where: {
                vendor_id: vendorId,
                last_active_at: { lt: rolling30DaysStart }
            },
            select: { member_id: true, name: true, phone_e164: true, last_active_at: true },
            take: 10,
            orderBy: { last_active_at: 'asc' }
        })
    }

    async getNearRewardCustomersForMetrics(vendorId: string): Promise<NearRewardCustomerMetrics[]> {
        const rows = await this.prisma.$queryRaw<NearRewardMetricsRow[]>`
            SELECT
                m.member_id::text AS member_id,
                m.name,
                m.phone_e164,
                c.stamps_count,
                p.stamps_required,
                (p.stamps_required - c.stamps_count) AS stamps_remaining
            FROM card_instances c
            INNER JOIN members m ON m.member_id = c.member_id
            INNER JOIN programs p ON p.program_id = c.program_id
            WHERE c.vendor_id = ${vendorId}::uuid
              AND c.status = 'ACTIVE'
              AND c.stamps_count >= 1
              AND (p.stamps_required - c.stamps_count) BETWEEN 1 AND 2
            ORDER BY stamps_remaining ASC, c.stamps_count DESC
            LIMIT 10
        `

        return rows.map((row) => ({
            member_id: row.member_id,
            member_name: row.name,
            member_phone: row.phone_e164,
            stamps_remaining: toNumber(row.stamps_remaining),
            stamps_count: toNumber(row.stamps_count),
            stamps_required: toNumber(row.stamps_required)
        }))
    }

    async getNearRewardCustomersForInsights(vendorId: string): Promise<NearRewardCustomerInsight[]> {
        const rows = await this.getNearRewardCustomersForMetrics(vendorId)
        return rows.map(({ member_id, member_name, member_phone, stamps_remaining }) => ({
            member_id,
            member_name,
            member_phone,
            stamps_remaining
        }))
    }

    async getBehaviorInsights(vendorId: string, rolling30DaysStart: Date): Promise<BehaviorInsights> {
        const [dayRows, bucketRows] = await Promise.all([
            this.prisma.$queryRaw<DayStampRow[]>`
                SELECT
                    EXTRACT(DOW FROM stamped_at)::int AS dow,
                    COUNT(*)::int AS stamps
                FROM stamp_transactions
                WHERE vendor_id = ${vendorId}::uuid
                  AND stamped_at >= ${rolling30DaysStart}
                GROUP BY dow
            `,
            this.prisma.$queryRaw<BucketStampRow[]>`
                SELECT
                    CASE
                        WHEN EXTRACT(HOUR FROM stamped_at) < 12 THEN 0
                        WHEN EXTRACT(HOUR FROM stamped_at) < 17 THEN 1
                        ELSE 2
                    END AS bucket,
                    COUNT(*)::int AS stamps
                FROM stamp_transactions
                WHERE vendor_id = ${vendorId}::uuid
                  AND stamped_at >= ${rolling30DaysStart}
                GROUP BY bucket
            `
        ])

        const stampsByDay = DAY_NAMES.map((day) => ({ day, stamps: 0 }))
        for (const row of dayRows) {
            const index = toNumber(row.dow)
            if (index >= 0 && index < stampsByDay.length) {
                stampsByDay[index].stamps = toNumber(row.stamps)
            }
        }

        const stampsByTimeBucket = TIME_BUCKETS.map((bucket) => ({ bucket, stamps: 0 }))
        for (const row of bucketRows) {
            const index = toNumber(row.bucket)
            if (index >= 0 && index < stampsByTimeBucket.length) {
                stampsByTimeBucket[index].stamps = toNumber(row.stamps)
            }
        }

        return { stamps_by_day: stampsByDay, stamps_by_time_bucket: stampsByTimeBucket }
    }

    async getAverageTimeToRewardDays(vendorId: string): Promise<number> {
        const rows = await this.prisma.$queryRaw<AverageRewardDaysRow[]>`
            SELECT AVG(
                EXTRACT(EPOCH FROM (r.redeemed_at - fs.first_stamp)) / 86400.0
            ) AS avg_days
            FROM redemption_transactions r
            INNER JOIN (
                SELECT card_id, MIN(stamped_at) AS first_stamp
                FROM stamp_transactions
                WHERE vendor_id = ${vendorId}::uuid
                GROUP BY card_id
            ) fs ON fs.card_id = r.card_id
            WHERE r.vendor_id = ${vendorId}::uuid
              AND r.redeemed_at >= fs.first_stamp
        `

        const avgDays = rows[0]?.avg_days
        if (avgDays === null || avgDays === undefined) return 0
        return Number(Number(avgDays).toFixed(1))
    }

    async getStaffActivity(
        vendorId: string,
        limit: number = STAFF_ACTIVITY_DEFAULT_LIMIT
    ): Promise<StaffActivityResult> {
        const boundedLimit = normalizeStaffActivityLimit(limit)

        const [rows, totalStaff] = await Promise.all([
            this.prisma.$queryRaw<StaffActivitySqlRow[]>`
                SELECT
                    s.staff_id::text AS staff_id,
                    s.name,
                    COALESCE(st.stamps_issued, 0)::int AS stamps_issued,
                    COALESCE(r.redemptions_processed, 0)::int AS redemptions_processed
                FROM staff_users s
                LEFT JOIN (
                    SELECT staff_id, COUNT(*)::int AS stamps_issued
                    FROM stamp_transactions
                    WHERE vendor_id = ${vendorId}::uuid
                    GROUP BY staff_id
                ) st ON st.staff_id = s.staff_id
                LEFT JOIN (
                    SELECT staff_id, COUNT(*)::int AS redemptions_processed
                    FROM redemption_transactions
                    WHERE vendor_id = ${vendorId}::uuid
                    GROUP BY staff_id
                ) r ON r.staff_id = s.staff_id
                WHERE s.vendor_id = ${vendorId}::uuid
                ORDER BY s.name ASC
                LIMIT ${boundedLimit}
            `,
            this.prisma.staffUser.count({ where: { vendor_id: vendorId } })
        ])

        return {
            staff: rows.map((row) => ({
                staff_id: row.staff_id,
                staff_name: row.name,
                stamps_issued: toNumber(row.stamps_issued),
                redemptions_processed: toNumber(row.redemptions_processed)
            })),
            total_staff: totalStaff,
            limit: boundedLimit,
            truncated: totalStaff > boundedLimit
        }
    }

    async getMetrics(vendorId: string): Promise<VendorMetricsResponse | null> {
        const windows = getAnalyticsDateWindows()
        const { now, currentMonthStart, previousMonthStart, rolling30DaysStart } = windows

        const vendor = await this.prisma.vendor.findUnique({
            where: { vendor_id: vendorId },
            select: { average_visit_value: true, reward_cost: true }
        })
        if (!vendor) return null

        const [
            totalMembers,
            newMembers30d,
            totalStamps30d,
            currentMonthStamps,
            previousMonthStamps,
            currentMonthRedemptions,
            previousMonthRedemptions,
            outstandingCards,
            totalCardsStarted,
            memberVisitCounts,
            topCustomers,
            atRiskCustomers,
            nearRewardCustomers,
            behaviorInsights,
            staffActivityResult,
            averageTimeToRewardDays
        ] = await Promise.all([
            this.prisma.member.count({ where: { vendor_id: vendorId } }),
            this.prisma.member.count({
                where: { vendor_id: vendorId, created_at: { gte: rolling30DaysStart } }
            }),
            this.prisma.stampTransaction.count({
                where: { vendor_id: vendorId, stamped_at: { gte: rolling30DaysStart } }
            }),
            this.prisma.stampTransaction.count({
                where: { vendor_id: vendorId, stamped_at: { gte: currentMonthStart, lt: now } }
            }),
            this.prisma.stampTransaction.count({
                where: { vendor_id: vendorId, stamped_at: { gte: previousMonthStart, lt: currentMonthStart } }
            }),
            this.prisma.redemptionTransaction.count({
                where: { vendor_id: vendorId, redeemed_at: { gte: currentMonthStart, lt: now } }
            }),
            this.prisma.redemptionTransaction.count({
                where: { vendor_id: vendorId, redeemed_at: { gte: previousMonthStart, lt: currentMonthStart } }
            }),
            this.prisma.cardInstance.count({
                where: { vendor_id: vendorId, status: 'ACTIVE', stamps_count: { gt: 0 } }
            }),
            this.prisma.cardInstance.count({
                where: { vendor_id: vendorId, stamps_count: { gt: 0 } }
            }),
            this.getMemberVisitCounts(vendorId, rolling30DaysStart),
            this.getTopCustomers30d(vendorId, rolling30DaysStart),
            this.getAtRiskCustomers30d(vendorId, rolling30DaysStart),
            this.getNearRewardCustomersForMetrics(vendorId),
            this.getBehaviorInsights(vendorId, rolling30DaysStart),
            this.getStaffActivity(vendorId),
            this.getAverageTimeToRewardDays(vendorId)
        ])

        const { activeMembers: activeMembersCount, repeatMembers: repeatMembersCount } = memberVisitCounts
        const averageVisitValue = Number(vendor.average_visit_value)
        const rewardCost = Number(vendor.reward_cost)
        const estimatedRevenueCurrentMonth = Number((currentMonthStamps * averageVisitValue).toFixed(2))
        const rewardCostCurrentMonth = Number((currentMonthRedemptions * rewardCost).toFixed(2))
        const estimatedRoiRatio = rewardCostCurrentMonth > 0
            ? Number((estimatedRevenueCurrentMonth / rewardCostCurrentMonth).toFixed(2))
            : 0

        return {
            reporting_periods: {
                current_month_start: currentMonthStart.toISOString(),
                previous_month_start: previousMonthStart.toISOString(),
                rolling_30_days_start: rolling30DaysStart.toISOString(),
                as_of: now.toISOString()
            },
            total_members: totalMembers,
            new_members_30d: newMembers30d,
            active_members_30d: activeMembersCount,
            total_stamps_30d: totalStamps30d,
            total_stamps_current_month: currentMonthStamps,
            total_stamps_previous_month: previousMonthStamps,
            total_redemptions_current_month: currentMonthRedemptions,
            total_redemptions_previous_month: previousMonthRedemptions,
            outstanding_rewards: outstandingCards,
            card_completion_rate: totalCardsStarted > 0 ? Number((currentMonthRedemptions / totalCardsStarted).toFixed(4)) : 0,
            average_time_to_reward_days: averageTimeToRewardDays,
            average_visit_value: averageVisitValue,
            reward_cost: rewardCost,
            estimated_revenue_current_month: estimatedRevenueCurrentMonth,
            total_reward_cost_current_month: rewardCostCurrentMonth,
            estimated_roi_ratio: estimatedRoiRatio,
            estimated_roi_label: estimatedRoiRatio > 0 ? `${estimatedRoiRatio}x return` : 'N/A',
            repeat_visit_indicator_30d: activeMembersCount > 0
                ? Number(((repeatMembersCount / activeMembersCount) * 100).toFixed(1))
                : 0,
            behavior_insights: behaviorInsights,
            customer_insights: {
                top_customers_30d: topCustomers,
                at_risk_customers_30d: atRiskCustomers,
                near_reward_customers: nearRewardCustomers
            },
            staff_activity: staffActivityResult.staff,
            staff_activity_total: staffActivityResult.total_staff,
            staff_activity_truncated: staffActivityResult.truncated
        }
    }
}
