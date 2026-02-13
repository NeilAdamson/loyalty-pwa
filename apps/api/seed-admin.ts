import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    const email = process.env.ADMIN_EMAIL || 'admin@punchcard.co.za'
    const password = process.env.ADMIN_PASSWORD || 'password1234'
    const hash = await bcrypt.hash(password, 10)

    // List of old admin emails to migrate from
    const oldAdminEmails = ['admin@loyalty.com', 'admin@loyaltyladies.com']
    
    // Check if new admin already exists
    const newAdmin = await prisma.adminUser.findUnique({
        where: { email }
    })
    
    // Check for old admin emails that need migration
    let oldAdminToMigrate = null
    let oldAdminEmail = null
    
    for (const oldEmail of oldAdminEmails) {
        if (oldEmail !== email) {
            const found = await prisma.adminUser.findUnique({
                where: { email: oldEmail }
            })
            if (found) {
                oldAdminToMigrate = found
                oldAdminEmail = oldEmail
                break
            }
        }
    }
    
    // Handle migration: if old admin exists and we're migrating to a new email
    if (oldAdminToMigrate && email !== oldAdminEmail) {
        if (newAdmin) {
            // Both exist - delete old one and update new one
            console.log(`Both admin emails exist. Deleting old admin (${oldAdminEmail}) and updating new admin (${email})`)
            await prisma.adminUser.delete({
                where: { email: oldAdminEmail }
            })
            const admin = await prisma.adminUser.update({
                where: { email },
                data: {
                    password_hash: hash,
                    name: 'Super Admin',
                    role: 'SUPER_ADMIN',
                    status: 'ACTIVE'
                }
            })
            console.log(`Admin updated: ${admin.email}`)
        } else {
            // Only old exists - migrate it to new email
            console.log(`Migrating admin from ${oldAdminEmail} to ${email}`)
            await prisma.adminUser.update({
                where: { email: oldAdminEmail },
                data: {
                    email,
                    password_hash: hash,
                    name: 'Super Admin',
                    role: 'SUPER_ADMIN',
                    status: 'ACTIVE'
                }
            })
            console.log(`Admin migrated to: ${email}`)
        }
    } else {
        const admin = await prisma.adminUser.upsert({
            where: { email },
            update: {
                password_hash: hash,
                name: 'Super Admin',
                role: 'SUPER_ADMIN',
                status: 'ACTIVE'
            },
            create: {
                email,
                password_hash: hash,
                name: 'Super Admin',
                role: 'SUPER_ADMIN',
                status: 'ACTIVE'
            }
        })
        console.log(`Admin user seeded: ${admin.email}`)
    }
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
