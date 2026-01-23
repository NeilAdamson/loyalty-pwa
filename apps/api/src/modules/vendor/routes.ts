import { FastifyPluginAsync } from 'fastify'
import { VendorService } from '../../services/vendor.service'

const vendorRoutes: FastifyPluginAsync = async (fastify) => {
    const vendorService = new VendorService(fastify.prisma)

    // Protected: Get My Profile
    // GET /vendors/me
    fastify.get(
        '/vendors/me',
        {
            onRequest: [fastify.authenticate] // Enforce Token
        },
        async (request, reply) => {
            const user = request.user
            // Scope by token vendor_id
            const vendor = await fastify.prisma.vendor.findUnique({
                where: { vendor_id: user.vendor_id },
                include: { branches: true }
            })

            if (!vendor) {
                return reply.status(404).send({ code: 'NOT_FOUND', message: 'Vendor not found' })
            }

            return vendor
        }
    )

    // Public: Get Vendor by Slug
    // GET /v/:vendorSlug/public
    fastify.get<{ Params: { vendorSlug: string } }>(
        '/v/:vendorSlug/public',
        async (request, reply) => {
            const { vendorSlug } = request.params

            const vendor = await fastify.prisma.vendor.findUnique({
                where: { vendor_slug: vendorSlug },
                include: { branding: true }
            })

            if (!vendor || vendor.status !== 'ACTIVE') {
                return reply.status(404).send({ code: 'NOT_FOUND', message: 'Vendor not found' })
            }

            // Get active program summary
            const activeProgram = await fastify.prisma.program.findFirst({
                where: { vendor_id: vendor.vendor_id, is_active: true },
                select: {
                    stamps_required: true,
                    reward_title: true,
                    reward_description: true,
                    terms_text: true,
                }
            })

            // Return public shape
            return {
                legal_name: vendor.legal_name,
                trading_name: vendor.trading_name,
                status: vendor.status,
                branding: vendor.branding ? {
                    logo_url: vendor.branding.logo_url,
                    primary_color: vendor.branding.primary_color,
                    secondary_color: vendor.branding.secondary_color,
                    accent_color: vendor.branding.accent_color,
                    background_color: vendor.branding.background_color,
                    card_style: vendor.branding.card_style,
                    card_bg_image_url: vendor.branding.card_bg_image_url,
                    wordmark_url: vendor.branding.wordmark_url,
                    welcome_text: vendor.branding.welcome_text,
                    card_title: vendor.branding.card_title,
                } : null,
                active_program: activeProgram
            }
        }
    )
}

export default vendorRoutes
