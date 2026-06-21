import { PrismaClient } from '@prisma/client'
import { ERROR_CODES } from '../plugins/errors'
import { getPublicAppUrl } from '../utils/public-app-url'
import {
    generateSignupSecret,
    parseSignupTokenQuery,
    signSignupToken,
    SignupTokenInput,
    verifySignupToken,
} from '../utils/signup-token'

export type SignupQrAsset = {
    scope: 'vendor' | 'branch'
    branch_id: string | null
    branch_name: string | null
    signup_url: string
    label: string
}

export type SignupQrAssetsResponse = {
    vendor_id: string
    vendor_slug: string
    trading_name: string
    requires_signed_url: boolean
    secret_version: number
    last_rotated_at: string | null
    branding: {
        logo_url: string | null
        wordmark_url: string | null
        welcome_text: string | null
        primary_color: string
        secondary_color: string
        accent_color: string
    } | null
    active_program: {
        stamps_required: number
        reward_title: string
        reward_description: string
        terms_text: string
    } | null
    assets: SignupQrAsset[]
}

function appError(statusCode: number, code: string, message: string) {
    return { statusCode, code, message }
}

export class SignupQrService {
    constructor(private prisma: PrismaClient) {}

    requiresSignedUrl(version: number): boolean {
        return version >= 1
    }

    buildSignupUrl(
        vendorSlug: string,
        secret: string | null,
        vendorId: string,
        version: number,
        branchId?: string | null
    ): string {
        const base = getPublicAppUrl()
        const path = `${base}/v/${vendorSlug}/login`
        if (!secret || version < 1) {
            if (branchId) {
                return `${path}?b=${encodeURIComponent(branchId)}`
            }
            return path
        }
        const sig = signSignupToken(secret, vendorId, version, branchId)
        const params = new URLSearchParams({
            v: String(version),
            s: sig,
        })
        if (branchId) {
            params.set('b', branchId)
        }
        return `${path}?${params.toString()}`
    }

    async getAssets(vendorId: string): Promise<SignupQrAssetsResponse> {
        const vendor = await this.prisma.vendor.findUnique({
            where: { vendor_id: vendorId },
            include: {
                branding: true,
                branches: {
                    where: { is_active: true },
                    orderBy: { branch_id: 'asc' },
                },
            },
        })

        if (!vendor) {
            throw appError(404, ERROR_CODES.NOT_FOUND, 'Vendor not found')
        }

        const activeProgram = await this.prisma.program.findFirst({
            where: { vendor_id: vendorId, is_active: true },
            select: {
                stamps_required: true,
                reward_title: true,
                reward_description: true,
                terms_text: true,
            },
        })

        const version = vendor.signup_secret_version
        const secret = vendor.signup_secret

        const assets: SignupQrAsset[] = [
            {
                scope: 'vendor',
                branch_id: null,
                branch_name: null,
                label: 'All locations',
                signup_url: this.buildSignupUrl(
                    vendor.vendor_slug,
                    secret,
                    vendor.vendor_id,
                    version
                ),
            },
            ...vendor.branches.map((branch) => ({
                scope: 'branch' as const,
                branch_id: branch.branch_id,
                branch_name: branch.name,
                label: branch.name,
                signup_url: this.buildSignupUrl(
                    vendor.vendor_slug,
                    secret,
                    vendor.vendor_id,
                    version,
                    branch.branch_id
                ),
            })),
        ]

        return {
            vendor_id: vendor.vendor_id,
            vendor_slug: vendor.vendor_slug,
            trading_name: vendor.trading_name,
            requires_signed_url: this.requiresSignedUrl(version),
            secret_version: version,
            last_rotated_at: vendor.signup_secret_rotated_at?.toISOString() ?? null,
            branding: vendor.branding
                ? {
                      logo_url: vendor.branding.logo_url,
                      wordmark_url: vendor.branding.wordmark_url,
                      welcome_text: vendor.branding.welcome_text,
                      primary_color: vendor.branding.primary_color,
                      secondary_color: vendor.branding.secondary_color,
                      accent_color: vendor.branding.accent_color ?? '#3B82F6',
                  }
                : null,
            active_program: activeProgram,
            assets,
        }
    }

    async rotateSecret(vendorId: string): Promise<{
        secret_version: number
        last_rotated_at: string
        requires_signed_url: boolean
    }> {
        const vendor = await this.prisma.vendor.findUnique({
            where: { vendor_id: vendorId },
            select: {
                signup_secret_version: true,
            },
        })

        if (!vendor) {
            throw appError(404, ERROR_CODES.NOT_FOUND, 'Vendor not found')
        }

        const nextVersion = Math.max(vendor.signup_secret_version, 0) + 1
        const now = new Date()

        const updated = await this.prisma.vendor.update({
            where: { vendor_id: vendorId },
            data: {
                signup_secret: generateSignupSecret(),
                signup_secret_version: nextVersion,
                signup_secret_rotated_at: now,
            },
            select: {
                signup_secret_version: true,
                signup_secret_rotated_at: true,
            },
        })

        return {
            secret_version: updated.signup_secret_version,
            last_rotated_at: updated.signup_secret_rotated_at!.toISOString(),
            requires_signed_url: this.requiresSignedUrl(updated.signup_secret_version),
        }
    }

    async validateSignupAccess(
        vendorId: string,
        tokenInput: SignupTokenInput
    ): Promise<{ branchId: string | null }> {
        const vendor = await this.prisma.vendor.findUnique({
            where: { vendor_id: vendorId },
            select: {
                signup_secret: true,
                signup_secret_version: true,
            },
        })

        if (!vendor) {
            throw appError(404, ERROR_CODES.NOT_FOUND, 'Vendor not found')
        }

        const { version, sig, branchId } = parseSignupTokenQuery(tokenInput)

        if (!this.requiresSignedUrl(vendor.signup_secret_version)) {
            if (branchId) {
                await this.assertActiveBranch(vendorId, branchId)
            }
            return { branchId }
        }

        if (version === null || !sig || version !== vendor.signup_secret_version) {
            throw appError(
                403,
                ERROR_CODES.SIGNUP_QR_INVALID,
                'This QR code is no longer valid. Ask staff for a new signup poster.'
            )
        }

        if (!vendor.signup_secret) {
            throw appError(
                403,
                ERROR_CODES.SIGNUP_QR_INVALID,
                'Signup QR is not configured for this vendor.'
            )
        }

        if (!verifySignupToken(vendor.signup_secret, vendorId, version, branchId, sig)) {
            throw appError(
                403,
                ERROR_CODES.SIGNUP_QR_INVALID,
                'This QR code is no longer valid. Ask staff for a new signup poster.'
            )
        }

        if (branchId) {
            await this.assertActiveBranch(vendorId, branchId)
        }

        return { branchId }
    }

    async assertActiveBranch(vendorId: string, branchId: string): Promise<void> {
        const branch = await this.prisma.branch.findFirst({
            where: {
                vendor_id: vendorId,
                branch_id: branchId,
                is_active: true,
            },
            select: { branch_id: true },
        })

        if (!branch) {
            throw appError(400, ERROR_CODES.VALIDATION_ERROR, 'Invalid branch for this vendor')
        }
    }
}
