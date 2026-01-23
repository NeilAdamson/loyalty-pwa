import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    const email = 'admin@loyalty.com'
    const password = 'password123'
    const hash = await bcrypt.hash(password, 10)

    const admin = await prisma.adminUser.upsert({
        where: { email },
        update: {
            password_hash: hash,
            role: 'SUPER_ADMIN'
        },
        create: {
            email,
            password_hash: hash,
            name: 'Super Admin',
            role: 'SUPER_ADMIN'
        }
    })

    console.log(`Admin user seeded: ${admin.email}`)
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
