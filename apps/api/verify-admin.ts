import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    const email = process.env.ADMIN_EMAIL || 'admin@punchcard.co.za'
    const password = process.env.ADMIN_PASSWORD || 'password1234'

    console.log(`Checking for admin user: ${email}...`)
    const admin = await prisma.adminUser.findUnique({ where: { email } })

    if (!admin) {
        console.error(`Admin user NOT FOUND: ${email}`)
        // Also check for old admin email
        const oldAdmin = await prisma.adminUser.findUnique({ where: { email: 'admin@loyalty.com' } })
        if (oldAdmin) {
            console.log('Found old admin user: admin@loyalty.com (needs migration)')
        }
        return
    }

    console.log(`Admin found: ${admin.admin_id}, Role: ${admin.role}`)
    console.log(`Hash in DB: ${admin.password_hash}`)

    const valid = await bcrypt.compare(password, admin.password_hash)
    console.log(`Password '${password}' valid? ${valid}`)
}

main()
    .catch((e) => {
        console.error(e)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
