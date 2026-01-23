import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    const email = 'admin@loyalty.com'
    const password = 'password123'

    console.log('Checking for admin user...')
    const admin = await prisma.adminUser.findUnique({ where: { email } })

    if (!admin) {
        console.error('Admin user NOT FOUND')
        return
    }

    console.log(`Admin found: ${admin.admin_id}, Role: ${admin.role}`)
    console.log(`Hash in DB: ${admin.password_hash}`)

    const valid = await bcrypt.compare(password, admin.password_hash)
    console.log(`Password 'password123' valid? ${valid}`)
}

main()
    .catch((e) => {
        console.error(e)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
