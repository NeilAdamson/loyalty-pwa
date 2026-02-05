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
    fastify.post('/', { preHandler: [verifyAdmin] }, async (request, reply) => {
        const body = request.body as Record<string, unknown>

        // Field-level validation with user-friendly messages
        const details: Record<string, string> = {}
        const required = [
            ['legal_name', 'Please enter legal name'],
            ['trading_name', 'Please enter trading name'],
            ['vendor_slug', 'Please enter URL slug'],
            ['contact_name', 'Please enter contact name'],
            ['contact_surname', 'Please enter contact surname'],
            ['contact_phone', 'Please enter contact number (e.g. 082 123 4567)'],
            ['billing_email', 'Please enter billing email'],
            ['monthly_billing_amount', 'Please enter monthly billing amount'],
            ['billing_start_date', 'Please select billing start date'],
        ] as const
        for (const [field, msg] of required) {
            const val = body[field]
            if (val === undefined || val === null || String(val).trim() === '') {
                details[field] = msg
            }
        }
        const phone = String(body.contact_phone || '').replace(/\D/g, '')
        if (!details.contact_phone && phone.length !== 10) {
            details.contact_phone = 'Contact number must be 10 digits (e.g. 0821234567)'
        }
        const slug = String(body.vendor_slug || '')
        if (!details.vendor_slug && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
            details.vendor_slug = 'Slug can only contain lowercase letters, numbers and hyphens'
        }
        const email = String(body.billing_email || '')
        if (!details.billing_email && email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            details.billing_email = 'Please enter a valid email address'
        }

        if (Object.keys(details).length > 0) {
            return reply.code(400).send({
                code: 'VALIDATION_ERROR',
                message: Object.values(details)[0] || 'Validation failed',
                details,
            })
        }

        try {
            return await adminVendorService.create(body as any)
        } catch (err: any) {
            console.error('[VendorRoutes] Error creating vendor:', err)
            request.log.error(err, 'Failed to create vendor')
            const details: Record<string, string> = {}
            if (err.code === 'P2002') {
                const target = (err.meta?.target as string[] | undefined)
                if (target?.includes('vendor_slug')) details.vendor_slug = 'This URL slug is already in use'
                else if (target?.length) details[target[0]] = 'This value already exists'
            }
            const msg = Object.keys(details).length > 0
                ? Object.values(details)[0]
                : (err.message || 'Failed to create vendor')
            return reply.code(err.code === 'P2002' ? 409 : 500).send({
                code: err.code === 'P2002' ? 'CONFLICT' : 'INTERNAL_SERVER_ERROR',
                message: msg,
                details: Object.keys(details).length > 0 ? details : undefined,
            })
        }
    })


    // Get
    fastify.get('/:id', { preHandler: [verifyAdmin] }, async (request) => {
        const { id } = request.params as any
        return adminVendorService.get(id)
    })

    // Update (Suspension etc)
    fastify.patch('/:id', { preHandler: [verifyAdmin] }, async (request, reply) => {
        try {
            const { id } = request.params as any
            const body = request.body as any
            return await adminVendorService.update(id, body)
        } catch (err: any) {
            console.error('[VendorRoutes] Error updating vendor:', err)
            request.log.error(err, 'Failed to update vendor')
            const details: Record<string, string> = {}
            if (err.code === 'P2002') {
                const target = (err.meta?.target as string[] | undefined)
                if (target?.includes('vendor_slug')) details.vendor_slug = 'This URL slug is already in use'
            }
            const msg = Object.keys(details).length > 0
                ? Object.values(details)[0]
                : (err.message || 'Failed to update vendor')
            return reply.code(err.code === 'P2002' ? 409 : 500).send({
                code: err.code === 'P2002' ? 'CONFLICT' : 'INTERNAL_SERVER_ERROR',
                message: msg,
                details: Object.keys(details).length > 0 ? details : undefined,
            })
        }
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
