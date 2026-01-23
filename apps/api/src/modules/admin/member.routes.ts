import { FastifyInstance } from 'fastify'
import { AdminMemberService } from '../../services/admin-member.service'
import { PrismaClient } from '@prisma/client'
import { verifyAdmin } from './middleware'

export async function adminMemberRoutes(fastify: FastifyInstance) {
    const prisma = new PrismaClient()
    const adminMemberService = new AdminMemberService(prisma)

    // List & Search
    fastify.get('/', { preHandler: [verifyAdmin] }, async (request) => {
        const query = request.query as any
        return adminMemberService.list({
            page: Number(query.page) || 1,
            limit: Number(query.limit) || 20,
            query: query.q
        })
    })

    // Get History/Details
    fastify.get('/:id', { preHandler: [verifyAdmin] }, async (request) => {
        const { id } = request.params as any
        return adminMemberService.getHistory(id)
    })

    // Update (Suspend/Activate)
    fastify.patch('/:id', { preHandler: [verifyAdmin] }, async (request) => {
        const { id } = request.params as any
        const body = request.body as any // { status: 'SUSPENDED' }

        // Direct update for now, move to Service if complex
        return prisma.member.update({
            where: { member_id: id },
            data: { status: body.status }
        })
    })
}
