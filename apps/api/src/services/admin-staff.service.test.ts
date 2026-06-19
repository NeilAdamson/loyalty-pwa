import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import { AdminStaffService } from './admin-staff.service'

function createMockPrisma() {
    return {
        staffUser: {
            findFirst: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
        },
        branch: {
            findFirst: vi.fn(),
        },
    }
}

describe('AdminStaffService branch validation', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('rejects foreign branch_id on create', async () => {
        const prisma = createMockPrisma()
        prisma.staffUser.findFirst.mockResolvedValue(null)
        prisma.branch.findFirst.mockResolvedValue(null)

        const svc = new AdminStaffService(prisma as unknown as PrismaClient)

        await expect(
            svc.create('vendor-a', {
                name: 'Alice',
                username: 'alice',
                pin: '1234',
                branch_id: 'foreign-branch',
            })
        ).rejects.toMatchObject({
            statusCode: 400,
            message: 'Branch not found for this vendor',
        })

        expect(prisma.staffUser.create).not.toHaveBeenCalled()
    })

    it('rejects foreign branch_id on update', async () => {
        const prisma = createMockPrisma()
        prisma.staffUser.findFirst.mockResolvedValue({
            staff_id: 'staff-1',
            vendor_id: 'vendor-a',
            name: 'Alice',
        })
        prisma.branch.findFirst.mockResolvedValue(null)

        const svc = new AdminStaffService(prisma as unknown as PrismaClient)

        await expect(
            svc.update('vendor-a', 'staff-1', { branch_id: 'foreign-branch' })
        ).rejects.toMatchObject({
            statusCode: 400,
            message: 'Branch not found for this vendor',
        })

        expect(prisma.staffUser.update).not.toHaveBeenCalled()
    })

    it('allows branch_id that belongs to the vendor on update', async () => {
        const prisma = createMockPrisma()
        prisma.staffUser.findFirst.mockResolvedValue({
            staff_id: 'staff-1',
            vendor_id: 'vendor-a',
            name: 'Alice',
        })
        prisma.branch.findFirst.mockResolvedValue({
            branch_id: 'branch-a',
            vendor_id: 'vendor-a',
        })
        prisma.staffUser.update.mockResolvedValue({
            staff_id: 'staff-1',
            branch_id: 'branch-a',
        })

        const svc = new AdminStaffService(prisma as unknown as PrismaClient)

        await expect(
            svc.update('vendor-a', 'staff-1', { branch_id: 'branch-a' })
        ).resolves.toMatchObject({ branch_id: 'branch-a' })

        expect(prisma.branch.findFirst).toHaveBeenCalledWith({
            where: { branch_id: 'branch-a', vendor_id: 'vendor-a' },
        })
        expect(prisma.staffUser.update).toHaveBeenCalled()
    })
})
