import { FastifyInstance } from 'fastify'
import { AdminVendorService } from '../../services/admin-vendor.service'
import { PrismaClient } from '@prisma/client'

export async function adminVendorRoutes(fastify: FastifyInstance) {
    const prisma = new PrismaClient()
    const adminVendorService = new AdminVendorService(prisma)

    // Middleware to verify Admin Cookie (simplified here, ideally a decorator)
    fastify.addHook('onRequest', async (request, reply) => {
        try {
            await request.jwtVerify() // Uses cookie automatically if configured? 
            // fastify-jwt looks at Authorization header by default.
            // We need to tell it to look at cookie 'admin_token'.
            // OR we manually verify like in auth.routes 'me'.

            const token = request.cookies.admin_token
            if (!token) throw new Error('No token')
            const decoded: any = fastify.jwt.verify(token)
            if (decoded.type !== 'ADMIN') throw new Error('Not Admin')
            // request.user = decoded;
        } catch (err) {
            reply.code(401).send({ message: 'Unauthorized' })
        }
    })

    // List
    fastify.get('/', async (request) => {
        const query = request.query as any
        return adminVendorService.list({
            page: Number(query.page) || 1,
            limit: Number(query.limit) || 20,
            query: query.q,
            status: query.status
        })
    })

    // Create
    fastify.post('/', async (request) => {
        const body = request.body as any
        return adminVendorService.create(body)
    })

    // Get
    fastify.get('/:id', async (request) => {
        const { id } = request.params as any
        return adminVendorService.get(id)
    })

    // Update (Suspension etc)
    fastify.patch('/:id', async (request) => {
        const { id } = request.params as any
        const body = request.body as any
        return adminVendorService.update(id, body)
    })
}
