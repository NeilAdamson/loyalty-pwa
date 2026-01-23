import { FastifyInstance } from 'fastify'
import { AdminMemberService } from '../../services/admin-member.service'
import { PrismaClient } from '@prisma/client'

export async function adminMemberRoutes(fastify: FastifyInstance) {
    const prisma = new PrismaClient()
    const adminMemberService = new AdminMemberService(prisma)

    // Middleware to verify Admin Cookie (simplified)
    fastify.addHook('onRequest', async (request, reply) => {
        try {
            const token = request.cookies.admin_token
            if (!token) throw new Error('No token')
            const decoded: any = fastify.jwt.verify(token)
            if (decoded.type !== 'ADMIN') throw new Error('Not Admin')
        } catch (err) {
            reply.code(401).send({ message: 'Unauthorized' })
        }
    })

    // List & Search
    fastify.get('/', async (request) => {
        const query = request.query as any
        return adminMemberService.list({
            page: Number(query.page) || 1,
            limit: Number(query.limit) || 20,
            query: query.q
        })
    })

    // Get History/Details
    fastify.get('/:id', async (request) => {
        const { id } = request.params as any
        return adminMemberService.getHistory(id)
    })

    // Update (Suspend/Activate)
    fastify.patch('/:id', async (request) => {
        const { id } = request.params as any
        const body = request.body as any // { status: 'SUSPENDED' }

        // Direct update for now, move to Service if complex
        return prisma.member.update({
            where: { member_id: id },
            data: { status: body.status }
        })
    })
}
