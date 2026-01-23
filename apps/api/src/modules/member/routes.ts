import { FastifyPluginAsync } from 'fastify'
import { CardService } from '../../services/card.service' // Check path validity
import { randomUUID } from 'crypto'

const memberRoutes: FastifyPluginAsync = async (fastify) => {
    const cardService = new CardService(fastify.prisma)

    // Protected: Get My Card + Rotating Token
    // GET /me/card
    fastify.get(
        '/me/card',
        {
            onRequest: [fastify.authenticate]
        },
        async (request, reply) => {
            const { vendor_id, member_id, role } = request.user

            // Role check: Only MEMBERS (or maybe staff testing? but mostly members)
            // Auth service issues role: 'MEMBER' for OTP login.
            // But let's be permissive or strict? 'role' is optional in JWT payload type def currently
            // but we set it in `auth.service`.
            // Let's assume having `member_id` is sufficient.

            if (!member_id) {
                return reply.status(403).send({ code: 'FORBIDDEN', message: 'Member access required' })
            }

            const card = await cardService.getOrCreateActiveCard(vendor_id, member_id)

            // Fetch Vendor Branding for the card display
            const vendor = await fastify.prisma.vendor.findUnique({
                where: { vendor_id },
                include: { branding: true }
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
                token,
                expires_in_seconds: 30,
                vendor: {
                    trading_name: vendor?.trading_name,
                    branding: vendor?.branding
                }
            }
        }
    )
}

export default memberRoutes
