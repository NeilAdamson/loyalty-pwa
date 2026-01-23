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
            throw { statusCode: 401, code: ERROR_CODES.AUTH_INVALID, message: 'Invalid credentials' }
        }

        const valid = await bcrypt.compare(password, admin.password_hash)
        if (!valid) {
            throw { statusCode: 401, code: ERROR_CODES.AUTH_INVALID, message: 'Invalid credentials' }
        }

        // Return admin info to be encoded in JWT
        return {
            admin_id: admin.admin_id,
            email: admin.email,
            role: admin.role,
            name: admin.name
        }
    }

    async getById(adminId: string) {
        return this.prisma.adminUser.findUnique({
            where: { admin_id: adminId },
            select: { admin_id: true, email: true, role: true, name: true }
        })
    }
}
