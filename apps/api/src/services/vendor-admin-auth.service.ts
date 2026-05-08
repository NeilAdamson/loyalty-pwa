import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import crypto, { randomInt } from 'crypto'
import { ERROR_CODES } from '../plugins/errors'
import { EmailService } from './email.service'
import { requireSecret } from '../utils/config'

const OTP_PEPPER = requireSecret('OTP_PEPPER')
const REGISTRATION_CODE_TTL_MS = 15 * 60 * 1000
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/

type StartRegistrationInput = {
    email?: unknown
    first_name?: unknown
    last_name?: unknown
    trading_name?: unknown
    legal_name?: unknown
    contact_phone?: unknown
}

type CompleteRegistrationInput = {
    registration_id?: unknown
    password?: unknown
    vendor_slug?: unknown
    legal_name?: unknown
    trading_name?: unknown
    contact_phone?: unknown
}

const normalizeText = (value: unknown, fieldName: string, maxLength: number): string => {
    if (typeof value !== 'string' || !value.trim()) {
        throw { statusCode: 400, code: ERROR_CODES.VALIDATION_ERROR, message: `${fieldName} is required` }
    }
    const normalized = value.trim()
    if (normalized.length > maxLength) {
        throw { statusCode: 400, code: ERROR_CODES.VALIDATION_ERROR, message: `${fieldName} must be ${maxLength} characters or fewer` }
    }
    return normalized
}

const normalizeOptionalText = (value: unknown, maxLength: number): string | null => {
    if (value === undefined || value === null || String(value).trim() === '') return null
    const normalized = String(value).trim()
    return normalized.slice(0, maxLength)
}

export const normalizeEmail = (value: unknown): string => {
    const email = normalizeText(value, 'email', 254).toLowerCase()
    if (!EMAIL_PATTERN.test(email)) {
        throw { statusCode: 400, code: ERROR_CODES.VALIDATION_ERROR, message: 'Enter a valid email address' }
    }
    return email
}

export const slugFromTradingName = (value: string): string => {
    const slug = value
        .toLowerCase()
        .replace(/&/g, ' and ')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .replace(/-{2,}/g, '-')
        .slice(0, 50)
        .replace(/-+$/g, '')

    return slug || `vendor-${randomInt(1000, 9999)}`
}

export const normalizeVendorSlug = (value: unknown, fallbackName: string): string => {
    const candidate = typeof value === 'string' && value.trim() ? value.trim().toLowerCase() : slugFromTradingName(fallbackName)
    if (!SLUG_PATTERN.test(candidate)) {
        throw {
            statusCode: 400,
            code: ERROR_CODES.VALIDATION_ERROR,
            message: 'Store slug can only contain lowercase letters, numbers, and single hyphens'
        }
    }
    if (candidate.length < 3 || candidate.length > 50) {
        throw { statusCode: 400, code: ERROR_CODES.VALIDATION_ERROR, message: 'Store slug must be 3 to 50 characters' }
    }
    return candidate
}

const registrationPublicFields = (registration: {
    registration_id: string
    email: string
    first_name: string
    last_name: string
    trading_name: string
    legal_name: string | null
    contact_phone: string | null
    vendor_slug: string | null
    status: string
}) => ({
    registration_id: registration.registration_id,
    email: registration.email,
    first_name: registration.first_name,
    last_name: registration.last_name,
    trading_name: registration.trading_name,
    legal_name: registration.legal_name,
    contact_phone: registration.contact_phone,
    vendor_slug: registration.vendor_slug,
    status: registration.status
})

export class VendorAdminAuthService {
    constructor(
        private prisma: PrismaClient,
        private emailService: EmailService
    ) { }

    async startRegistration(input: StartRegistrationInput) {
        const email = normalizeEmail(input.email)
        const firstName = normalizeText(input.first_name, 'first_name', 80)
        const lastName = normalizeText(input.last_name, 'last_name', 80)
        const tradingName = normalizeText(input.trading_name, 'trading_name', 120)
        const legalName = normalizeOptionalText(input.legal_name, 160) || tradingName
        const contactPhone = normalizeOptionalText(input.contact_phone, 40)

        const existingAdmin = await this.prisma.vendorAdminUser.findUnique({ where: { email } })
        if (existingAdmin) {
            throw { statusCode: 409, code: ERROR_CODES.CONFLICT, message: 'A vendor admin account already exists for that email' }
        }

        await this.prisma.vendorRegistration.updateMany({
            where: { email, status: { in: ['PENDING', 'VERIFIED'] } },
            data: { status: 'EXPIRED' }
        })

        const code = randomInt(100000, 999999).toString()
        const codeHash = await bcrypt.hash(code + OTP_PEPPER, 10)
        const expiresAt = new Date(Date.now() + REGISTRATION_CODE_TTL_MS)
        const vendorSlug = slugFromTradingName(tradingName)

        const registration = await this.prisma.vendorRegistration.create({
            data: {
                email,
                first_name: firstName,
                last_name: lastName,
                trading_name: tradingName,
                legal_name: legalName,
                contact_phone: contactPhone,
                vendor_slug: vendorSlug,
                code_hash: codeHash,
                expires_at: expiresAt
            }
        })

        const sent = await this.emailService.sendVendorRegistrationCode(email, code, firstName, tradingName)
        if (!sent) {
            throw { statusCode: 503, code: 'EMAIL_DELIVERY_FAILED', message: 'Could not send registration code' }
        }

        return {
            success: true,
            expires_in_minutes: Math.floor(REGISTRATION_CODE_TTL_MS / 60000),
            registration: registrationPublicFields(registration)
        }
    }

    async verifyRegistrationCode(registrationId: string, code: string) {
        if (!registrationId || !code) {
            throw { statusCode: 400, code: ERROR_CODES.VALIDATION_ERROR, message: 'Registration ID and code are required' }
        }

        const registration = await this.prisma.vendorRegistration.findUnique({
            where: { registration_id: registrationId }
        })

        if (!registration || !['PENDING', 'VERIFIED'].includes(registration.status)) {
            throw { statusCode: 404, code: ERROR_CODES.NOT_FOUND, message: 'Registration not found' }
        }

        if (registration.expires_at <= new Date()) {
            await this.prisma.vendorRegistration.update({
                where: { registration_id: registration.registration_id },
                data: { status: 'EXPIRED' }
            })
            throw { statusCode: 400, code: 'REGISTRATION_CODE_EXPIRED', message: 'Registration code expired' }
        }

        if (registration.attempts >= 5) {
            throw { statusCode: 429, code: ERROR_CODES.RATE_LIMITED, message: 'Too many code attempts' }
        }

        const valid = await bcrypt.compare(String(code).trim() + OTP_PEPPER, registration.code_hash)
        if (!valid) {
            await this.prisma.vendorRegistration.update({
                where: { registration_id: registration.registration_id },
                data: { attempts: { increment: 1 } }
            })
            throw { statusCode: 400, code: 'REGISTRATION_CODE_INVALID', message: 'Invalid registration code' }
        }

        const verified = await this.prisma.vendorRegistration.update({
            where: { registration_id: registration.registration_id },
            data: {
                status: 'VERIFIED',
                verified_at: registration.verified_at || new Date()
            }
        })

        return { success: true, registration: registrationPublicFields(verified) }
    }

    async completeRegistration(input: CompleteRegistrationInput) {
        const registrationId = normalizeText(input.registration_id, 'registration_id', 80)
        const password = normalizeText(input.password, 'password', 200)
        if (password.length < 8) {
            throw { statusCode: 400, code: ERROR_CODES.VALIDATION_ERROR, message: 'Password must be at least 8 characters' }
        }

        const registration = await this.prisma.vendorRegistration.findUnique({
            where: { registration_id: registrationId }
        })

        if (!registration || registration.status !== 'VERIFIED' || !registration.verified_at) {
            throw { statusCode: 400, code: 'REGISTRATION_NOT_VERIFIED', message: 'Verify your registration code first' }
        }
        if (registration.completed_at) {
            throw { statusCode: 409, code: ERROR_CODES.CONFLICT, message: 'Registration has already been completed' }
        }

        const tradingName = normalizeOptionalText(input.trading_name, 120) || registration.trading_name
        const legalName = normalizeOptionalText(input.legal_name, 160) || registration.legal_name || tradingName
        const contactPhone = normalizeOptionalText(input.contact_phone, 40) || registration.contact_phone || ''
        const vendorSlug = normalizeVendorSlug(input.vendor_slug || registration.vendor_slug, tradingName)

        const [existingSlug, existingAdmin] = await Promise.all([
            this.prisma.vendor.findUnique({ where: { vendor_slug: vendorSlug } }),
            this.prisma.vendorAdminUser.findUnique({ where: { email: registration.email } })
        ])

        if (existingSlug) {
            throw { statusCode: 409, code: ERROR_CODES.CONFLICT, message: 'That store slug is already in use' }
        }
        if (existingAdmin) {
            throw { statusCode: 409, code: ERROR_CODES.CONFLICT, message: 'A vendor admin account already exists for that email' }
        }

        const passwordHash = await bcrypt.hash(password, 10)

        const result = await this.prisma.$transaction(async (tx) => {
            const vendor = await tx.vendor.create({
                data: {
                    legal_name: legalName,
                    trading_name: tradingName,
                    vendor_slug: vendorSlug,
                    status: 'TRIAL',
                    billing_plan_id: 'SELF_SERVICE_TRIAL',
                    billing_status: 'TRIAL',
                    billing_email: registration.email,
                    billing_start_date: new Date(),
                    monthly_billing_amount: 0,
                    contact_name: registration.first_name,
                    contact_surname: registration.last_name,
                    contact_phone: contactPhone,
                    onboarding_status: 'INCOMPLETE',
                    branding: {
                        create: {
                            primary_color: '#000000',
                            secondary_color: '#ffffff',
                            accent_color: '#3B82F6',
                            card_text_color: '#ffffff',
                            card_style: 'SOLID',
                            welcome_text: `Welcome to ${tradingName}`
                        }
                    },
                    branches: {
                        create: {
                            name: 'Main Branch',
                            is_active: true
                        }
                    },
                    programs: {
                        create: {
                            version: 1,
                            is_active: true,
                            stamps_required: 10,
                            reward_title: 'Free Reward',
                            reward_description: 'Collect 10 stamps to earn a reward.',
                            terms_text: 'Standard terms and conditions apply.'
                        }
                    }
                }
            })

            const vendorAdmin = await tx.vendorAdminUser.create({
                data: {
                    vendor_id: vendor.vendor_id,
                    email: registration.email,
                    password_hash: passwordHash,
                    first_name: registration.first_name,
                    last_name: registration.last_name,
                    role: 'OWNER',
                    status: 'ACTIVE',
                    email_verified_at: registration.verified_at
                }
            })

            await tx.vendorRegistration.update({
                where: { registration_id: registration.registration_id },
                data: {
                    status: 'COMPLETED',
                    completed_at: new Date(),
                    vendor_slug: vendor.vendor_slug
                }
            })

            await tx.adminAuditLog.create({
                data: {
                    actor_type: 'VENDOR_ADMIN',
                    actor_id: vendorAdmin.vendor_admin_id,
                    vendor_id: vendor.vendor_id,
                    action: 'VENDOR_SELF_SERVICE_REGISTER',
                    payload: {
                        email: vendorAdmin.email,
                        vendor_slug: vendor.vendor_slug,
                        registration_id: registration.registration_id
                    }
                }
            })

            return { vendor, vendorAdmin }
        })

        return result
    }

    async login(emailInput: unknown, passwordInput: unknown) {
        const email = normalizeEmail(emailInput)
        const password = normalizeText(passwordInput, 'password', 200)

        const vendorAdmin = await this.prisma.vendorAdminUser.findUnique({
            where: { email },
            include: { vendor: true }
        })

        if (!vendorAdmin || vendorAdmin.status !== 'ACTIVE') {
            throw { statusCode: 401, code: ERROR_CODES.UNAUTHORIZED, message: 'Invalid credentials' }
        }

        if (!['ACTIVE', 'TRIAL'].includes(vendorAdmin.vendor.status)) {
            throw { statusCode: 403, code: ERROR_CODES.VENDOR_SUSPENDED, message: 'Vendor account is suspended' }
        }

        const valid = await bcrypt.compare(password, vendorAdmin.password_hash)
        if (!valid) {
            throw { statusCode: 401, code: ERROR_CODES.UNAUTHORIZED, message: 'Invalid credentials' }
        }

        await this.prisma.vendorAdminUser.update({
            where: { vendor_admin_id: vendorAdmin.vendor_admin_id },
            data: { last_login_at: new Date() }
        })

        return {
            vendorAdmin,
            vendor: vendorAdmin.vendor
        }
    }

    async requestPasswordReset(identifierInput: unknown) {
        const email = normalizeEmail(identifierInput)
        const vendorAdmin = await this.prisma.vendorAdminUser.findUnique({ where: { email } })

        if (!vendorAdmin || vendorAdmin.status !== 'ACTIVE') {
            return { success: true }
        }

        const plainToken = crypto.randomBytes(32).toString('hex')
        const hashedToken = await bcrypt.hash(plainToken, 10)
        await this.prisma.vendorAdminUser.update({
            where: { vendor_admin_id: vendorAdmin.vendor_admin_id },
            data: {
                reset_token: hashedToken,
                reset_token_exp: new Date(Date.now() + RESET_TOKEN_TTL_MS)
            }
        })

        await this.emailService.sendVendorPasswordResetEmail(vendorAdmin.email, plainToken, vendorAdmin.first_name)
        return { success: true }
    }

    async resetPassword(token: unknown, passwordInput: unknown) {
        const plainToken = normalizeText(token, 'token', 200)
        const password = normalizeText(passwordInput, 'password', 200)
        if (password.length < 8) {
            throw { statusCode: 400, code: ERROR_CODES.VALIDATION_ERROR, message: 'Password must be at least 8 characters' }
        }

        const candidates = await this.prisma.vendorAdminUser.findMany({
            where: {
                reset_token: { not: null },
                reset_token_exp: { gt: new Date() },
                status: 'ACTIVE'
            }
        })

        let matched = null
        for (const candidate of candidates) {
            if (candidate.reset_token && await bcrypt.compare(plainToken, candidate.reset_token)) {
                matched = candidate
                break
            }
        }

        if (!matched) {
            throw { statusCode: 400, code: ERROR_CODES.VALIDATION_ERROR, message: 'Invalid or expired reset token' }
        }

        const passwordHash = await bcrypt.hash(password, 10)
        await this.prisma.vendorAdminUser.update({
            where: { vendor_admin_id: matched.vendor_admin_id },
            data: {
                password_hash: passwordHash,
                reset_token: null,
                reset_token_exp: null
            }
        })

        return { success: true }
    }
}
