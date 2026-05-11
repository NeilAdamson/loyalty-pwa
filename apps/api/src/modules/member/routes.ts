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

    // Protected: Get My Card + Rotating Token
    // GET /me/card
    fastify.get(
        '/me/card',
        {
            onRequest: [fastify.authenticate]
        },
        async (request, reply) => {
            const { vendor_id, member_id, role: memberRole } = request.user

            if (!member_id || !vendor_id || memberRole !== 'MEMBER') {
                return reply.status(403).send({ code: 'FORBIDDEN', message: 'Access denied' })
            }

            const card = await cardService.getOrCreateActiveCard(vendor_id, member_id)

            // Fetch Member Details
            const member = await fastify.prisma.member.findUnique({
                where: { member_id }
            })

            // Fetch Vendor Branding for the card display
            const vendor = await fastify.prisma.vendor.findUnique({
                where: { vendor_id },
                select: {
                    trading_name: true,
                    vendor_slug: true,
                    branding: true,
                },
            })

            // Generate Rotating Token
            // Payload: vendor_id, member_id, card_id, jti, exp
            const jti = randomUUID()
            const token = await reply.jwtSign(
                {
                    vendor_id,
                    member_id,
                    card_id: card.card_id,
                    jti
                },
                {
                    expiresIn: 30 // 30 seconds
                }
            )

            return {
                card,
                member: {
                    name: member?.name || 'Member',
                    phone: member?.phone_e164
                },
                token,
                expires_in_seconds: 30,
                vendor: {
                    trading_name: vendor?.trading_name,
                    vendor_slug: vendor?.vendor_slug,
                    branding: vendor?.branding
                }
            }
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
