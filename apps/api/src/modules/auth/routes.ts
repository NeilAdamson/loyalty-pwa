import { FastifyPluginAsync } from 'fastify'
import { VendorService } from '../../services/vendor.service'
import { AuthService } from '../../services/auth.service'

import { WhatsAppService } from '../../services/whatsapp.service'

const authRoutes: FastifyPluginAsync = async (fastify) => {
    const vendorService = new VendorService(fastify.prisma)
    const whatsAppService = new WhatsAppService()
    const authService = new AuthService(fastify.prisma, whatsAppService)

    // Member OTP Request
    fastify.post<{ Params: { vendorSlug: string }; Body: { phone: string } }>(
        '/v/:vendorSlug/auth/member/otp/request',
        async (request, reply) => {
            const { vendorSlug } = request.params
            const { phone } = request.body

            const vendor = await vendorService.resolveBySlug(vendorSlug)
            await authService.requestMemberOtp(vendor.vendor_id, phone)

            return reply.send({ success: true, message: 'OTP sent' })
        }
    )

    // Member OTP Verify
    fastify.post<{ Params: { vendorSlug: string }; Body: { phone: string; code: string } }>(
        '/v/:vendorSlug/auth/member/otp/verify',
        async (request, reply) => {
            const { vendorSlug } = request.params
            const { phone, code } = request.body

            const vendor = await vendorService.resolveBySlug(vendorSlug)
            const member = await authService.verifyMemberOtp(vendor.vendor_id, phone, code)

            // Issue Token
            const token = fastify.jwt.sign({
                vendor_id: vendor.vendor_id,
                member_id: member.member_id,
                role: 'MEMBER'
            })

            return reply.send({ success: true, token, member })
        }
    )

    // Staff Login (username + PIN - no more UUID)
    fastify.post<{ Params: { vendorSlug: string }; Body: { username: string; pin: string } }>(
        '/v/:vendorSlug/auth/staff/login',
        async (request, reply) => {
            const { vendorSlug } = request.params
            const { username, pin } = request.body

            if (!username?.trim()) {
                return reply.code(400).send({ message: 'Username required' })
            }

            const vendor = await vendorService.resolveBySlug(vendorSlug)
            const staff = await authService.verifyStaffByUsername(vendor.vendor_id, username.trim().toLowerCase(), pin)

            const token = fastify.jwt.sign({
                vendor_id: vendor.vendor_id,
                staff_id: staff.staff_id,
                role: staff.role
            })

            return reply.send({ success: true, token, staff })
        }
    )
}

export default authRoutes
