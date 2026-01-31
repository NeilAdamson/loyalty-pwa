import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    console.log('Start seeding ...')

    // 1. Vendor (Upsert)
    const vendor = await prisma.vendor.upsert({
        where: { vendor_slug: 'demo-cafe' },
        update: {},
        create: {
            legal_name: 'Demo Cafe Ltd',
            trading_name: 'The Demo Cafe',
            vendor_slug: 'demo-cafe',
            status: 'ACTIVE',
            billing_plan_id: 'pro_monthly',
            billing_status: 'PAID',
        }
    })
    console.log('Created/Found vendor:', vendor.trading_name)

    // 2. Branding (Upsert)
    await prisma.vendorBranding.upsert({
        where: { vendor_id: vendor.vendor_id },
        update: {},
        create: {
            vendor_id: vendor.vendor_id,
            primary_color: '#ff0000',
            secondary_color: '#FFFFFF',
            logo_url: 'https://example.com/logo.png',
        }
    })

    // 3. Branch (Upsert)
    // We need a unique way to find branch. Schema might not have unique slug for branch?
    // Checking schema: Branch has branch_id pk. No other unique?
    // Let's check if one exists for vendor.
    let branch = await prisma.branch.findFirst({ where: { vendor_id: vendor.vendor_id, name: 'Main Street HQ' } })
    if (!branch) {
        branch = await prisma.branch.create({
            data: {
                vendor_id: vendor.vendor_id,
                name: 'Main Street HQ',
                is_active: true,
            }
        })
    }

    // 4. Staff (Upsert)
    // Staff User schema: staff_id is UUID @id. 
    // Wait, looking at schema: 
    // model StaffUser {
    //   user_id     String   @id @default(uuid()) @db.Uuid
    //   vendor_id   String   @db.Uuid
    //   branch_id   String   @db.Uuid
    //   staff_id    String   // This is the semantic ID, e.g. "001"? 
    //   // Checking schema: staff_id String (No @db.Uuid annotation seen in view, but let's check view output)
    // }

    // If `staff_id` is NOT UUID, then "001" should be fine.
    // BUT the error P2023 "Malformed UUID" usually means I'm passing a string to a UUID field.
    // Maybe `branch_id`? 
    // logic: findFirst({ where: { vendor_id: ..., staff_id: '001' } })
    // vendor_id is UUID. staff_id might be UUID?
    // Let's use a UUID for staff_id just in case, or fix the query if I'm passing "001" to user_id?

    // Actually, I'll define a fixed UUID for the staff "001" if it's the ID.
    // If the field `staff_id` is indeed the semantic ID and IS valid string, good.
    // If `staff_id` is the PK, then it's UUID.
    // In `schema.prisma` view: `user_id String @id @default(uuid()) @db.Uuid`.
    // `staff_id String`.
    // So `staff_id` is just a string. 
    // The P2023 error must be on `vendor_id` or `branch_id`??
    // `vendor.vendor_id` is UUID (from findFirst/create).
    // `branch.branch_id` is UUID.
    const staffPinHash = await bcrypt.hash('1234', 10)

    // Lookup by Name + Vendor since staff_id is UUID and we don't know it from M1 seed
    const existingStaff = await prisma.staffUser.findFirst({
        where: { vendor_id: vendor.vendor_id, name: 'Alice Staff' }
    })

    let staff
    if (existingStaff) {
        staff = await prisma.staffUser.update({
            where: { staff_id: existingStaff.staff_id },
            data: {
                pin_hash: staffPinHash,
                status: 'ENABLED'
            }
        })
    } else {
        staff = await prisma.staffUser.create({
            data: {
                vendor_id: vendor.vendor_id,
                branch_id: branch.branch_id,
                name: 'Alice Staff',
                role: 'STAMPER',
                status: 'ENABLED',
                pin_hash: staffPinHash,
            }
        })
    }
    console.log('Created/Updated staff:', staff.name)

    // 5. Member (Upsert)
    // Member has unique (vendor_id, phone_e164)
    const member = await prisma.member.upsert({
        where: {
            vendor_id_phone_e164: {
                vendor_id: vendor.vendor_id,
                phone_e164: '+15550001234'
            }
        },
        update: {},
        create: {
            vendor_id: vendor.vendor_id,
            name: 'Bob Loyalty',
            phone_e164: '+15550001234',
        },
    })
    console.log('Created/Found member:', member.name)


    // 6a. Admin User (Upsert) - Fix for missing Admin Login
    const adminPassword = await bcrypt.hash('password123', 10)
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
    })
    console.log('Created/Found admin:', admin.email)

    // 6. Program (Upsert)
    // Program has unique (vendor_id, version)
    const program = await prisma.program.upsert({
        where: {
            vendor_id_version: {
                vendor_id: vendor.vendor_id,
                version: 1
            }
        },
        update: {}, // don't overwrite if exists
        create: {
            vendor_id: vendor.vendor_id,
            version: 1,
            is_active: true,
            stamps_required: 10,
            reward_title: 'Free Coffee',
            reward_description: 'Get a free black coffee',
            terms_text: 'T&C apply',
        },
    })
    console.log('Created/Found program:', program.reward_title)

    console.log('Seeding finished.')
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
