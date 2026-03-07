import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

const ADMIN_EMAIL_DOMAIN = 'punchcard.co.za'

async function main() {
    console.log('Starting Admin Seed...')
    try {
        const adminUsername = 'admin'
        const adminEmail = `${adminUsername}@${ADMIN_EMAIL_DOMAIN}`
        const adminPasswordPlain = process.env.ADMIN_PASSWORD || 'password1234'
        const adminPassword = await hash(adminPasswordPlain, 10)
        console.log('Password hashed.')

        // List of old admin emails to migrate from
        const oldAdminEmails = ['admin@loyalty.com', 'admin@loyaltyladies.com']
        
        // Check if new admin already exists (by email or username)
        const newAdmin = await prisma.adminUser.findFirst({
            where: {
                OR: [
                    { email: adminEmail },
                    { username: adminUsername }
                ]
            }
        })
        
        // Check for old admin emails that need migration
        let oldAdminToMigrate = null
        let oldAdminEmailValue = null
        
        for (const oldEmail of oldAdminEmails) {
            if (oldEmail !== adminEmail) {
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
        if (oldAdminToMigrate && adminEmail !== oldAdminEmailValue) {
            if (newAdmin) {
                console.log(`Both admin emails exist. Deleting old admin (${oldAdminEmailValue}) and updating new admin (${adminEmail})`)
                await prisma.adminUser.delete({
                    where: { email: oldAdminEmailValue! }
                })
                const admin = await prisma.adminUser.update({
                    where: { admin_id: newAdmin.admin_id },
                    data: {
                        username: adminUsername,
                        email: adminEmail,
                        password_hash: adminPassword,
                        first_name: 'Super',
                        last_name: 'Admin',
                        role: 'SUPER_ADMIN',
                        status: 'ACTIVE'
                    }
                })
                console.log(`Admin updated: ${admin.email}`)
            } else {
                console.log(`Migrating admin from ${oldAdminEmailValue} to ${adminEmail}`)
                await prisma.adminUser.update({
                    where: { email: oldAdminEmailValue! },
                    data: {
                        username: adminUsername,
                        email: adminEmail,
                        password_hash: adminPassword,
                        first_name: 'Super',
                        last_name: 'Admin',
                        role: 'SUPER_ADMIN',
                        status: 'ACTIVE'
                    }
                })
                console.log(`Admin migrated to: ${adminEmail}`)
            }
        } else if (newAdmin) {
            const admin = await prisma.adminUser.update({
                where: { admin_id: newAdmin.admin_id },
                data: {
                    password_hash: adminPassword,
                    first_name: 'Super',
                    last_name: 'Admin',
                    role: 'SUPER_ADMIN',
                    status: 'ACTIVE'
                }
            })
            console.log('Admin user updated:', admin.email)
        } else {
            const admin = await prisma.adminUser.create({
                data: {
                    username: adminUsername,
                    email: adminEmail,
                    password_hash: adminPassword,
                    first_name: 'Super',
                    last_name: 'Admin',
                    role: 'SUPER_ADMIN',
                    status: 'ACTIVE'
                }
            })
            console.log('Admin user created:', admin.email)
        }
    } catch (e) {
        console.error('Error in seed-admin:', e)
        throw e
    } finally {
        await prisma.$disconnect()
    }
}

main().catch((e) => {
    console.error('Fatal error:', e)
    process.exit(1)
})
