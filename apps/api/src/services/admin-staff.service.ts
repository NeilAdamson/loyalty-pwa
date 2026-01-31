import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

export class AdminStaffService {
    constructor(private prisma: PrismaClient) { }

    async listByVendor(vendorId: string) {
        return this.prisma.staffUser.findMany({
            where: { vendor_id: vendorId },
            include: {
                _count: {
                    select: { stamp_txs: true, redeem_txs: true }
                },
                branch: true
            },
            orderBy: { created_at: 'desc' }
        })
    }

    async create(vendorId: string, data: {
        name: string,
        pin: string,
        role?: 'STAMPER' | 'ADMIN', // Default STAMPER
        branch_id?: string
    }) {
        // 1. Resolve Branch
        // If branch_id not provided, find default branch for vendor
        let branchId = data.branch_id
        if (!branchId) {
            const defaultBranch = await this.prisma.branch.findFirst({
                where: { vendor_id: vendorId }
            })
            if (!defaultBranch) {
                // Should not happen if vendor created correctly, but fallback?
                throw { statusCode: 400, message: 'Vendor has no branches. Create a branch first.' }
            }
            branchId = defaultBranch.branch_id
        }

        // 2. Hash PIN
        const pinHash = await bcrypt.hash(data.pin, 10)

        // 3. Create
        return this.prisma.staffUser.create({
            data: {
                vendor_id: vendorId,
                branch_id: branchId,
                name: data.name,
                pin_hash: pinHash,
                role: data.role || 'STAMPER',
                status: 'ENABLED'
            }
        })
    }

    async resetPin(vendorId: string, staffId: string, newPin: string) {
        // Verify staff belongs to vendor?
        // simple update with where
        const staff = await this.prisma.staffUser.findFirst({
            where: { staff_id: staffId, vendor_id: vendorId }
        })

        if (!staff) {
            throw { statusCode: 404, message: 'Staff member not found' }
        }

        const pinHash = await bcrypt.hash(newPin, 10)

        return this.prisma.staffUser.update({
            where: { staff_id: staffId },
            data: {
                pin_hash: pinHash,
                pin_last_changed_at: new Date()
            }
        })
    }
}
