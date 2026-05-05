import { FastifyPluginAsync, FastifyRequest } from 'fastify'
import bcrypt from 'bcryptjs'

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const
const TIME_BUCKETS = ['AM', 'PM', 'Evening'] as const

const toPositiveNumber = (value: unknown, fieldName: string): number => {
    if (value === undefined || value === null || value === '') {
        throw { code: 'BAD_REQUEST', message: `${fieldName} is required` }
    }

    const parsed = Number(value)
    if (!Number.isFinite(parsed) || parsed <= 0) {
        throw { code: 'BAD_REQUEST', message: `${fieldName} must be a positive number` }
    }
    return parsed
}

const startOfMonth = (base: Date): Date => new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), 1))

const addDays = (base: Date, days: number): Date => {
    const next = new Date(base)
    next.setUTCDate(next.getUTCDate() + days)
    return next
}

const getDateWindows = () => {
    const now = new Date()
    const currentMonthStart = startOfMonth(now)
    const previousMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1))
    const rolling30DaysStart = addDays(now, -30)
    return { now, currentMonthStart, previousMonthStart, rolling30DaysStart }
}

const vendorAdminRoutes: FastifyPluginAsync = async (fastify) => {

    const ensureVendorAdmin = async (request: { user?: { vendor_id?: string, role?: string } }) => {
        const user = request.user
        if (!user || !user.vendor_id || user.role !== 'ADMIN') {
            throw { code: 'FORBIDDEN', message: 'Access denied: Vendor Admin only' }
        }
    }

    /** URL slug must match the vendor tied to the JWT (tenant isolation). */
    const ensureSlugMatchesTokenVendor = async (request: FastifyRequest<{ Params: { slug: string } }>) => {
        const slugParam = request.params.slug?.trim()
        const vendorId = request.user?.vendor_id
        if (!slugParam) {
            throw { code: 'BAD_REQUEST', message: 'Missing vendor slug' }
        }
        if (!vendorId) {
            throw { code: 'UNAUTHORIZED', message: 'Vendor context missing' }
        }
        const vendor = await fastify.prisma.vendor.findUnique({
            where: { vendor_id: vendorId },
            select: { vendor_slug: true }
        })
        if (!vendor?.vendor_slug) {
            throw { code: 'UNAUTHORIZED', message: 'Vendor not found' }
        }
        if (vendor.vendor_slug.toLowerCase() !== slugParam.toLowerCase()) {
            throw { code: 'FORBIDDEN', message: 'Vendor slug does not match authenticated vendor' }
        }
    }

    // Prefix: /v/:slug/admin
    fastify.register(async (subRequest) => {
        subRequest.addHook('onRequest', fastify.authenticate)
        subRequest.addHook('onRequest', ensureVendorAdmin)
        subRequest.addHook('onRequest', ensureSlugMatchesTokenVendor)

        // --- EPIC A: Dashboard Metrics ---
        subRequest.get('/metrics', async (request, reply) => {
            const user = request.user
            const vendorId = user.vendor_id

            const { now, currentMonthStart, previousMonthStart, rolling30DaysStart } = getDateWindows()

            const vendor = await fastify.prisma.vendor.findUnique({
                where: { vendor_id: vendorId },
                select: { average_visit_value: true, reward_cost: true }
            })
            if (!vendor) return reply.status(404).send({ message: 'Vendor not found' })

            const [
                totalMembers,
                newMembers30d,
                _activeMembers30d,
                currentMonthStamps,
                previousMonthStamps,
                currentMonthRedemptions,
                previousMonthRedemptions,
                outstandingCards,
                totalCardsStarted,
                staffActivityRaw,
                repeatVisitRaw,
                topCustomersRaw,
                atRiskCustomersRaw,
                nearRewardCustomersRaw,
                activityWindow
            ] = await Promise.all([
                fastify.prisma.member.count({ where: { vendor_id: vendorId } }),
                fastify.prisma.member.count({
                    where: {
                        vendor_id: vendorId,
                        created_at: { gte: rolling30DaysStart }
                    }
                }),
                fastify.prisma.stampTransaction.count({
                    where: {
                        vendor_id: vendorId,
                        stamped_at: { gte: rolling30DaysStart }
                    }
                }),
                fastify.prisma.stampTransaction.count({
                    where: {
                        vendor_id: vendorId,
                        stamped_at: { gte: currentMonthStart, lt: now }
                    }
                }),
                fastify.prisma.stampTransaction.count({
                    where: {
                        vendor_id: vendorId,
                        stamped_at: { gte: previousMonthStart, lt: currentMonthStart }
                    }
                }),
                fastify.prisma.redemptionTransaction.count({
                    where: {
                        vendor_id: vendorId,
                        redeemed_at: { gte: currentMonthStart, lt: now }
                    }
                }),
                fastify.prisma.redemptionTransaction.count({
                    where: {
                        vendor_id: vendorId,
                        redeemed_at: { gte: previousMonthStart, lt: currentMonthStart }
                    }
                }),
                fastify.prisma.cardInstance.count({
                    where: {
                        vendor_id: vendorId,
                        status: 'ACTIVE',
                        stamps_count: { gt: 0 }
                    }
                }),
                fastify.prisma.cardInstance.count({
                    where: {
                        vendor_id: vendorId,
                        stamps_count: { gt: 0 }
                    }
                }),
                fastify.prisma.staffUser.findMany({
                    where: { vendor_id: vendorId },
                    select: {
                        staff_id: true,
                        name: true,
                        _count: {
                            select: {
                                stamp_txs: true,
                                redeem_txs: true
                            }
                        }
                    },
                    orderBy: { name: 'asc' }
                }),
                fastify.prisma.member.findMany({
                    where: { vendor_id: vendorId },
                    select: {
                        member_id: true,
                        cards: {
                            select: {
                                stamp_txs: {
                                    where: { stamped_at: { gte: rolling30DaysStart } },
                                    select: { stamp_tx_id: true }
                                }
                            }
                        }
                    }
                }),
                fastify.prisma.member.findMany({
                    where: { vendor_id: vendorId },
                    select: {
                        member_id: true,
                        name: true,
                        phone_e164: true,
                        cards: {
                            select: {
                                stamp_txs: {
                                    where: { stamped_at: { gte: rolling30DaysStart } },
                                    select: { stamp_tx_id: true }
                                }
                            }
                        }
                    }
                }),
                fastify.prisma.member.findMany({
                    where: {
                        vendor_id: vendorId,
                        last_active_at: { lt: rolling30DaysStart }
                    },
                    select: { member_id: true, name: true, phone_e164: true, last_active_at: true },
                    take: 10,
                    orderBy: { last_active_at: 'asc' }
                }),
                fastify.prisma.cardInstance.findMany({
                    where: {
                        vendor_id: vendorId,
                        status: 'ACTIVE',
                        stamps_count: { gte: 1 }
                    },
                    select: {
                        member: { select: { member_id: true, name: true, phone_e164: true } },
                        stamps_count: true,
                        program: { select: { stamps_required: true } }
                    }
                }),
                fastify.prisma.stampTransaction.findMany({
                    where: { vendor_id: vendorId, stamped_at: { gte: rolling30DaysStart } },
                    select: { stamped_at: true, card_id: true }
                })
            ])

            const activeMembersCount = repeatVisitRaw.filter((member) =>
                member.cards.some((card) => card.stamp_txs.length > 0)
            ).length
            const repeatMembersCount = repeatVisitRaw.filter((member) => {
                const totalVisits = member.cards.reduce((acc, card) => acc + card.stamp_txs.length, 0)
                return totalVisits > 1
            }).length

            const topCustomers = topCustomersRaw
                .map((member) => {
                    const stamps = member.cards.reduce((acc, card) => acc + card.stamp_txs.length, 0)
                    return {
                        member_id: member.member_id,
                        member_name: member.name,
                        member_phone: member.phone_e164,
                        stamps
                    }
                })
                .filter((member) => member.stamps > 0)
                .sort((a, b) => b.stamps - a.stamps)
                .slice(0, 10)

            const nearRewardCustomers = nearRewardCustomersRaw
                .map((card) => {
                    const stampsRemaining = card.program.stamps_required - card.stamps_count
                    return {
                        member_id: card.member.member_id,
                        member_name: card.member.name,
                        member_phone: card.member.phone_e164,
                        stamps_remaining: stampsRemaining,
                        stamps_count: card.stamps_count,
                        stamps_required: card.program.stamps_required
                    }
                })
                .filter((card) => card.stamps_remaining >= 1 && card.stamps_remaining <= 2)
                .sort((a, b) => a.stamps_remaining - b.stamps_remaining)
                .slice(0, 10)

            const stampsByDay = DAY_NAMES.map((day) => ({ day, stamps: 0 }))
            const stampsByTimeBucket = TIME_BUCKETS.map((bucket) => ({ bucket, stamps: 0 }))
            const firstStampByCard = new Map<string, Date>()
            for (const stamp of activityWindow) {
                const stampDate = new Date(stamp.stamped_at)
                stampsByDay[stampDate.getUTCDay()].stamps += 1

                const hour = stampDate.getUTCHours()
                if (hour < 12) stampsByTimeBucket[0].stamps += 1
                else if (hour < 17) stampsByTimeBucket[1].stamps += 1
                else stampsByTimeBucket[2].stamps += 1

                const existing = firstStampByCard.get(stamp.card_id)
                if (!existing || stampDate < existing) firstStampByCard.set(stamp.card_id, stampDate)
            }

            const redemptionsForAverage = await fastify.prisma.redemptionTransaction.findMany({
                where: { vendor_id: vendorId },
                select: { card_id: true, redeemed_at: true }
            })
            const rewardDurationsDays = redemptionsForAverage
                .map((redemption) => {
                    const firstStampAt = firstStampByCard.get(redemption.card_id)
                    if (!firstStampAt) return null
                    const diffMs = new Date(redemption.redeemed_at).getTime() - firstStampAt.getTime()
                    return diffMs >= 0 ? diffMs / (1000 * 60 * 60 * 24) : null
                })
                .filter((days): days is number => typeof days === 'number')
            const averageTimeToRewardDays = rewardDurationsDays.length > 0
                ? Number((rewardDurationsDays.reduce((acc, value) => acc + value, 0) / rewardDurationsDays.length).toFixed(1))
                : 0

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
                total_stamps_30d: activityWindow.length,
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
                repeat_visit_indicator_30d: activeMembersCount > 0 ? Number(((repeatMembersCount / activeMembersCount) * 100).toFixed(1)) : 0,
                behavior_insights: {
                    stamps_by_day: stampsByDay,
                    stamps_by_time_bucket: stampsByTimeBucket
                },
                customer_insights: {
                    top_customers_30d: topCustomers,
                    at_risk_customers_30d: atRiskCustomersRaw,
                    near_reward_customers: nearRewardCustomers
                },
                staff_activity: staffActivityRaw.map((staff) => ({
                    staff_id: staff.staff_id,
                    staff_name: staff.name,
                    stamps_issued: staff._count.stamp_txs,
                    redemptions_processed: staff._count.redeem_txs
                }))
            }
        })

        subRequest.get('/insights/behavior', async (request) => {
            const vendorId = request.user.vendor_id
            const { rolling30DaysStart } = getDateWindows()
            const stamps = await fastify.prisma.stampTransaction.findMany({
                where: { vendor_id: vendorId, stamped_at: { gte: rolling30DaysStart } },
                select: { stamped_at: true }
            })

            const stampsByDay = DAY_NAMES.map((day) => ({ day, stamps: 0 }))
            const stampsByTimeBucket = TIME_BUCKETS.map((bucket) => ({ bucket, stamps: 0 }))
            for (const stamp of stamps) {
                const stampDate = new Date(stamp.stamped_at)
                stampsByDay[stampDate.getUTCDay()].stamps += 1
                const hour = stampDate.getUTCHours()
                if (hour < 12) stampsByTimeBucket[0].stamps += 1
                else if (hour < 17) stampsByTimeBucket[1].stamps += 1
                else stampsByTimeBucket[2].stamps += 1
            }

            return { period: 'rolling_30_days', stamps_by_day: stampsByDay, stamps_by_time_bucket: stampsByTimeBucket }
        })

        subRequest.get('/insights/customers', async (request) => {
            const vendorId = request.user.vendor_id
            const { rolling30DaysStart } = getDateWindows()
            const [members, atRiskCustomersRaw, nearRewardCustomersRaw] = await Promise.all([
                fastify.prisma.member.findMany({
                    where: { vendor_id: vendorId },
                    select: {
                        member_id: true,
                        name: true,
                        phone_e164: true,
                        cards: { select: { stamp_txs: { where: { stamped_at: { gte: rolling30DaysStart } }, select: { stamp_tx_id: true } } } }
                    }
                }),
                fastify.prisma.member.findMany({
                    where: { vendor_id: vendorId, last_active_at: { lt: rolling30DaysStart } },
                    select: { member_id: true, name: true, phone_e164: true, last_active_at: true },
                    take: 10,
                    orderBy: { last_active_at: 'asc' }
                }),
                fastify.prisma.cardInstance.findMany({
                    where: { vendor_id: vendorId, status: 'ACTIVE', stamps_count: { gte: 1 } },
                    select: {
                        member: { select: { member_id: true, name: true, phone_e164: true } },
                        stamps_count: true,
                        program: { select: { stamps_required: true } }
                    }
                })
            ])

            const topCustomers = members
                .map((member) => {
                    const stamps = member.cards.reduce((acc, card) => acc + card.stamp_txs.length, 0)
                    return { member_id: member.member_id, member_name: member.name, member_phone: member.phone_e164, stamps }
                })
                .filter((member) => member.stamps > 0)
                .sort((a, b) => b.stamps - a.stamps)
                .slice(0, 10)

            const nearRewardCustomers = nearRewardCustomersRaw
                .map((card) => ({
                    member_id: card.member.member_id,
                    member_name: card.member.name,
                    member_phone: card.member.phone_e164,
                    stamps_remaining: card.program.stamps_required - card.stamps_count
                }))
                .filter((card) => card.stamps_remaining >= 1 && card.stamps_remaining <= 2)
                .sort((a, b) => a.stamps_remaining - b.stamps_remaining)
                .slice(0, 10)

            return {
                period: 'rolling_30_days',
                top_customers_30d: topCustomers,
                at_risk_customers_30d: atRiskCustomersRaw,
                near_reward_customers: nearRewardCustomers
            }
        })

        subRequest.get('/insights/staff', async (request) => {
            const vendorId = request.user.vendor_id
            const staff = await fastify.prisma.staffUser.findMany({
                where: { vendor_id: vendorId },
                select: {
                    staff_id: true,
                    name: true,
                    _count: { select: { stamp_txs: true, redeem_txs: true } }
                },
                orderBy: { name: 'asc' }
            })
            return staff.map((staffRow) => ({
                staff_id: staffRow.staff_id,
                staff_name: staffRow.name,
                stamps_issued: staffRow._count.stamp_txs,
                redemptions_processed: staffRow._count.redeem_txs
            }))
        })

        // Activity Feed
        subRequest.get('/activity', async (request) => {
            const user = request.user
            const vendorId = user.vendor_id

            const [stamps, redemptions] = await Promise.all([
                fastify.prisma.stampTransaction.findMany({
                    where: { vendor_id: vendorId },
                    take: 20,
                    orderBy: { stamped_at: 'desc' },
                    include: {
                        card: { include: { member: { select: { name: true, phone_e164: true } } } },
                        staff: { select: { name: true } }
                    }
                }),
                fastify.prisma.redemptionTransaction.findMany({
                    where: { vendor_id: vendorId },
                    take: 20,
                    orderBy: { redeemed_at: 'desc' },
                    include: {
                        card: { include: { member: { select: { name: true, phone_e164: true } } } },
                        staff: { select: { name: true } }
                    }
                })
            ])

            const feed = [
                ...stamps.map(s => ({
                    id: s.stamp_tx_id,
                    type: 'STAMP',
                    date: s.stamped_at,
                    member_name: s.card.member.name,
                    member_phone: s.card.member.phone_e164,
                    staff_name: s.staff.name
                })),
                ...redemptions.map(r => ({
                    id: r.redeem_tx_id,
                    type: 'REDEEM',
                    date: r.redeemed_at,
                    member_name: r.card.member.name,
                    member_phone: r.card.member.phone_e164,
                    staff_name: r.staff.name
                }))
            ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, 20)

            return feed
        })


        // --- EPIC B: Member Management ---
        subRequest.get<{ Querystring: { search?: string, status?: string } }>('/members', async (request) => {
            const { search, status } = request.query
            const vendorId = request.user.vendor_id
            if (!vendorId) throw { code: 'UNAUTHORIZED', message: 'Vendor context missing' }

            const where: {
                vendor_id: string;
                status?: string;
                OR?: Array<{ name: { contains: string; mode: 'insensitive' } } | { phone_e164: { contains: string } }>;
            } = { vendor_id: vendorId }

            if (search) {
                const searchTerm = search
                where.OR = [
                    { name: { contains: searchTerm, mode: 'insensitive' } },
                    { phone_e164: { contains: searchTerm } }
                ]
            }
            if (status) {
                where.status = status as string
            }

            const members = await fastify.prisma.member.findMany({
                where,
                orderBy: { last_active_at: 'desc' },
                take: 50,
                include: {
                    cards: {
                        where: { status: 'ACTIVE' },
                        select: { stamps_count: true, program: { select: { stamps_required: true } } }
                    }
                }
            })

            return members.map(m => ({
                ...m,
                active_card: m.cards[0] || null
            }))
        })

        subRequest.get<{ Params: { id: string } }>('/members/:id', async (request, reply) => {
            const { id } = request.params
            const vendorId = request.user.vendor_id

            const member = await fastify.prisma.member.findFirst({
                where: { member_id: id, vendor_id: vendorId },
                include: {
                    cards: { orderBy: { created_at: 'desc' } }
                }
            })

            if (!member) return reply.status(404).send({ message: 'Member not found' })

            const memberCardIds = member.cards.map(c => c.card_id);

            // If no cards, ensure empty arrays
            const recentStamps = memberCardIds.length > 0 ? await fastify.prisma.stampTransaction.findMany({
                where: { card_id: { in: memberCardIds } },
                orderBy: { stamped_at: 'desc' },
                take: 10,
                include: { staff: { select: { name: true } } }
            }) : []

            const recentRedemptions = memberCardIds.length > 0 ? await fastify.prisma.redemptionTransaction.findMany({
                where: { card_id: { in: memberCardIds } },
                orderBy: { redeemed_at: 'desc' },
                take: 10,
                include: { staff: { select: { name: true } } }
            }) : []

            return { ...member, recentStamps, recentRedemptions }
        })

        subRequest.put<{ Params: { id: string }, Body: { name: string } }>('/members/:id', async (request, reply) => {
            const { id } = request.params
            const { name } = request.body
            const vendorId = request.user.vendor_id

            const count = await fastify.prisma.member.count({ where: { member_id: id, vendor_id: vendorId } })
            if (count === 0) return reply.status(404).send({ message: 'Member not found' })

            const updated = await fastify.prisma.member.update({
                where: { member_id: id },
                data: { name }
            })
            return updated
        })

        // POST /members/:id/suspend
        subRequest.post<{ Params: { id: string }, Body: { suspend: boolean } }>('/members/:id/suspend', async (request, reply) => {
            const { id } = request.params
            const { suspend } = request.body
            const vendorId = request.user.vendor_id

            const count = await fastify.prisma.member.count({ where: { member_id: id, vendor_id: vendorId } })
            if (count === 0) return reply.status(404).send({ message: 'Member not found' })

            // TODO: Audit this action
            const updated = await fastify.prisma.member.update({
                where: { member_id: id },
                data: { status: suspend ? 'SUSPENDED' : 'ACTIVE' }
            })
            return updated
        })

        // --- EPIC C: Staff Management ---
        subRequest.get('/staff', async (request) => {
            const vendorId = request.user.vendor_id
            return fastify.prisma.staffUser.findMany({
                where: { vendor_id: vendorId },
                orderBy: { created_at: 'desc' }
            })
        })

        subRequest.post<{ Body: { name: string, pin: string, role: string } }>('/staff', async (request) => {
            const { name, pin, role } = request.body
            const vendorId = request.user.vendor_id
            if (!vendorId) throw { code: 'UNAUTHORIZED', message: 'Vendor context missing' }

            const pin_hash = await bcrypt.hash(pin, 10)

            const branch = await fastify.prisma.branch.findFirst({ where: { vendor_id: vendorId } })
            if (!branch) throw { code: 'BAD_REQUEST', message: 'No active branch found' }

            const username = `${name.split(' ')[0].toLowerCase()}${Math.floor(1000 + Math.random() * 9000)}`;

            const staff = await fastify.prisma.staffUser.create({
                data: {
                    vendor_id: vendorId,
                    branch_id: branch.branch_id,
                    username,
                    name,
                    role: role as string,
                    status: 'ENABLED',
                    pin_hash,
                    pin_last_changed_at: new Date()
                }
            })

            return staff
        })

        subRequest.put<{ Params: { id: string }, Body: { name?: string, role?: string, pin?: string } }>('/staff/:id', async (request, reply) => {
            const { id } = request.params
            const { name, role, pin } = request.body
            const vendorId = request.user.vendor_id

            const staff = await fastify.prisma.staffUser.findFirst({ where: { staff_id: id, vendor_id: vendorId } })
            if (!staff) return reply.status(404).send({ message: 'Staff not found' })

            const updateData: { name?: string; role?: string; pin_hash?: string; pin_last_changed_at?: Date } = {}
            if (name) updateData.name = name
            if (role) updateData.role = role
            if (pin) {
                updateData.pin_hash = await bcrypt.hash(pin, 10)
                updateData.pin_last_changed_at = new Date()
            }

            const updated = await fastify.prisma.staffUser.update({
                where: { staff_id: id },
                data: updateData
            })
            return updated
        })

        subRequest.post<{ Params: { id: string } }>('/staff/:id/disable', async (request, reply) => {
            const { id } = request.params
            const vendorId = request.user.vendor_id

            const staff = await fastify.prisma.staffUser.findFirst({ where: { staff_id: id, vendor_id: vendorId } })
            if (!staff) return reply.status(404).send({ message: 'Staff not found' })

            const updated = await fastify.prisma.staffUser.update({
                where: { staff_id: id },
                data: { status: 'DISABLED' }
            })
            return updated
        })


        // --- EPIC D: Business Info ---
        subRequest.get('/business', async (request) => {
            const vendorId = request.user.vendor_id
            return fastify.prisma.vendor.findUnique({
                where: { vendor_id: vendorId }
            })
        })

        subRequest.put<{ Body: { trading_name?: string, average_visit_value?: number, reward_cost?: number } }>('/business', async (request) => {
            const vendorId = request.user.vendor_id
            const { trading_name, average_visit_value, reward_cost } = request.body

            const data: { trading_name?: string, average_visit_value?: number, reward_cost?: number } = {}
            if (trading_name !== undefined) data.trading_name = trading_name
            if (average_visit_value !== undefined) data.average_visit_value = toPositiveNumber(average_visit_value, 'average_visit_value')
            if (reward_cost !== undefined) data.reward_cost = toPositiveNumber(reward_cost, 'reward_cost')

            const updated = await fastify.prisma.vendor.update({
                where: { vendor_id: vendorId },
                data
            })
            return updated
        })

        // --- EPIC E: Branding ---
        subRequest.get('/branding', async (request) => {
            const vendorId = request.user.vendor_id
            const branding = await fastify.prisma.vendorBranding.findUnique({
                where: { vendor_id: vendorId }
            })
            return branding || {}
        })

        subRequest.put<{
            Body: {
                primary_color: string,
                secondary_color: string,
                accent_color: string,
                background_color: string,
                card_text_color: string,
                card_style: string,
                logo_url?: string,
                wordmark_url?: string,
                welcome_text?: string,
                reward_title?: string,
                stamps_required?: number
            }
        }>('/branding', async (request, reply) => {
            try {
                const vendorId = request.user.vendor_id
                if (!vendorId) throw { code: 'UNAUTHORIZED', message: 'Vendor context missing' }
                const data = request.body

                // Upsert branding
                // Provide defaults for required fields (primary_color, secondary_color) and fields with defaults
                const branding = await fastify.prisma.vendorBranding.upsert({
                    where: { vendor_id: vendorId },
                    create: {
                        vendor_id: vendorId,
                        primary_color: data.primary_color || '#000000',
                        secondary_color: data.secondary_color || '#ffffff',
                        accent_color: data.accent_color || '#3B82F6',
                        background_color: data.background_color || null,
                        card_text_color: data.card_text_color || '#ffffff',
                        card_style: data.card_style || 'SOLID',
                        logo_url: data.logo_url || null,
                        wordmark_url: data.wordmark_url || null,
                        welcome_text: data.welcome_text || null
                    },
                    update: {
                        primary_color: data.primary_color,
                        secondary_color: data.secondary_color,
                        accent_color: data.accent_color,
                        background_color: data.background_color,
                        card_text_color: data.card_text_color,
                        card_style: data.card_style,
                        logo_url: data.logo_url,
                        wordmark_url: data.wordmark_url,
                        welcome_text: data.welcome_text
                    }
                })

                // Update Program (if reward info provided)
                if (data.reward_title || data.stamps_required) {
                    // Find active program
                    const program = await fastify.prisma.program.findFirst({
                        where: { vendor_id: vendorId, is_active: true }
                    })

                    if (program) {
                        await fastify.prisma.program.update({
                            where: { program_id: program.program_id },
                            data: {
                                reward_title: data.reward_title || program.reward_title,
                                stamps_required: data.stamps_required || program.stamps_required
                            }
                        })
                    }
                }

                return branding
            } catch (err: unknown) {
                request.log.error(err, 'Failed to update branding')
                const statusCode = typeof err === 'object' && err !== null && 'statusCode' in err ? Number((err as { statusCode: number }).statusCode) : 500
                const message = typeof err === 'object' && err !== null && 'message' in err ? String((err as { message: string }).message) : 'Failed to save branding'
                const code = typeof err === 'object' && err !== null && 'code' in err ? String((err as { code: string }).code) : 'INTERNAL_SERVER_ERROR'
                return reply.code(statusCode).send({
                    code,
                    message
                })
            }
        })

    }, { prefix: '/v/:slug/admin' })
}

export default vendorAdminRoutes
