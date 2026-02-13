const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    console.log('Starting Admin Seed (JS)...');
    try {
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@punchcard.co.za';
        const adminPasswordPlain = process.env.ADMIN_PASSWORD || 'password1234';
        const adminPassword = await bcrypt.hash(adminPasswordPlain, 10);
        console.log('Password hashed.');

        // List of old admin emails to migrate from
        const oldAdminEmails = ['admin@loyalty.com', 'admin@loyaltyladies.com'];
        
        // Check if new admin already exists
        const newAdmin = await prisma.adminUser.findUnique({
            where: { email: adminEmail }
        });
        
        // Check for old admin emails that need migration
        let oldAdminToMigrate = null;
        let oldAdminEmail = null;
        
        for (const oldEmail of oldAdminEmails) {
            if (oldEmail !== adminEmail) {
                const found = await prisma.adminUser.findUnique({
                    where: { email: oldEmail }
                });
                if (found) {
                    oldAdminToMigrate = found;
                    oldAdminEmail = oldEmail;
                    break;
                }
            }
        }
        
        // Handle migration: if old admin exists and we're migrating to a new email
        if (oldAdminToMigrate && adminEmail !== oldAdminEmail) {
            if (newAdmin) {
                // Both exist - delete old one and update new one
                console.log(`Both admin emails exist. Deleting old admin (${oldAdminEmail}) and updating new admin (${adminEmail})`);
                await prisma.adminUser.delete({
                    where: { email: oldAdminEmail }
                });
                const admin = await prisma.adminUser.update({
                    where: { email: adminEmail },
                    data: {
                        password_hash: adminPassword,
                        name: 'Super Admin',
                        role: 'SUPER_ADMIN',
                        status: 'ACTIVE'
                    }
                });
                console.log(`Admin updated: ${admin.email}`);
            } else {
                // Only old exists - migrate it to new email
                console.log(`Migrating admin from ${oldAdminEmail} to ${adminEmail}`);
                await prisma.adminUser.update({
                    where: { email: oldAdminEmail },
                    data: {
                        email: adminEmail,
                        password_hash: adminPassword,
                        name: 'Super Admin',
                        role: 'SUPER_ADMIN',
                        status: 'ACTIVE'
                    }
                });
                console.log(`Admin migrated to: ${adminEmail}`);
            }
        } else {
            const admin = await prisma.adminUser.upsert({
                where: { email: adminEmail },
                update: {
                    password_hash: adminPassword,
                    name: 'Super Admin',
                    role: 'SUPER_ADMIN',
                    status: 'ACTIVE'
                },
                create: {
                    email: adminEmail,
                    password_hash: adminPassword,
                    name: 'Super Admin',
                    role: 'SUPER_ADMIN',
                    status: 'ACTIVE'
                }
            });
            console.log('Admin user created/updated:', admin.email);
        }
    } catch (e) {
        console.error('Error in seed-admin (JS):', e);
        throw e;
    } finally {
        await prisma.$disconnect();
    }
}

main().catch((e) => {
    console.error('Fatal error:', e);
    process.exit(1);
});
