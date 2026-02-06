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
        username: string,
        pin: string,
        role?: 'STAMPER' | 'ADMIN', // Default STAMPER
        branch_id?: string
    }) {
        const uname = (data.username || data.name || '').toString().toLowerCase().trim().replace(/[^a-z0-9_-]/g, '') || this.slugifyUsername(data.name)
        if (!uname) throw { statusCode: 400, message: 'Username required (e.g. alice, bob)' }

        const existing = await this.prisma.staffUser.findFirst({
            where: { vendor_id: vendorId, username: uname }
        })
        if (existing) throw { statusCode: 409, message: `Username "${uname}" is already in use` }

        let branchId = data.branch_id
        if (!branchId) {
            const defaultBranch = await this.prisma.branch.findFirst({
                where: { vendor_id: vendorId }
            })
            if (!defaultBranch) throw { statusCode: 400, message: 'Vendor has no branches. Create a branch first.' }
            branchId = defaultBranch.branch_id
        }

        const pinHash = await bcrypt.hash(data.pin, 10)

        return this.prisma.staffUser.create({
            data: {
                vendor_id: vendorId,
                branch_id: branchId,
                username: uname,
                name: data.name,
                pin_hash: pinHash,
                role: data.role || 'STAMPER',
                status: 'ENABLED'
            }
        })
    }

    private slugifyUsername(name: string): string {
        const base = name.toString().toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20)
        return base || 'staff'
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
