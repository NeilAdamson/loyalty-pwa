
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Testing Vendor Create...');
    try {
        const vendor = await prisma.vendor.create({
            data: {
                legal_name: 'Test Corp',
                trading_name: 'Test Trading',
                vendor_slug: 'test-slug-' + Date.now(),
                billing_email: 'test@test.com',
                monthly_billing_amount: 500,
                billing_start_date: new Date(),
                contact_name: 'Bob',
                contact_surname: 'Builder',
                contact_phone: '1234567890',
                status: 'ACTIVE',
                billing_plan_id: 'FREE',
                billing_status: 'TRIAL',
                branding: {
                    create: {
                        primary_color: '#000000',
                        secondary_color: '#ffffff'
                    }
                },
                programs: {
                    create: {
                        version: 1,
                        is_active: true,
                        stamps_required: 10,
                        reward_title: 'Reward',
                        reward_description: 'Desc',
                        terms_text: 'Terms'
                    }
                },
                branches: {
                    create: {
                        name: 'Main Branch',
                        city: 'JHB',
                        region: 'GP'
                    }
                }
            }
        });
        console.log('Success!', vendor);
    } catch (e) {
        console.error('Error creating vendor:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
