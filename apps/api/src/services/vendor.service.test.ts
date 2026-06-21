import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import { VendorService } from './vendor.service'
import { ERROR_CODES } from '../plugins/errors'

const vendorId = '550e8400-e29b-41d4-a716-446655440000'

function createVendor(overrides: Record<string, unknown> = {}) {
    return {
        vendor_id: vendorId,
        vendor_slug: 'demo-cafe',
        legal_name: 'Demo Cafe Pty Ltd',
        trading_name: 'Demo Cafe',
        status: 'ACTIVE',
        signup_secret_version: 1,
        branding: {
            logo_url: 'https://example.test/logo.png',
            primary_color: '#111111',
            secondary_color: '#ffffff',
            accent_color: '#3B82F6',
            background_color: '#18181b',
            card_style: 'SOLID',
            card_bg_image_url: null,
            wordmark_url: null,
            welcome_text: 'Welcome',
            card_title: null,
        },
        ...overrides,
    }
}

function createMockPrisma() {
    return {
        vendor: {
            findUnique: vi.fn(),
        },
        program: {
            findFirst: vi.fn(),
        },
    }
}

describe('VendorService.resolveBySlug', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('returns ACTIVE vendors', async () => {
        const prisma = createMockPrisma()
        prisma.vendor.findUnique.mockResolvedValue(createVendor({ status: 'ACTIVE' }))
        const svc = new VendorService(prisma as unknown as PrismaClient)

        await expect(svc.resolveBySlug('demo-cafe')).resolves.toMatchObject({
            vendor_slug: 'demo-cafe',
            status: 'ACTIVE',
        })
    })

    it('returns TRIAL vendors', async () => {
        const prisma = createMockPrisma()
        prisma.vendor.findUnique.mockResolvedValue(createVendor({ status: 'TRIAL' }))
        const svc = new VendorService(prisma as unknown as PrismaClient)

        await expect(svc.resolveBySlug('demo-cafe')).resolves.toMatchObject({
            status: 'TRIAL',
        })
    })

    it('rejects missing vendors with 404', async () => {
        const prisma = createMockPrisma()
        prisma.vendor.findUnique.mockResolvedValue(null)
        const svc = new VendorService(prisma as unknown as PrismaClient)

        await expect(svc.resolveBySlug('missing')).rejects.toMatchObject({
            statusCode: 404,
            code: ERROR_CODES.NOT_FOUND,
        })
    })

    it('rejects SUSPENDED vendors with 403', async () => {
        const prisma = createMockPrisma()
        prisma.vendor.findUnique.mockResolvedValue(createVendor({ status: 'SUSPENDED' }))
        const svc = new VendorService(prisma as unknown as PrismaClient)

        await expect(svc.resolveBySlug('demo-cafe')).rejects.toMatchObject({
            statusCode: 403,
            code: ERROR_CODES.VENDOR_SUSPENDED,
        })
    })
})

describe('VendorService.mapPublicProfileError', () => {
    it('maps suspended vendors to 404 for public profile', () => {
        const svc = new VendorService({} as PrismaClient)
        expect(
            svc.mapPublicProfileError({
                statusCode: 403,
                code: ERROR_CODES.VENDOR_SUSPENDED,
                message: 'Vendor account is suspended',
            })
        ).toEqual({
            statusCode: 404,
            code: ERROR_CODES.NOT_FOUND,
            message: 'Vendor not found',
        })
    })

    it('passes through other resolveBySlug errors', () => {
        const svc = new VendorService({} as PrismaClient)
        expect(
            svc.mapPublicProfileError({
                statusCode: 404,
                code: ERROR_CODES.NOT_FOUND,
                message: 'Vendor not found',
            })
        ).toEqual({
            statusCode: 404,
            code: ERROR_CODES.NOT_FOUND,
            message: 'Vendor not found',
        })
    })
})

describe('VendorService.getPublicProfile', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('returns branding and signup metadata for TRIAL vendors', async () => {
        const prisma = createMockPrisma()
        const trialVendor = createVendor({ status: 'TRIAL' })
        prisma.vendor.findUnique
            .mockResolvedValueOnce(trialVendor)
            .mockResolvedValueOnce(trialVendor)
        prisma.program.findFirst.mockResolvedValue({
            stamps_required: 10,
            reward_title: 'Free Coffee',
            reward_description: 'Collect 10 stamps',
            terms_text: 'Terms apply',
        })

        const svc = new VendorService(prisma as unknown as PrismaClient)
        const profile = await svc.getPublicProfile('demo-cafe')

        expect(profile).toMatchObject({
            trading_name: 'Demo Cafe',
            status: 'TRIAL',
            signup: {
                requires_signed_url: true,
                secret_version: 1,
            },
            branding: {
                primary_color: '#111111',
                logo_url: 'https://example.test/logo.png',
            },
            active_program: {
                reward_title: 'Free Coffee',
            },
        })
    })

    it('returns public profile for ACTIVE vendors unchanged', async () => {
        const prisma = createMockPrisma()
        const activeVendor = createVendor({ status: 'ACTIVE' })
        prisma.vendor.findUnique
            .mockResolvedValueOnce(activeVendor)
            .mockResolvedValueOnce(activeVendor)
        prisma.program.findFirst.mockResolvedValue(null)

        const svc = new VendorService(prisma as unknown as PrismaClient)
        const profile = await svc.getPublicProfile('demo-cafe')

        expect(profile.status).toBe('ACTIVE')
        expect(profile.active_program).toBeNull()
    })

    it('rejects SUSPENDED vendors before loading branding', async () => {
        const prisma = createMockPrisma()
        prisma.vendor.findUnique.mockResolvedValue(createVendor({ status: 'SUSPENDED' }))
        const svc = new VendorService(prisma as unknown as PrismaClient)

        await expect(svc.getPublicProfile('demo-cafe')).rejects.toMatchObject({
            statusCode: 403,
            code: ERROR_CODES.VENDOR_SUSPENDED,
        })
        expect(prisma.program.findFirst).not.toHaveBeenCalled()
    })
})
