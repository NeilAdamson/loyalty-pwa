import { FastifyInstance } from 'fastify'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { AdminService } from '../../services/admin.service'
import { EmailService, buildAdminEmail } from '../../services/email.service'

export async function adminAuthRoutes(fastify: FastifyInstance) {
    const adminService = new AdminService(fastify.prisma)
    const emailService = new EmailService()

    // Login (Set Cookie)
    fastify.post<{ Body: any }>('/login', async (request, reply) => {
        const { email, password } = request.body as any
        console.log(`[AdminAuth] Login attempt for: ${email}`)
        try {
            const adminUser: any = await adminService.login(email, password)

            const jwtToken: string = fastify.jwt.sign({
                sub: adminUser.admin_id,
                role: adminUser.role,
                type: 'ADMIN'
            }, { expiresIn: '8h' })

            // Set HttpOnly Cookie
            ;(reply as any).setCookie('admin_token', jwtToken, {
                path: '/',
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 8 * 60 * 60 // 8 hours
            })

            return { success: true, admin: adminUser }
        } catch (error: any) {
            console.error('[AdminAuth] Login Error:', error)
            return reply.code(401).send({ message: error.message || 'Login failed' })
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

    // Forgot Password - request reset email
    fastify.post<{ Body: { identifier: string } }>('/forgot-password', async (request, reply) => {
        const { identifier } = request.body
        console.log(`[AdminAuth] Forgot password request for: ${identifier}`)

        if (!identifier || typeof identifier !== 'string') {
            return reply.code(400).send({ message: 'Username or email is required' })
        }

        const trimmed = identifier.trim().toLowerCase()
        
        // Build email from username if it's not already an email
        const email = trimmed.includes('@') ? trimmed : buildAdminEmail(trimmed)

        // Find admin by email
        const admin = await fastify.prisma.adminUser.findUnique({
            where: { email }
        })

        // Always return success to prevent email enumeration
        if (!admin || admin.status !== 'ACTIVE') {
            console.log(`[AdminAuth] Forgot password: no active admin found for ${email}`)
            return { success: true, message: 'If an account exists with that username, a reset email has been sent.' }
        }

        // Generate reset token (plain token for URL, hashed for storage)
        const plainToken = crypto.randomBytes(32).toString('hex')
        const hashedToken = await bcrypt.hash(plainToken, 10)
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

        // Save hashed token to DB
        await fastify.prisma.adminUser.update({
            where: { admin_id: admin.admin_id },
            data: {
                reset_token: hashedToken,
                reset_token_exp: expiresAt
            }
        })

        // Send email with plain token
        const sent = await emailService.sendPasswordResetEmail(
            admin.email,
            plainToken,
            admin.first_name
        )

        if (!sent) {
            console.error('[AdminAuth] Failed to send reset email')
        }

        return { success: true, message: 'If an account exists with that username, a reset email has been sent.' }
    })

    // Reset Password - use token to set new password
    fastify.post<{ Body: { token: string; password: string } }>('/reset-password', async (request, reply) => {
        const { token, password } = request.body

        if (!token || typeof token !== 'string') {
            return reply.code(400).send({ message: 'Reset token is required' })
        }
        if (!password || typeof password !== 'string' || password.length < 8) {
            return reply.code(400).send({ message: 'Password must be at least 8 characters' })
        }

        // Find all admins with unexpired reset tokens
        const adminsWithTokens = await fastify.prisma.adminUser.findMany({
            where: {
                reset_token: { not: null },
                reset_token_exp: { gt: new Date() }
            }
        })

        // Check each token (bcrypt compare)
        let matchedAdmin = null
        for (const admin of adminsWithTokens) {
            if (admin.reset_token) {
                const valid = await bcrypt.compare(token, admin.reset_token)
                if (valid) {
                    matchedAdmin = admin
                    break
                }
            }
        }

        if (!matchedAdmin) {
            console.log('[AdminAuth] Reset password: invalid or expired token')
            return reply.code(400).send({ message: 'Invalid or expired reset token' })
        }

        // Hash new password and clear reset token
        const password_hash = await bcrypt.hash(password, 10)
        await fastify.prisma.adminUser.update({
            where: { admin_id: matchedAdmin.admin_id },
            data: {
                password_hash,
                reset_token: null,
                reset_token_exp: null
            }
        })

        console.log(`[AdminAuth] Password reset successful for ${matchedAdmin.email}`)
        return { success: true, message: 'Password has been reset. You can now log in.' }
    })
}
