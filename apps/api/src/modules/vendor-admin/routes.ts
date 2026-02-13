import { FastifyPluginAsync } from 'fastify'
import bcrypt from 'bcryptjs'

const vendorAdminRoutes: FastifyPluginAsync = async (fastify) => {

    const ensureVendorAdmin = async (request: any, reply: any) => {
        const user = request.user
        if (!user || !user.vendor_id || user.role !== 'ADMIN') {
            throw { code: 'FORBIDDEN', message: 'Access denied: Vendor Admin only' }
        }
    }

    // Prefix: /v/:slug/admin
    fastify.register(async (subRequest) => {
        subRequest.addHook('onRequest', fastify.authenticate)
        subRequest.addHook('onRequest', ensureVendorAdmin)

        // --- EPIC A: Dashboard Metrics ---
        subRequest.get('/metrics', async (request, reply) => {
            const user = request.user
            const vendorId = user.vendor_id

            const now = new Date()
            const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30))
            const ninetyDaysAgo = new Date(new Date().setDate(new Date().getDate() - 90))

            const [
                totalMembers,
                activeMembers,
                totalStamps,
                totalRedemptions,
                outstandingCards
            ] = await Promise.all([
                fastify.prisma.member.count({ where: { vendor_id: vendorId } }),
                fastify.prisma.member.count({
                    where: {
                        vendor_id: vendorId,
                        last_active_at: { gte: ninetyDaysAgo }
                    }
                }),
                fastify.prisma.stampTransaction.count({
                    where: {
                        vendor_id: vendorId,
                        stamped_at: { gte: thirtyDaysAgo }
                    }
                }),
                fastify.prisma.redemptionTransaction.count({
                    where: {
                        vendor_id: vendorId,
                        redeemed_at: { gte: thirtyDaysAgo }
                    }
                }),
                fastify.prisma.cardInstance.count({
                    where: {
                        vendor_id: vendorId,
                        status: 'ACTIVE',
                        stamps_count: { gt: 0 }
                    }
                })
            ])

            return {
                total_members: totalMembers,
                active_members: activeMembers,
                total_stamps_30d: totalStamps,
                total_redemptions_30d: totalRedemptions,
                redemption_rate: totalStamps > 0 ? ((totalRedemptions / totalStamps) * 100).toFixed(1) : 0,
                outstanding_rewards: outstandingCards
            }
        })

        // Activity Feed
        subRequest.get('/activity', async (request, reply) => {
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
        subRequest.get<{ Querystring: { search?: string, status?: string } }>('/members', async (request, reply) => {
            const { search, status } = request.query
            const vendorId = request.user.vendor_id

            const where: any = { vendor_id: vendorId }

            if (search) {
                where.OR = [
                    { name: { contains: search, mode: 'insensitive' } },
                    { phone_e164: { contains: search } }
                ]
            }
            if (status) {
                where.status = status
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
        subRequest.get('/staff', async (request, reply) => {
            const vendorId = request.user.vendor_id
            return fastify.prisma.staffUser.findMany({
                where: { vendor_id: vendorId },
                orderBy: { created_at: 'desc' }
            })
        })

        subRequest.post<{ Body: { name: string, pin: string, role: string } }>('/staff', async (request, reply) => {
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

            const updateData: any = {}
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
        subRequest.get('/business', async (request, reply) => {
            const vendorId = request.user.vendor_id
            return fastify.prisma.vendor.findUnique({
                where: { vendor_id: vendorId }
            })
        })

        subRequest.put<{ Body: { trading_name?: string } }>('/business', async (request, reply) => {
            const vendorId = request.user.vendor_id
            const { trading_name } = request.body

            const updated = await fastify.prisma.vendor.update({
                where: { vendor_id: vendorId },
                data: { trading_name }
            })
            return updated
        })

        // --- EPIC E: Branding ---
        subRequest.get('/branding', async (request, reply) => {
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
                    let program = await fastify.prisma.program.findFirst({
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
            } catch (err: any) {
                request.log.error(err, 'Failed to update branding')
                const statusCode = err.statusCode || 500
                const message = err.message || 'Failed to save branding'
                return reply.code(statusCode).send({
                    code: err.code || 'INTERNAL_SERVER_ERROR',
                    message
                })
            }
        })

    }, { prefix: '/v/:slug/admin' })
}

export default vendorAdminRoutes
