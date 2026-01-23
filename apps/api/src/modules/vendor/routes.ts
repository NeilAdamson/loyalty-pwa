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

            const vendor = await vendorService.resolveBySlug(vendorSlug)

            // Get active program summary
            const activeProgram = await fastify.prisma.program.findFirst({
                where: { vendor_id: vendor.vendor_id, is_active: true },
                select: {
                    stamps_required: true,
                    reward_title: true,
                    reward_description: true,
                    terms_text: true,
                    // Don't leak internal IDs if possible, or maybe minimal
                }
            })

            // Return public shape
            return {
                legal_name: vendor.legal_name,
                trading_name: vendor.trading_name,
                status: vendor.status,
                // branding would be joined here if we fetched it
                // Let's ensure we fetch branding? 
                // resolveBySlug doesn't pull it by default. 
                // We can do a second query or update service. 
                // For now, let's keep it simple or do a direct include query here?
                // Let's do a direct query for public view to shape it exactly.
                active_program: activeProgram
            }
        }
    )
}

export default vendorRoutes
