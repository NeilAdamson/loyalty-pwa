import { FastifyInstance } from 'fastify'
import { AdminVendorService } from '../../services/admin-vendor.service'
import { AdminStaffService } from '../../services/admin-staff.service'
import { PrismaClient } from '@prisma/client'
import { verifyAdmin } from './middleware'

export async function adminVendorRoutes(fastify: FastifyInstance) {
    const prisma = new PrismaClient()
    const adminVendorService = new AdminVendorService(prisma)

    // List
    fastify.get('/', { preHandler: [verifyAdmin] }, async (request) => {
        const query = request.query as any
        return adminVendorService.list({
            page: Number(query.page) || 1,
            limit: Number(query.limit) || 20,
            query: query.q,
            status: query.status
        })
    })

    // Create
    fastify.post('/', { preHandler: [verifyAdmin] }, async (request) => {
        const body = request.body as any
        return adminVendorService.create(body)
    })

    // Get
    fastify.get('/:id', { preHandler: [verifyAdmin] }, async (request) => {
        const { id } = request.params as any
        return adminVendorService.get(id)
    })

    // Update (Suspension etc)
    fastify.patch('/:id', { preHandler: [verifyAdmin] }, async (request) => {
        const { id } = request.params as any
        const body = request.body as any
        return adminVendorService.update(id, body)
    })

    // Delete
    fastify.delete('/:id', { preHandler: [verifyAdmin] }, async (request) => {
        const { id } = request.params as any
        await adminVendorService.delete(id)
        return { success: true, message: 'Vendor deleted' }
    })

    // --- Staff Management ---
    const adminStaffService = new AdminStaffService(prisma)

    // List Staff
    fastify.get('/:id/staff', { preHandler: [verifyAdmin] }, async (request) => {
        const { id } = request.params as any
        return adminStaffService.listByVendor(id)
    })

    // Create Staff
    fastify.post('/:id/staff', { preHandler: [verifyAdmin] }, async (request, reply) => {
        const { id } = request.params as any
        const body = request.body as any
        const staff = await adminStaffService.create(id, body)
        return { success: true, staff }
    })

    // Reset PIN
    fastify.patch('/:id/staff/:staffId/pin', { preHandler: [verifyAdmin] }, async (request) => {
        const { id, staffId } = request.params as any
        const { pin } = request.body as any
        await adminStaffService.resetPin(id, staffId, pin)
        return { success: true, message: 'PIN updated' }
    })
}
