import { FastifyPluginAsync } from 'fastify'
import { VendorService } from '../../services/vendor.service'
import { ProgramService } from '../../services/program.service'

const programRoutes: FastifyPluginAsync = async (fastify) => {
    const vendorService = new VendorService(fastify.prisma)
    const programService = new ProgramService(fastify.prisma)

    // Public: Get Active Program
    fastify.get<{ Params: { vendorSlug: string } }>(
        '/v/:vendorSlug/programs/active',
        async (request, reply) => {
            const { vendorSlug } = request.params
            const vendor = await vendorService.resolveBySlug(vendorSlug)
            const program = await programService.getActiveProgram(vendor.vendor_id)

            if (!program) {
                return reply.status(404).send({ code: 'NOT_FOUND', message: 'No active program' })
            }
            return program
        }
    )

    // Protected: Create Draft (Admin Only)
    fastify.post<{ Body: { stamps_required: number; reward_title: string; reward_description?: string; terms_text?: string } }>(
        '/programs',
        {
            onRequest: [fastify.authenticate]
        },
        async (request, reply) => {
            const { vendor_id, role } = request.user

            // RBAC: Admin only? The user said "staff role = ADMIN (or vendor admin)".
            // Our staff roles are 'ADMIN', 'STAMPER'.
            if (role !== 'ADMIN') {
                return reply.status(403).send({ code: 'FORBIDDEN', message: 'Admin access required' })
            }

            if (!vendor_id) return reply.status(401).send(); // Should be handled by auth
            const draft = await programService.createDraft(vendor_id, request.body)
            return draft
        }
    )

    // Protected: Activate (Admin Only)
    fastify.put<{ Params: { id: string } }>(
        '/programs/:id/activate',
        {
            onRequest: [fastify.authenticate]
        },
        async (request, reply) => {
            const { vendor_id, role } = request.user
            const { id } = request.params

            if (role !== 'ADMIN') {
                return reply.status(403).send({ code: 'FORBIDDEN', message: 'Admin access required' })
            }

            if (!vendor_id) return reply.status(401).send();
            const program = await programService.activateProgram(vendor_id, id)
            return program
        }
    )
}

export default programRoutes
