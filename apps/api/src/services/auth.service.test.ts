import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { ERROR_CODES } from '../plugins/errors'
import { AuthService } from './auth.service'

const TEST_OTP_PEPPER = 'test-otp-pepper-value-32chars'

function createMockPrisma() {
    const tx = {
        $queryRaw: vi.fn(),
        otpRequest: {
            update: vi.fn(),
            updateMany: vi.fn(),
        },
        member: {
            findUnique: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
        },
    }

    return {
        otpRequest: {
            findFirst: vi.fn(),
        },
        $transaction: vi.fn(async (fn: (client: typeof tx) => Promise<unknown>) => fn(tx)),
        _tx: tx,
    }
}

describe('AuthService.verifyMemberOtp', () => {
    beforeEach(() => {
        process.env.OTP_PEPPER = TEST_OTP_PEPPER
        vi.clearAllMocks()
    })

    it('returns member when OTP is valid and atomically consumed', async () => {
        const prisma = createMockPrisma()
        const otpHash = await bcrypt.hash('123456' + TEST_OTP_PEPPER, 4)
        const member = {
            member_id: 'member-1',
            vendor_id: 'vendor-1',
            phone_e164: '+27820000001',
            consent_marketing: false,
        }

        prisma.otpRequest.findFirst.mockResolvedValue({
            otp_id: 'otp-1',
            otp_hash: otpHash,
            attempts: 0,
            expires_at: new Date(Date.now() + 60_000),
            consumed_at: null,
        })
        prisma._tx.$queryRaw.mockResolvedValue([
            {
                otp_id: 'otp-1',
                otp_hash: otpHash,
                attempts: 0,
                expires_at: new Date(Date.now() + 60_000),
                consumed_at: null,
            },
        ])
        prisma._tx.otpRequest.updateMany.mockResolvedValue({ count: 1 })
        prisma._tx.member.findUnique.mockResolvedValue(member)

        const svc = new AuthService(
            prisma as unknown as PrismaClient,
            { sendOtp: vi.fn(), isConfigured: () => true },
            { assertOtpRequestAllowed: vi.fn() } as never
        )

        await expect(svc.verifyMemberOtp('vendor-1', '+27820000001', '123456')).resolves.toEqual(member)

        expect(prisma._tx.otpRequest.updateMany).toHaveBeenCalledWith({
            where: {
                otp_id: 'otp-1',
                consumed_at: null,
                expires_at: { gt: expect.any(Date) },
                attempts: { lt: 5 },
            },
            data: { consumed_at: expect.any(Date) },
        })
    })

    it('rejects when no unconsumed OTP exists', async () => {
        const prisma = createMockPrisma()
        prisma.otpRequest.findFirst.mockResolvedValue(null)

        const svc = new AuthService(
            prisma as unknown as PrismaClient,
            { sendOtp: vi.fn(), isConfigured: () => true },
            { assertOtpRequestAllowed: vi.fn() } as never
        )

        await expect(svc.verifyMemberOtp('vendor-1', '+27820000001', '123456')).rejects.toMatchObject({
            statusCode: 400,
            code: ERROR_CODES.OTP_INVALID,
        })
        expect(prisma.$transaction).not.toHaveBeenCalled()
    })

    it('rejects when atomic consume loses the race', async () => {
        const prisma = createMockPrisma()
        const otpHash = await bcrypt.hash('123456' + TEST_OTP_PEPPER, 4)

        prisma.otpRequest.findFirst.mockResolvedValue({
            otp_id: 'otp-1',
            otp_hash: otpHash,
            attempts: 0,
            expires_at: new Date(Date.now() + 60_000),
            consumed_at: null,
        })
        prisma._tx.$queryRaw.mockResolvedValue([
            {
                otp_id: 'otp-1',
                otp_hash: otpHash,
                attempts: 0,
                expires_at: new Date(Date.now() + 60_000),
                consumed_at: null,
            },
        ])
        prisma._tx.otpRequest.updateMany.mockResolvedValue({ count: 0 })

        const svc = new AuthService(
            prisma as unknown as PrismaClient,
            { sendOtp: vi.fn(), isConfigured: () => true },
            { assertOtpRequestAllowed: vi.fn() } as never
        )

        await expect(svc.verifyMemberOtp('vendor-1', '+27820000001', '123456')).rejects.toMatchObject({
            statusCode: 400,
            code: ERROR_CODES.OTP_INVALID,
            message: 'Invalid or expired OTP',
        })
        expect(prisma._tx.member.findUnique).not.toHaveBeenCalled()
    })

    it('rejects when locked OTP row is already consumed', async () => {
        const prisma = createMockPrisma()
        const otpHash = await bcrypt.hash('123456' + TEST_OTP_PEPPER, 4)

        prisma.otpRequest.findFirst.mockResolvedValue({
            otp_id: 'otp-1',
            otp_hash: otpHash,
            attempts: 0,
            expires_at: new Date(Date.now() + 60_000),
            consumed_at: null,
        })
        prisma._tx.$queryRaw.mockResolvedValue([
            {
                otp_id: 'otp-1',
                otp_hash: otpHash,
                attempts: 0,
                expires_at: new Date(Date.now() + 60_000),
                consumed_at: new Date(),
            },
        ])

        const svc = new AuthService(
            prisma as unknown as PrismaClient,
            { sendOtp: vi.fn(), isConfigured: () => true },
            { assertOtpRequestAllowed: vi.fn() } as never
        )

        await expect(svc.verifyMemberOtp('vendor-1', '+27820000001', '123456')).rejects.toMatchObject({
            statusCode: 400,
            code: ERROR_CODES.OTP_INVALID,
        })
        expect(prisma._tx.otpRequest.updateMany).not.toHaveBeenCalled()
    })

    it('allows only one success across concurrent verify calls', async () => {
        const prisma = createMockPrisma()
        const otpHash = await bcrypt.hash('123456' + TEST_OTP_PEPPER, 4)
        const member = {
            member_id: 'member-1',
            vendor_id: 'vendor-1',
            phone_e164: '+27820000001',
            consent_marketing: false,
        }

        prisma.otpRequest.findFirst.mockResolvedValue({
            otp_id: 'otp-1',
            otp_hash: otpHash,
            attempts: 0,
            expires_at: new Date(Date.now() + 60_000),
            consumed_at: null,
        })

        let consumeCalls = 0
        prisma._tx.$queryRaw.mockImplementation(async () => {
            if (consumeCalls === 0) {
                return [
                    {
                        otp_id: 'otp-1',
                        otp_hash: otpHash,
                        attempts: 0,
                        expires_at: new Date(Date.now() + 60_000),
                        consumed_at: null,
                    },
                ]
            }
            return [
                {
                    otp_id: 'otp-1',
                    otp_hash: otpHash,
                    attempts: 0,
                    expires_at: new Date(Date.now() + 60_000),
                    consumed_at: new Date(),
                },
            ]
        })
        prisma._tx.otpRequest.updateMany.mockImplementation(async () => {
            consumeCalls += 1
            return { count: consumeCalls === 1 ? 1 : 0 }
        })
        prisma._tx.member.findUnique.mockResolvedValue(member)

        const svc = new AuthService(
            prisma as unknown as PrismaClient,
            { sendOtp: vi.fn(), isConfigured: () => true },
            { assertOtpRequestAllowed: vi.fn() } as never
        )

        const results = await Promise.allSettled([
            svc.verifyMemberOtp('vendor-1', '+27820000001', '123456'),
            svc.verifyMemberOtp('vendor-1', '+27820000001', '123456'),
        ])

        const fulfilled = results.filter((r) => r.status === 'fulfilled')
        const rejected = results.filter((r) => r.status === 'rejected')

        expect(fulfilled).toHaveLength(1)
        expect(rejected).toHaveLength(1)
        expect((rejected[0] as PromiseRejectedResult).reason).toMatchObject({
            statusCode: 400,
            code: ERROR_CODES.OTP_INVALID,
        })
    })

    it('sets branch_joined_id when creating a new member', async () => {
        const prisma = createMockPrisma()
        const otpHash = await bcrypt.hash('123456' + TEST_OTP_PEPPER, 4)
        const newMember = {
            member_id: 'member-new',
            vendor_id: 'vendor-1',
            phone_e164: '+27820000002',
            consent_marketing: false,
            branch_joined_id: 'branch-1',
        }

        prisma.otpRequest.findFirst.mockResolvedValue({
            otp_id: 'otp-2',
            otp_hash: otpHash,
            attempts: 0,
            expires_at: new Date(Date.now() + 60_000),
            consumed_at: null,
        })
        prisma._tx.$queryRaw.mockResolvedValue([
            {
                otp_id: 'otp-2',
                otp_hash: otpHash,
                attempts: 0,
                expires_at: new Date(Date.now() + 60_000),
                consumed_at: null,
            },
        ])
        prisma._tx.otpRequest.updateMany.mockResolvedValue({ count: 1 })
        prisma._tx.member.findUnique.mockResolvedValue(null)
        prisma._tx.member.create.mockResolvedValue(newMember)

        const svc = new AuthService(
            prisma as unknown as PrismaClient,
            { sendOtp: vi.fn(), isConfigured: () => true },
            { assertOtpRequestAllowed: vi.fn() } as never
        )

        await expect(
            svc.verifyMemberOtp('vendor-1', '+27820000002', '123456', false, 'branch-1')
        ).resolves.toEqual(newMember)

        expect(prisma._tx.member.create).toHaveBeenCalledWith({
            data: {
                vendor_id: 'vendor-1',
                phone_e164: '+27820000002',
                name: 'New Member',
                consent_marketing: false,
                branch_joined_id: 'branch-1',
            },
        })
    })
})
