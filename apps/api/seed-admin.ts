import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const ADMIN_EMAIL_DOMAIN = 'punchcard.co.za'

async function main() {
    const adminUsername = 'admin'
    const email = `${adminUsername}@${ADMIN_EMAIL_DOMAIN}`
    const password = process.env.ADMIN_PASSWORD || 'password1234'
    const hash = await bcrypt.hash(password, 10)

    // List of old admin emails to migrate from
    const oldAdminEmails = ['admin@loyalty.com', 'admin@loyaltyladies.com']
    
    // Check if new admin already exists (by email or username)
    const newAdmin = await prisma.adminUser.findFirst({
        where: {
            OR: [
                { email },
                { username: adminUsername }
            ]
        }
    })
    
    // Check for old admin emails that need migration
    let oldAdminToMigrate = null
    let oldAdminEmailValue = null
    
    for (const oldEmail of oldAdminEmails) {
        if (oldEmail !== email) {
            const found = await prisma.adminUser.findUnique({
                where: { email: oldEmail }
            })
            if (found) {
                oldAdminToMigrate = found
                oldAdminEmailValue = oldEmail
                break
            }
        }
    }
    
    // Handle migration: if old admin exists and we're migrating to a new email
    if (oldAdminToMigrate && email !== oldAdminEmailValue) {
        if (newAdmin) {
            console.log(`Both admin emails exist. Deleting old admin (${oldAdminEmailValue}) and updating new admin (${email})`)
            await prisma.adminUser.delete({
                where: { email: oldAdminEmailValue! }
            })
            const admin = await prisma.adminUser.update({
                where: { admin_id: newAdmin.admin_id },
                data: {
                    username: adminUsername,
                    email,
                    password_hash: hash,
                    first_name: 'Super',
                    last_name: 'Admin',
                    role: 'SUPER_ADMIN',
                    status: 'ACTIVE'
                }
            })
            console.log(`Admin updated: ${admin.email}`)
        } else {
            console.log(`Migrating admin from ${oldAdminEmailValue} to ${email}`)
            await prisma.adminUser.update({
                where: { email: oldAdminEmailValue! },
                data: {
                    username: adminUsername,
                    email,
                    password_hash: hash,
                    first_name: 'Super',
                    last_name: 'Admin',
                    role: 'SUPER_ADMIN',
                    status: 'ACTIVE'
                }
            })
            console.log(`Admin migrated to: ${email}`)
        }
    } else if (newAdmin) {
        const admin = await prisma.adminUser.update({
            where: { admin_id: newAdmin.admin_id },
            data: {
                password_hash: hash,
                first_name: 'Super',
                last_name: 'Admin',
                role: 'SUPER_ADMIN',
                status: 'ACTIVE'
            }
        })
        console.log(`Admin user updated: ${admin.email}`)
    } else {
        const admin = await prisma.adminUser.create({
            data: {
                username: adminUsername,
                email,
                password_hash: hash,
                first_name: 'Super',
                last_name: 'Admin',
                role: 'SUPER_ADMIN',
                status: 'ACTIVE'
            }
        })
        console.log(`Admin user created: ${admin.email}`)
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
