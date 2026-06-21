import { PrismaClient } from '@prisma/client'
import { ERROR_CODES } from '../plugins/errors'

type RouteError = {
    statusCode: number
    code: string
    message: string
}

export class VendorService {
    constructor(private prisma: PrismaClient) { }

    async resolveBySlug(slug: string) {
        const vendor = await this.prisma.vendor.findUnique({
            where: { vendor_slug: slug },
        })

        if (!vendor) {
            throw {
                statusCode: 404,
                code: ERROR_CODES.NOT_FOUND,
                message: 'Vendor not found',
            }
        }

        if (vendor.status !== 'ACTIVE' && vendor.status !== 'TRIAL') {
            throw {
                statusCode: 403,
                code: ERROR_CODES.VENDOR_SUSPENDED,
                message: 'Vendor account is suspended',
            }
        }

        return vendor
    }

    /** Maps resolveBySlug errors for GET /v/:vendorSlug/public (hide suspended tenants). */
    mapPublicProfileError(err: unknown): RouteError {
        const e = err as Partial<RouteError>
        if (e.statusCode === 403 && e.code === ERROR_CODES.VENDOR_SUSPENDED) {
            return {
                statusCode: 404,
                code: ERROR_CODES.NOT_FOUND,
                message: 'Vendor not found',
            }
        }
        return {
            statusCode: typeof e.statusCode === 'number' ? e.statusCode : 500,
            code: typeof e.code === 'string' ? e.code : ERROR_CODES.INTERNAL_SERVER_ERROR,
            message: typeof e.message === 'string' ? e.message : 'Unexpected error',
        }
    }

    async getPublicProfile(slug: string) {
        const baseVendor = await this.resolveBySlug(slug)

        const vendor = await this.prisma.vendor.findUnique({
            where: { vendor_id: baseVendor.vendor_id },
            include: { branding: true },
        })

        if (!vendor) {
            throw {
                statusCode: 404,
                code: ERROR_CODES.NOT_FOUND,
                message: 'Vendor not found',
            }
        }

        const activeProgram = await this.prisma.program.findFirst({
            where: { vendor_id: vendor.vendor_id, is_active: true },
            select: {
                stamps_required: true,
                reward_title: true,
                reward_description: true,
                terms_text: true,
            },
        })

        return {
            legal_name: vendor.legal_name,
            trading_name: vendor.trading_name,
            status: vendor.status,
            signup: {
                requires_signed_url: vendor.signup_secret_version >= 1,
                secret_version: vendor.signup_secret_version,
            },
            branding: vendor.branding
                ? {
                      logo_url: vendor.branding.logo_url,
                      primary_color: vendor.branding.primary_color,
                      secondary_color: vendor.branding.secondary_color,
                      accent_color: vendor.branding.accent_color,
                      background_color: vendor.branding.background_color,
                      card_style: vendor.branding.card_style,
                      card_bg_image_url: vendor.branding.card_bg_image_url,
                      wordmark_url: vendor.branding.wordmark_url,
                      welcome_text: vendor.branding.welcome_text,
                      card_title: vendor.branding.card_title,
                  }
                : null,
            active_program: activeProgram,
        }
    }
}
