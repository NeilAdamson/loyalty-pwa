import { FastifyPluginAsync } from 'fastify'
import { CardService } from '../../services/card.service' // Check path validity
import { randomUUID } from 'crypto'
import { WebAuthnService } from '../../services/webauthn.service'

const memberRoutes: FastifyPluginAsync = async (fastify) => {
    const webAuthn = new WebAuthnService(fastify.prisma, fastify.redis, fastify.rateLimiter)

    // Update Profile (Name)
    // PATCH /me/profile
    fastify.patch(
        '/me/profile',
        {
            onRequest: [fastify.authenticate]
        },
        async (request, reply) => {
            const { member_id } = request.user
            const { name } = request.body as { name: string }

            if (!name || name.trim().length < 2) {
                return reply.code(400).send({ message: 'Name is too short' })
            }

            const updated = await fastify.prisma.member.update({
                where: { member_id },
                data: { name: name.trim() }
            })

            return { success: true, member: updated }
        }
    )

    const cardService = new CardService(fastify.prisma)

    const assertMemberContext = (
        request: { user: { vendor_id?: string; member_id?: string; role?: string } },
        reply: { status: (code: number) => { send: (payload: unknown) => unknown } }
    ) => {
        const { vendor_id, member_id, role: memberRole } = request.user
        if (!member_id || !vendor_id || memberRole !== 'MEMBER') {
            reply.status(403).send({ code: 'FORBIDDEN', message: 'Access denied' })
            return null
        }
        return { vendor_id, member_id }
    }

    const mergeMemberTransactions = async (cardId: string, limit: number) => {
        const [stamps, redemptions] = await Promise.all([
            fastify.prisma.stampTransaction.findMany({
                where: { card_id: cardId },
                orderBy: { stamped_at: 'desc' },
                take: limit,
                select: { stamp_tx_id: true, stamped_at: true },
            }),
            fastify.prisma.redemptionTransaction.findMany({
                where: { card_id: cardId },
                orderBy: { redeemed_at: 'desc' },
                take: limit,
                select: { redeem_tx_id: true, redeemed_at: true },
            }),
        ])

        return [
            ...stamps.map((row) => ({
                id: row.stamp_tx_id,
                type: 'STAMP' as const,
                at: row.stamped_at.toISOString(),
            })),
            ...redemptions.map((row) => ({
                id: row.redeem_tx_id,
                type: 'REDEEM' as const,
                at: row.redeemed_at.toISOString(),
            })),
        ]
            .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
            .slice(0, limit)
    }

    // Protected: Get My Card + Rotating Token
    // GET /me/card
    fastify.get(
        '/me/card',
        {
            onRequest: [fastify.authenticate]
        },
        async (request, reply) => {
            const ctx = assertMemberContext(request, reply)
            if (!ctx) return

            const { vendor_id, member_id } = ctx
            const card = await cardService.getOrCreateActiveCard(vendor_id, member_id)

            const member = await fastify.prisma.member.findUnique({
                where: { member_id }
            })

            const vendor = await fastify.prisma.vendor.findUnique({
                where: { vendor_id },
                select: {
                    trading_name: true,
                    vendor_slug: true,
                    branding: true,
                    status: true,
                },
            })

            const vendorActive = vendor?.status === 'ACTIVE' || vendor?.status === 'TRIAL'
            let token: string | null = null
            if (vendorActive) {
                const jti = randomUUID()
                token = await reply.rotatingTokenSign(
                    {
                        vendor_id,
                        member_id,
                        card_id: card.card_id,
                        jti
                    },
                    {
                        expiresIn: 30
                    }
                )
            }

            return {
                card,
                member: {
                    name: member?.name || 'Member',
                    phone: member?.phone_e164
                },
                token,
                expires_in_seconds: token ? 30 : 0,
                read_only: !vendorActive,
                vendor: {
                    trading_name: vendor?.trading_name,
                    vendor_slug: vendor?.vendor_slug,
                    branding: vendor?.branding,
                    status: vendor?.status,
                }
            }
        }
    )

    // GET /me/transactions?limit=20
    fastify.get<{ Querystring: { limit?: string } }>(
        '/me/transactions',
        {
            onRequest: [fastify.authenticate]
        },
        async (request, reply) => {
            const ctx = assertMemberContext(request, reply)
            if (!ctx) return

            const { vendor_id, member_id } = ctx
            const parsedLimit = Number.parseInt(request.query.limit ?? '20', 10)
            const limit = Number.isFinite(parsedLimit)
                ? Math.min(Math.max(parsedLimit, 1), 20)
                : 20

            const card = await cardService.getOrCreateActiveCard(vendor_id, member_id)
            const transactions = await mergeMemberTransactions(card.card_id, limit)

            return { transactions }
        }
    )

    fastify.get(
        '/me/passkeys',
        { onRequest: [fastify.authenticate] },
        async (request, reply) => {
            const { vendor_id, member_id, role: memberRole } = request.user
            if (!member_id || !vendor_id || memberRole !== 'MEMBER') {
                return reply.status(403).send({ code: 'FORBIDDEN', message: 'Access denied' })
            }
            const passkeys = await webAuthn.listMemberPasskeys(vendor_id, member_id)
            return { success: true, passkeys }
        }
    )

    fastify.delete<{ Params: { credentialId: string } }>(
        '/me/passkeys/:credentialId',
        { onRequest: [fastify.authenticate] },
        async (request, reply) => {
            const { vendor_id, member_id, role: memberRole } = request.user
            if (!member_id || !vendor_id || memberRole !== 'MEMBER') {
                return reply.status(403).send({ code: 'FORBIDDEN', message: 'Access denied' })
            }
            await webAuthn.revokeMemberPasskey(vendor_id, member_id, request.params.credentialId)
            return reply.send({ success: true })
        }
    )

    // End of file
}

export default memberRoutes
