import { FastifyInstance } from 'fastify'
import { AdminService } from '../../services/admin.service'
import { PrismaClient } from '@prisma/client'

export async function adminAuthRoutes(fastify: FastifyInstance) {
    const adminService = new AdminService(fastify.prisma)

    // Login (Set Cookie)
    fastify.post('/login', async (request, reply) => {
        const { email, password } = request.body as any
        console.log(`[AdminAuth] Login attempt for: ${email}`); // Debug log
        try {
            const admin = await adminService.login(email, password)

            // Sign JWT
            const token = fastify.jwt.sign({
                sub: admin.admin_id,
                role: admin.role,
                type: 'ADMIN'
            }, { expiresIn: '8h' })

            // Set HttpOnly Cookie
            reply.setCookie('admin_token', token, {
                path: '/',
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production', // Secure in Prod
                sameSite: 'lax',
                maxAge: 8 * 60 * 60 // 8 hours
            })

            return { success: true, admin }
        } catch (error: any) {
            console.error('[AdminAuth] Login Error:', error);
            // Return 401 instead of crashing
            return reply.code(401).send({ message: error.message || 'Login failed' });
        }
    })

    // Logout (Clear Cookie)
    fastify.post('/logout', async (request, reply) => {
        reply.clearCookie('admin_token', { path: '/' })
        return { success: true }
    })

    // Me (Verify Cookie)
    fastify.get('/me', async (request, reply) => {
        try {
            const token = request.cookies.admin_token
            if (!token) throw new Error('No token')

            const decoded = fastify.jwt.verify(token) as any
            const admin = await adminService.getById(decoded.sub)

            if (!admin) throw new Error('Admin not found')
            return { authenticated: true, admin }
        } catch (e) {
            return reply.code(401).send({ authenticated: false })
        }
    })
}
