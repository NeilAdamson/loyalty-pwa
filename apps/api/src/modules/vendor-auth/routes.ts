import { FastifyPluginAsync } from 'fastify'
import { EmailService } from '../../services/email.service'
import { VendorAdminAuthService } from '../../services/vendor-admin-auth.service'

const publicVendorAdmin = (vendorAdmin: {
    vendor_admin_id: string
    email: string
    first_name: string
    last_name: string
    role: string
}) => ({
    vendor_admin_id: vendorAdmin.vendor_admin_id,
    email: vendorAdmin.email,
    first_name: vendorAdmin.first_name,
    last_name: vendorAdmin.last_name,
    name: `${vendorAdmin.first_name} ${vendorAdmin.last_name}`.trim(),
    role: vendorAdmin.role
})

const publicVendor = (vendor: {
    vendor_id: string
    vendor_slug: string
    trading_name: string
    status: string
    onboarding_status: string
}) => ({
    vendor_id: vendor.vendor_id,
    vendor_slug: vendor.vendor_slug,
    trading_name: vendor.trading_name,
    status: vendor.status,
    onboarding_status: vendor.onboarding_status
})

const toRouteError = (err: unknown, fallbackCode: string, fallbackMessage: string) => {
    if (typeof err === 'object' && err !== null) {
        const candidate = err as { statusCode?: unknown; code?: unknown; message?: unknown }
        return {
            statusCode: typeof candidate.statusCode === 'number' ? candidate.statusCode : 500,
            code: typeof candidate.code === 'string' ? candidate.code : fallbackCode,
            message: typeof candidate.message === 'string' ? candidate.message : fallbackMessage
        }
    }
    return { statusCode: 500, code: fallbackCode, message: fallbackMessage }
}

const vendorAuthRoutes: FastifyPluginAsync = async (fastify) => {
    const service = new VendorAdminAuthService(fastify.prisma, new EmailService())

    const signVendorAdminToken = (vendorAdmin: { vendor_admin_id: string }, vendor: { vendor_id: string }) =>
        fastify.jwt.sign({
            sub: vendorAdmin.vendor_admin_id,
            vendor_admin_id: vendorAdmin.vendor_admin_id,
            vendor_id: vendor.vendor_id,
            role: 'ADMIN',
            type: 'VENDOR_ADMIN'
        }, { expiresIn: '12h' })

    fastify.post<{ Body: Record<string, unknown> }>('/vendor/register/start', async (request, reply) => {
        try {
            return await service.startRegistration(request.body)
        } catch (err: unknown) {
            const routeError = toRouteError(err, 'INTERNAL_SERVER_ERROR', 'Could not start vendor registration')
            return reply.code(routeError.statusCode).send({
                code: routeError.code,
                message: routeError.message
            })
        }
    })

    fastify.post<{ Body: { registration_id?: string; code?: string } }>('/vendor/register/verify', async (request, reply) => {
        try {
            return await service.verifyRegistrationCode(
                String(request.body.registration_id || ''),
                String(request.body.code || '')
            )
        } catch (err: unknown) {
            const routeError = toRouteError(err, 'INTERNAL_SERVER_ERROR', 'Could not verify registration code')
            return reply.code(routeError.statusCode).send({
                code: routeError.code,
                message: routeError.message
            })
        }
    })

    fastify.post<{ Body: Record<string, unknown> }>('/vendor/register/complete', async (request, reply) => {
        try {
            const { vendorAdmin, vendor } = await service.completeRegistration(request.body)
            return {
                success: true,
                token: signVendorAdminToken(vendorAdmin, vendor),
                vendor_admin: publicVendorAdmin(vendorAdmin),
                vendor: publicVendor(vendor)
            }
        } catch (err: unknown) {
            const routeError = toRouteError(err, 'INTERNAL_SERVER_ERROR', 'Could not complete vendor registration')
            return reply.code(routeError.statusCode).send({
                code: routeError.code,
                message: routeError.message
            })
        }
    })

    fastify.post<{ Body: { email?: string; password?: string } }>('/vendor/auth/login', async (request, reply) => {
        try {
            const { vendorAdmin, vendor } = await service.login(request.body.email, request.body.password)
            return {
                success: true,
                token: signVendorAdminToken(vendorAdmin, vendor),
                vendor_admin: publicVendorAdmin(vendorAdmin),
                vendor: publicVendor(vendor)
            }
        } catch (err: unknown) {
            const routeError = toRouteError(err, 'UNAUTHORIZED', 'Invalid credentials')
            return reply.code(routeError.statusCode === 500 ? 401 : routeError.statusCode).send({
                code: routeError.code,
                message: routeError.message
            })
        }
    })

    fastify.post<{ Body: { email?: string } }>('/vendor/auth/forgot-password', async (request, reply) => {
        try {
            return await service.requestPasswordReset(request.body.email)
        } catch (err: unknown) {
            const routeError = toRouteError(err, 'VALIDATION_ERROR', 'Could not request password reset')
            return reply.code(routeError.statusCode === 500 ? 400 : routeError.statusCode).send({
                code: routeError.code,
                message: routeError.message
            })
        }
    })

    fastify.post<{ Body: { token?: string; password?: string } }>('/vendor/auth/reset-password', async (request, reply) => {
        try {
            return await service.resetPassword(request.body.token, request.body.password)
        } catch (err: unknown) {
            const routeError = toRouteError(err, 'VALIDATION_ERROR', 'Could not reset password')
            return reply.code(routeError.statusCode === 500 ? 400 : routeError.statusCode).send({
                code: routeError.code,
                message: routeError.message
            })
        }
    })

    fastify.get('/vendor-admin/me', { onRequest: [fastify.authenticate] }, async (request, reply) => {
        const { vendor_admin_id: vendorAdminId, staff_id: staffId, vendor_id: vendorId } = request.user

        if (vendorAdminId && vendorId) {
            const vendorAdmin = await fastify.prisma.vendorAdminUser.findFirst({
                where: {
                    vendor_admin_id: vendorAdminId,
                    vendor_id: vendorId,
                    status: 'ACTIVE'
                },
                include: {
                    vendor: {
                        select: {
                            vendor_slug: true,
                            trading_name: true,
                            onboarding_status: true
                        }
                    }
                }
            })

            if (!vendorAdmin) {
                return reply.status(404).send({ code: 'NOT_FOUND', message: 'Vendor admin not found' })
            }

            return {
                id: vendorAdmin.vendor_admin_id,
                vendor_admin_id: vendorAdmin.vendor_admin_id,
                name: `${vendorAdmin.first_name} ${vendorAdmin.last_name}`.trim(),
                email: vendorAdmin.email,
                role: vendorAdmin.role,
                auth_type: 'VENDOR_ADMIN',
                vendor: vendorAdmin.vendor
            }
        }

        if (staffId && vendorId) {
            const staff = await fastify.prisma.staffUser.findFirst({
                where: {
                    staff_id: staffId,
                    vendor_id: vendorId,
                    status: 'ENABLED',
                    role: 'ADMIN'
                },
                include: {
                    vendor: {
                        select: {
                            vendor_slug: true,
                            trading_name: true,
                            onboarding_status: true
                        }
                    }
                }
            })

            if (!staff) {
                return reply.status(404).send({ code: 'NOT_FOUND', message: 'Admin staff not found' })
            }

            return {
                id: staff.staff_id,
                staff_id: staff.staff_id,
                name: staff.name,
                username: staff.username,
                role: staff.role,
                auth_type: 'STAFF_ADMIN',
                vendor: staff.vendor
            }
        }

        return reply.status(403).send({ code: 'FORBIDDEN', message: 'Vendor admin session required' })
    })
}

export default vendorAuthRoutes
