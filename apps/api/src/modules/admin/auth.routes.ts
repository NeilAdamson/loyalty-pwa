import { FastifyInstance } from 'fastify'
import { AdminService } from '../../services/admin.service'

export async function adminAuthRoutes(fastify: FastifyInstance) {
    const adminService = new AdminService(fastify.prisma)

    // Login (Set Cookie)
    fastify.post<{ Body: any }>('/login', async (request, reply) => {
        const { email, password } = request.body as any
        console.log(`[AdminAuth] Login attempt for: ${email}`); // Debug log
        try {
            const adminUser: any = await adminService.login(email, password)

            const jwtToken: string = fastify.jwt.sign({
                sub: adminUser.admin_id,
                role: adminUser.role,
                type: 'ADMIN'
            }, { expiresIn: '8h' });

            // Set HttpOnly Cookie
            (reply as any).setCookie('admin_token', jwtToken, {
                path: '/',
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 8 * 60 * 60 // 8 hours
            })

            return { success: true, admin: adminUser }
        } catch (error: any) {
            console.error('[AdminAuth] Login Error:', error);
            // Return 401 instead of crashing
            return reply.code(401).send({ message: error.message || 'Login failed' });
        }
    })

    // Logout (Clear Cookie)
    fastify.post<{ Body: {} }>('/logout', async (_request, reply) => {
        (reply as any).clearCookie('admin_token', { path: '/' })
        return { success: true }
    })

    // Me (Verify Cookie)
    fastify.get<{ Params: {} }>('/me', async (request, reply) => {
        try {
            const token = (request as any).cookies.admin_token
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
