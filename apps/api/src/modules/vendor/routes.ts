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

    // Current staff session (vendor portal / scanner). Member tokens do not include staff_id.
    fastify.get(
        '/staff/me',
        {
            onRequest: [fastify.authenticate]
        },
        async (request, reply) => {
            const { staff_id: staffId, vendor_id: vendorId } = request.user
            if (!staffId || !vendorId) {
                return reply.status(403).send({ code: 'FORBIDDEN', message: 'Staff session required' })
            }

            const staff = await fastify.prisma.staffUser.findFirst({
                where: {
                    staff_id: staffId,
                    vendor_id: vendorId,
                    status: 'ENABLED'
                },
                select: {
                    staff_id: true,
                    name: true,
                    username: true,
                    role: true,
                }
            })

            if (!staff) {
                return reply.status(404).send({ code: 'NOT_FOUND', message: 'Staff not found or disabled' })
            }

            return staff
        }
    )

    // Public: Staff portal lookup — vendor exists and may log in (ACTIVE or TRIAL per VendorService)
    // GET /v/:vendorSlug/portal/status
    // Used by /vendor/login to validate slug before redirect (does not expose tenant branding).
    fastify.get<{ Params: { vendorSlug: string } }>(
        '/v/:vendorSlug/portal/status',
        async (request, reply) => {
            const { vendorSlug } = request.params
            try {
                await vendorService.resolveBySlug(vendorSlug)
                return { ok: true as const }
            } catch (err: unknown) {
                const e = err as { statusCode?: number; code?: string; message?: string }
                const status = typeof e.statusCode === 'number' ? e.statusCode : 500
                const code = typeof e.code === 'string' ? e.code : 'INTERNAL_SERVER_ERROR'
                const message = typeof e.message === 'string' ? e.message : 'Unexpected error'
                return reply.status(status).send({ code, message })
            }
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
