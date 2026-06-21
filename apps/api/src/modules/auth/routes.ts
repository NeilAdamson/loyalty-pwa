import { FastifyPluginAsync } from 'fastify'
import type { AuthenticationResponseJSON, RegistrationResponseJSON } from '@simplewebauthn/types'
import { VendorService } from '../../services/vendor.service'
import { AuthService } from '../../services/auth.service'
import { SMSFlowService } from '../../services/smsflow.service'
import { WebAuthnService } from '../../services/webauthn.service'
import { SignupQrService } from '../../services/signup-qr.service'
import { getClientIp } from '../../utils/client-ip'
import { isRateLimitError } from '../../services/fraud-event.service'

const authRoutes: FastifyPluginAsync = async (fastify) => {
    const vendorService = new VendorService(fastify.prisma)
    const otpSender = new SMSFlowService()
    const authService = new AuthService(fastify.prisma, otpSender, fastify.rateLimiter, fastify.fraudEvents)
    const signupQrService = new SignupQrService(fastify.prisma)
    const webAuthn = new WebAuthnService(fastify.prisma, fastify.redis, fastify.rateLimiter)

    // Member OTP Request
    fastify.post<{
        Params: { vendorSlug: string }
        Body: { phone: string; signup_v?: number | string; signup_s?: string; branch_joined_id?: string }
    }>(
        '/v/:vendorSlug/auth/member/otp/request',
        async (request, reply) => {
            const { vendorSlug } = request.params
            const { phone, signup_v, signup_s, branch_joined_id } = request.body

            const vendor = await vendorService.resolveBySlug(vendorSlug)
            const signup = await signupQrService.validateSignupAccess(vendor.vendor_id, {
                v: signup_v,
                s: signup_s,
                b: branch_joined_id,
            })
            await authService.requestMemberOtp(vendor.vendor_id, phone, getClientIp(request))

            return reply.send({
                success: true,
                message: 'OTP sent',
                branch_joined_id: signup.branchId,
            })
        }
    )

    // Member OTP Verify
    fastify.post<{
        Params: { vendorSlug: string }
        Body: {
            phone: string
            code: string
            consent_marketing?: boolean
            signup_v?: number | string
            signup_s?: string
            branch_joined_id?: string
        }
    }>(
        '/v/:vendorSlug/auth/member/otp/verify',
        async (request, reply) => {
            const { vendorSlug } = request.params
            const { phone, code, consent_marketing, signup_v, signup_s, branch_joined_id } = request.body

            const vendor = await vendorService.resolveBySlug(vendorSlug)
            const signup = await signupQrService.validateSignupAccess(vendor.vendor_id, {
                v: signup_v,
                s: signup_s,
                b: branch_joined_id,
            })
            const member = await authService.verifyMemberOtp(
                vendor.vendor_id,
                phone,
                code,
                consent_marketing === true,
                signup.branchId,
                getClientIp(request)
            )

            // Issue Token
            const token = fastify.jwt.sign({
                vendor_id: vendor.vendor_id,
                member_id: member.member_id,
                role: 'MEMBER'
            })

            return reply.send({ success: true, token, member })
        }
    )

    // --- Member WebAuthn / passkeys ---

    fastify.post<{ Params: { vendorSlug: string } }>(
        '/v/:vendorSlug/auth/member/passkey/register/options',
        { onRequest: [fastify.authenticate] },
        async (request, reply) => {
            const { vendorSlug } = request.params
            const vendor = await vendorService.resolveBySlug(vendorSlug)
            if (request.user.vendor_id !== vendor.vendor_id) {
                return reply.code(403).send({ code: 'FORBIDDEN', message: 'Vendor mismatch' })
            }
            if (!request.user.member_id || request.user.role !== 'MEMBER') {
                return reply.code(403).send({ code: 'FORBIDDEN', message: 'Member session required' })
            }
            const member = await fastify.prisma.member.findUnique({
                where: { member_id: request.user.member_id },
                select: { member_id: true, phone_e164: true, name: true, vendor_id: true },
            })
            if (!member || member.vendor_id !== vendor.vendor_id) {
                return reply.code(403).send({ code: 'FORBIDDEN', message: 'Member not found' })
            }

            const { optionsJSON, stateId } = await webAuthn.getMemberRegistrationOptions({
                vendorId: vendor.vendor_id,
                memberId: member.member_id,
                phoneE164: member.phone_e164,
                displayName: member.name,
                clientIp: getClientIp(request),
                origin: request.headers.origin,
            })
            return reply.send({ stateId, optionsJSON })
        }
    )

    fastify.post<{ Params: { vendorSlug: string }; Body: { stateId: string; response: RegistrationResponseJSON } }>(
        '/v/:vendorSlug/auth/member/passkey/register/verify',
        { onRequest: [fastify.authenticate] },
        async (request, reply) => {
            const { vendorSlug } = request.params
            const { stateId, response } = request.body
            if (!stateId || !response) {
                return reply.code(400).send({ code: 'VALIDATION_ERROR', message: 'stateId and response required' })
            }

            const vendor = await vendorService.resolveBySlug(vendorSlug)
            if (request.user.vendor_id !== vendor.vendor_id || !request.user.member_id || request.user.role !== 'MEMBER') {
                return reply.code(403).send({ code: 'FORBIDDEN', message: 'Member session required' })
            }

            const { webauthn_credential_id } = await webAuthn.verifyMemberRegistration({
                vendorId: vendor.vendor_id,
                memberId: request.user.member_id,
                stateId,
                body: response,
                origin: request.headers.origin,
                clientIp: getClientIp(request),
            })
            return reply.send({ success: true, webauthn_credential_id })
        }
    )

    fastify.post<{ Params: { vendorSlug: string }; Body: { phone?: string } }>(
        '/v/:vendorSlug/auth/member/passkey/auth/options',
        async (request, reply) => {
            const { vendorSlug } = request.params
            const { phone } = request.body ?? {}
            const vendor = await vendorService.resolveBySlug(vendorSlug)
            const { optionsJSON, stateId } = await webAuthn.getMemberAuthenticationOptions({
                vendorId: vendor.vendor_id,
                phoneE164: typeof phone === 'string' && phone.trim() ? phone.trim() : undefined,
                clientIp: getClientIp(request),
                origin: request.headers.origin,
            })
            return reply.send({ stateId, optionsJSON })
        }
    )

    fastify.post<{ Params: { vendorSlug: string }; Body: { stateId: string; response: AuthenticationResponseJSON } }>(
        '/v/:vendorSlug/auth/member/passkey/auth/verify',
        async (request, reply) => {
            const { vendorSlug } = request.params
            const { stateId, response } = request.body
            if (!stateId || !response) {
                return reply.code(400).send({ code: 'VALIDATION_ERROR', message: 'stateId and response required' })
            }

            const vendor = await vendorService.resolveBySlug(vendorSlug)
            const { member_id } = await webAuthn.verifyMemberAuthentication({
                vendorId: vendor.vendor_id,
                stateId,
                body: response,
                origin: request.headers.origin,
                clientIp: getClientIp(request),
            })

            const member = await fastify.prisma.member.findUnique({
                where: { member_id },
                select: {
                    member_id: true,
                    vendor_id: true,
                    phone_e164: true,
                    name: true,
                    status: true,
                    consent_marketing: true,
                    last_active_at: true,
                    created_at: true,
                    updated_at: true,
                    branch_joined_id: true,
                },
            })
            if (!member || member.vendor_id !== vendor.vendor_id) {
                return reply.code(403).send({ code: 'FORBIDDEN', message: 'Member not found' })
            }

            const token = fastify.jwt.sign({
                vendor_id: vendor.vendor_id,
                member_id: member.member_id,
                role: 'MEMBER',
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
            const clientIp = getClientIp(request)
            try {
                await fastify.rateLimiter.assertStaffLoginAllowed(clientIp)
            } catch (err) {
                if (isRateLimitError(err)) {
                    await fastify.fraudEvents.recordStaffLoginLimit(vendor.vendor_id, clientIp)
                }
                throw err
            }
            const staff = await authService.verifyStaffByUsername(vendor.vendor_id, username.trim().toLowerCase(), pin)

            const token = fastify.jwt.sign({
                vendor_id: vendor.vendor_id,
                staff_id: staff.staff_id,
                role: staff.role
            })

            return reply.send({ success: true, token, staff })
        }
    )

    // --- Staff WebAuthn / passkeys ---

    fastify.post<{ Params: { vendorSlug: string } }>(
        '/v/:vendorSlug/auth/staff/passkey/register/options',
        { onRequest: [fastify.authenticate] },
        async (request, reply) => {
            const { vendorSlug } = request.params
            const vendor = await vendorService.resolveBySlug(vendorSlug)
            if (request.user.vendor_id !== vendor.vendor_id) {
                return reply.code(403).send({ code: 'FORBIDDEN', message: 'Vendor mismatch' })
            }
            if (!request.user.staff_id || (request.user.role !== 'STAMPER' && request.user.role !== 'ADMIN')) {
                return reply.code(403).send({ code: 'FORBIDDEN', message: 'Staff session required' })
            }

            const staff = await fastify.prisma.staffUser.findFirst({
                where: { staff_id: request.user.staff_id, vendor_id: vendor.vendor_id, status: 'ENABLED' },
                select: { staff_id: true, username: true, name: true, vendor_id: true },
            })
            if (!staff) {
                return reply.code(403).send({ code: 'FORBIDDEN', message: 'Staff not found' })
            }

            const { optionsJSON, stateId } = await webAuthn.getStaffRegistrationOptions({
                vendorId: vendor.vendor_id,
                staffId: staff.staff_id,
                username: staff.username,
                displayName: staff.name,
                clientIp: getClientIp(request),
                origin: request.headers.origin,
            })
            return reply.send({ stateId, optionsJSON })
        }
    )

    fastify.post<{ Params: { vendorSlug: string }; Body: { stateId: string; response: RegistrationResponseJSON } }>(
        '/v/:vendorSlug/auth/staff/passkey/register/verify',
        { onRequest: [fastify.authenticate] },
        async (request, reply) => {
            const { vendorSlug } = request.params
            const { stateId, response } = request.body
            if (!stateId || !response) {
                return reply.code(400).send({ code: 'VALIDATION_ERROR', message: 'stateId and response required' })
            }

            const vendor = await vendorService.resolveBySlug(vendorSlug)
            if (request.user.vendor_id !== vendor.vendor_id || !request.user.staff_id) {
                return reply.code(403).send({ code: 'FORBIDDEN', message: 'Staff session required' })
            }
            if (request.user.role !== 'STAMPER' && request.user.role !== 'ADMIN') {
                return reply.code(403).send({ code: 'FORBIDDEN', message: 'Staff session required' })
            }

            const { webauthn_credential_id } = await webAuthn.verifyStaffRegistration({
                vendorId: vendor.vendor_id,
                staffId: request.user.staff_id,
                stateId,
                body: response,
                origin: request.headers.origin,
                clientIp: getClientIp(request),
            })
            return reply.send({ success: true, webauthn_credential_id })
        }
    )

    fastify.post<{ Params: { vendorSlug: string }; Body: { username?: string } }>(
        '/v/:vendorSlug/auth/staff/passkey/auth/options',
        async (request, reply) => {
            const { vendorSlug } = request.params
            const { username } = request.body ?? {}
            const vendor = await vendorService.resolveBySlug(vendorSlug)
            const { optionsJSON, stateId } = await webAuthn.getStaffAuthenticationOptions({
                vendorId: vendor.vendor_id,
                username: typeof username === 'string' ? username : undefined,
                clientIp: getClientIp(request),
                origin: request.headers.origin,
            })
            return reply.send({ stateId, optionsJSON })
        }
    )

    fastify.post<{ Params: { vendorSlug: string }; Body: { stateId: string; response: AuthenticationResponseJSON } }>(
        '/v/:vendorSlug/auth/staff/passkey/auth/verify',
        async (request, reply) => {
            const { vendorSlug } = request.params
            const { stateId, response } = request.body
            if (!stateId || !response) {
                return reply.code(400).send({ code: 'VALIDATION_ERROR', message: 'stateId and response required' })
            }

            const vendor = await vendorService.resolveBySlug(vendorSlug)
            const { staff_id } = await webAuthn.verifyStaffAuthentication({
                vendorId: vendor.vendor_id,
                stateId,
                body: response,
                origin: request.headers.origin,
                clientIp: getClientIp(request),
            })

            const staff = await fastify.prisma.staffUser.findFirst({
                where: { staff_id, vendor_id: vendor.vendor_id, status: 'ENABLED' },
                select: {
                    staff_id: true,
                    vendor_id: true,
                    branch_id: true,
                    username: true,
                    name: true,
                    role: true,
                    status: true,
                    created_at: true,
                    updated_at: true,
                },
            })
            if (!staff) {
                return reply.code(403).send({ code: 'STAFF_DISABLED', message: 'Staff account disabled' })
            }

            const token = fastify.jwt.sign({
                vendor_id: vendor.vendor_id,
                staff_id: staff.staff_id,
                role: staff.role,
            })

            return reply.send({ success: true, token, staff })
        }
    )
}

export default authRoutes
