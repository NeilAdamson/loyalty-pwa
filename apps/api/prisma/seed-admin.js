const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    console.log('Starting Admin Seed (JS)...');
    try {
        const adminPassword = await bcrypt.hash('password123', 10);
        console.log('Password hashed.');

        const admin = await prisma.adminUser.upsert({
            where: { email: 'admin@loyalty.com' },
            update: {},
            create: {
                email: 'admin@loyalty.com',
                password_hash: adminPassword,
                name: 'Super Admin',
                role: 'SUPER_ADMIN',
                status: 'ACTIVE'
            }
        });
        console.log('Admin user created/updated:', admin.email);
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
