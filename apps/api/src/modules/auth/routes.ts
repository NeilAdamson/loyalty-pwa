import { FastifyPluginAsync } from 'fastify'
import { VendorService } from '../../services/vendor.service'
import { AuthService } from '../../services/auth.service'

const authRoutes: FastifyPluginAsync = async (fastify) => {
    const vendorService = new VendorService(fastify.prisma)
    const authService = new AuthService(fastify.prisma)

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

    // Staff Login
    fastify.post<{ Params: { vendorSlug: string }; Body: { staff_id: string; pin: string } }>(
        '/v/:vendorSlug/auth/staff/login',
        async (request, reply) => {
            const { vendorSlug } = request.params
            const { staff_id, pin } = request.body

            const vendor = await vendorService.resolveBySlug(vendorSlug)
            const staff = await authService.verifyStaffPin(vendor.vendor_id, staff_id, pin)

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
