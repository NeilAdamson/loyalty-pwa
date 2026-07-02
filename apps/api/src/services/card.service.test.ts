import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import { CardService } from './card.service'
import { ERROR_CODES } from '../plugins/errors'

function createMockPrisma() {
    return {
        program: {
            findFirst: vi.fn(),
        },
        cardInstance: {
            findFirst: vi.fn(),
            create: vi.fn(),
        },
        member: {
            findFirst: vi.fn(),
        },
    }
}

describe('CardService member validation', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('rejects card creation when member belongs to another vendor', async () => {
        const prisma = createMockPrisma()
        prisma.program.findFirst.mockResolvedValue({
            program_id: 'program-a',
            vendor_id: 'vendor-a',
            is_active: true,
            stamps_required: 10,
        })
        prisma.cardInstance.findFirst.mockResolvedValue(null)
        prisma.member.findFirst.mockResolvedValue(null)

        const svc = new CardService(prisma as unknown as PrismaClient)

        await expect(svc.getOrCreateActiveCard('vendor-a', 'member-b')).rejects.toMatchObject({
            statusCode: 404,
            code: ERROR_CODES.NOT_FOUND,
            message: 'Member not found for this vendor',
        })

        expect(prisma.cardInstance.create).not.toHaveBeenCalled()
    })

    it('creates card when member belongs to the vendor', async () => {
        const prisma = createMockPrisma()
        const program = {
            program_id: 'program-a',
            vendor_id: 'vendor-a',
            is_active: true,
            stamps_required: 10,
        }
        prisma.program.findFirst.mockResolvedValue(program)
        prisma.cardInstance.findFirst.mockResolvedValue(null)
        prisma.member.findFirst.mockResolvedValue({
            member_id: 'member-a',
            vendor_id: 'vendor-a',
        })
        prisma.cardInstance.create.mockResolvedValue({
            card_id: 'card-a',
            vendor_id: 'vendor-a',
            member_id: 'member-a',
            program_id: 'program-a',
            status: 'ACTIVE',
            stamps_count: 0,
            program,
        })

        const svc = new CardService(prisma as unknown as PrismaClient)

        await expect(svc.getOrCreateActiveCard('vendor-a', 'member-a')).resolves.toMatchObject({
            card_id: 'card-a',
        })

        expect(prisma.member.findFirst).toHaveBeenCalledWith({
            where: { member_id: 'member-a', vendor_id: 'vendor-a' },
        })
        expect(prisma.cardInstance.create).toHaveBeenCalled()
    })
})
