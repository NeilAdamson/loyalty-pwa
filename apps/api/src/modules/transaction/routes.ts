import { FastifyPluginAsync, FastifyReply, FastifyInstance } from 'fastify'
import { TransactionService } from '../../services/transaction.service'
import { RotatingTokenPayload, verifyRotatingToken } from '../../utils/rotating-token'
import { getClientIp } from '../../utils/client-ip'

async function resolveRotatingTokenPayload(
    fastify: FastifyInstance,
    rotatingToken: string,
    reply: FastifyReply
): Promise<RotatingTokenPayload | undefined> {
    try {
        return await verifyRotatingToken(fastify, rotatingToken)
    } catch (err: unknown) {
        const candidate = err as { statusCode?: number; code?: string; message?: string }
        reply.status(candidate.statusCode ?? 401).send({
            code: candidate.code ?? 'INVALID_TOKEN',
            message: candidate.message ?? 'Invalid or expired rotating token',
        })
        return undefined
    }
}

const transactionRoutes: FastifyPluginAsync = async (fastify) => {
    const transactionService = new TransactionService(
        fastify.prisma,
        fastify.rateLimiter,
        fastify.fraudEvents
    )

    // Helper to extract staff info
    // Staff Token: { vendor_id, staff_id, role }
    // We also need branch_id. 
    // Wait, staff token (from login) doesn't strictly have branch_id in payload currently.
    // Schema: StaffUser has branch_id.
    // Auth Service: verifyStaffPin returns staff object (which has branch_id).
    // Route: signs token with { vendor_id, staff_id, role }.
    // WE SHOULD ADD branch_id TO TOKEN? 
    // For now, we'll fetch staff to get branch_id, or trust token if we added it.
    // Let's fetch staff to be safe and ensure they are still ENABLED?
    // Auth decorator handles `vendor_id`.
    // Let's modify logic to fetch staff or add branch_id to token later. 
    // To keep it simple for now, we'll fetch Staff in the service or here.
    // Optimization: Put branch_id in token.
    // DECISION: Fetch staff from DB using staff_id to get branch_id and verify status (AGAIN).
    // OR: Assume Auth Middleware did its job, but we need Branch ID.

    // POST /tx/stamp
    fastify.post<{ Body: { token: string } }>(
        '/tx/stamp',
        {
            onRequest: [fastify.authenticate]
        },
        async (request, reply) => {
            const { vendor_id, staff_id, role } = request.user
            const { token: rotatingToken } = request.body

            if (!staff_id) {
                return reply.status(403).send({ code: 'FORBIDDEN', message: 'Staff access required' })
            }

            const payload = await resolveRotatingTokenPayload(fastify, rotatingToken, reply)
            if (!payload) return reply

            // Check cross-vendor replay? Payload has vendor_id.
            if (payload.vendor_id !== vendor_id) {
                return reply.status(403).send({ code: 'FORBIDDEN', message: 'Token belongs to another vendor' })
            }

            // Get Branch ID (Fetch Staff)
            const staff = await fastify.prisma.staffUser.findUnique({
                where: { staff_id }
            })
            if (!staff || staff.status !== 'ENABLED') {
                return reply.status(403).send({ code: 'STAFF_DISABLED', message: 'Staff disabled' })
            }
            if (staff.vendor_id !== vendor_id) {
                return reply.status(403).send({ code: 'FORBIDDEN', message: 'Staff does not belong to this vendor' })
            }

            if (!vendor_id) return reply.status(401).send();
            const clientIp = getClientIp(request)
            const result = await transactionService.stamp(
                vendor_id,
                staff_id,
                staff.branch_id,
                payload,
                clientIp
            )
            const stamps_required = result.program?.stamps_required ?? 10
            const is_full = result.stamps_count >= stamps_required

            return { success: true, new_count: result.stamps_count, stamps_required, is_full }
        }
    )

    // POST /tx/redeem
    fastify.post<{ Body: { token: string } }>(
        '/tx/redeem',
        {
            onRequest: [fastify.authenticate]
        },
        async (request, reply) => {
            const { vendor_id, staff_id } = request.user
            const { token: rotatingToken } = request.body

            if (!staff_id) {
                return reply.status(403).send({ code: 'FORBIDDEN', message: 'Staff access required' })
            }

            const payload = await resolveRotatingTokenPayload(fastify, rotatingToken, reply)
            if (!payload) return reply

            if (payload.vendor_id !== vendor_id) {
                return reply.status(403).send({ code: 'FORBIDDEN', message: 'Token belongs to another vendor' })
            }

            const staff = await fastify.prisma.staffUser.findUnique({ where: { staff_id } })
            if (!staff || staff.status !== 'ENABLED') {
                return reply.status(403).send({ code: 'STAFF_DISABLED', message: 'Staff disabled' })
            }
            if (staff.vendor_id !== vendor_id) {
                return reply.status(403).send({ code: 'FORBIDDEN', message: 'Staff does not belong to this vendor' })
            }

            if (!vendor_id) return reply.status(401).send();
            const clientIp = getClientIp(request)
            const result = await transactionService.redeem(
                vendor_id,
                staff_id,
                staff.branch_id,
                payload,
                clientIp
            )

            return { success: true, ...result }
        }
    )
}

export default transactionRoutes
