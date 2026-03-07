import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { ERROR_CODES } from '../plugins/errors'

export class AdminService {
    constructor(private prisma: PrismaClient) { }

    async login(email: string, password: string) {
        const admin = await this.prisma.adminUser.findUnique({
            where: { email }
        })

        if (!admin) {
            console.log(`[AdminService] Admin not found: ${email}`)
            throw { statusCode: 401, code: ERROR_CODES.UNAUTHORIZED, message: 'Invalid credentials' }
        }

        if (admin.status !== 'ACTIVE') {
            console.log(`[AdminService] Admin account is ${admin.status}, not ACTIVE`)
            throw { statusCode: 403, code: ERROR_CODES.UNAUTHORIZED, message: 'Account is disabled' }
        }

        const valid = await bcrypt.compare(password, admin.password_hash)
        if (!valid) {
            console.log(`[AdminService] Password mismatch for ${email}`)
            throw { statusCode: 401, code: ERROR_CODES.UNAUTHORIZED, message: 'Invalid credentials' }
        }

        // Update last login timestamp
        await this.prisma.adminUser.update({
            where: { admin_id: admin.admin_id },
            data: { last_login_at: new Date() }
        })

        console.log(`[AdminService] Login successful for ${email}`)
        // Return admin info to be encoded in JWT
        return {
            admin_id: admin.admin_id,
            username: admin.username,
            email: admin.email,
            role: admin.role,
            first_name: admin.first_name,
            last_name: admin.last_name,
            name: `${admin.first_name} ${admin.last_name}` // Computed for backward compat
        }
    }

    async getById(adminId: string) {
        const admin = await this.prisma.adminUser.findUnique({
            where: { admin_id: adminId },
            select: {
                admin_id: true,
                username: true,
                email: true,
                role: true,
                first_name: true,
                last_name: true
            }
        })
        if (!admin) return null
        return {
            ...admin,
            name: `${admin.first_name} ${admin.last_name}` // Computed for backward compat
        }
    }
}
