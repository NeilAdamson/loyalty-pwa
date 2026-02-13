import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    console.log('=== Admin User Diagnostic ===\n')
    
    const targetEmail = process.env.ADMIN_EMAIL || 'admin@punchcard.co.za'
    const targetPassword = process.env.ADMIN_PASSWORD || 'password1234'
    
    console.log(`Looking for admin: ${targetEmail}`)
    console.log(`Testing password: ${targetPassword}\n`)
    
    // Check for new admin
    const newAdmin = await prisma.adminUser.findUnique({
        where: { email: targetEmail }
    })
    
    // Check for old admin
    const oldAdmin = await prisma.adminUser.findUnique({
        where: { email: 'admin@loyalty.com' }
    })
    
    // List all admins
    const allAdmins = await prisma.adminUser.findMany({
        select: {
            admin_id: true,
            email: true,
            name: true,
            role: true,
            status: true,
            created_at: true
        }
    })
    
    console.log('=== All Admin Users in Database ===')
    if (allAdmins.length === 0) {
        console.log('❌ NO ADMIN USERS FOUND IN DATABASE')
    } else {
        allAdmins.forEach((admin, idx) => {
            console.log(`\n${idx + 1}. Email: ${admin.email}`)
            console.log(`   ID: ${admin.admin_id}`)
            console.log(`   Name: ${admin.name}`)
            console.log(`   Role: ${admin.role}`)
            console.log(`   Status: ${admin.status}`)
            console.log(`   Created: ${admin.created_at}`)
        })
    }
    
    console.log('\n=== Target Admin Check ===')
    if (newAdmin) {
        console.log(`✅ Found admin: ${targetEmail}`)
        console.log(`   Status: ${newAdmin.status}`)
        console.log(`   Role: ${newAdmin.role}`)
        
        // Test password
        console.log('\n=== Password Verification ===')
        try {
            const valid = await bcrypt.compare(targetPassword, newAdmin.password_hash)
            if (valid) {
                console.log(`✅ Password '${targetPassword}' is VALID`)
            } else {
                console.log(`❌ Password '${targetPassword}' is INVALID`)
                console.log(`   Hash in DB: ${newAdmin.password_hash.substring(0, 20)}...`)
                
                // Try to generate what the hash should be
                const testHash = await bcrypt.hash(targetPassword, 10)
                console.log(`   Expected hash (new): ${testHash.substring(0, 20)}...`)
            }
        } catch (error) {
            console.log(`❌ Error comparing password:`, error)
        }
    } else {
        console.log(`❌ Admin NOT FOUND: ${targetEmail}`)
    }
    
    if (oldAdmin && targetEmail !== 'admin@loyalty.com') {
        console.log(`\n⚠️  Found old admin: admin@loyalty.com`)
        console.log(`   This needs to be migrated to ${targetEmail}`)
        console.log(`   Run: pnpm db:seed to migrate`)
    }
    
    console.log('\n=== Recommendations ===')
    if (!newAdmin) {
        console.log('1. Run seed script: pnpm db:seed')
        console.log('2. Or create admin manually via admin portal (if you have another admin account)')
    } else if (newAdmin.status !== 'ACTIVE') {
        console.log(`1. Admin exists but status is ${newAdmin.status}`)
        console.log('2. Update status to ACTIVE')
    } else {
        console.log('✅ Admin user exists and appears to be configured correctly')
        console.log('   If login still fails, check:')
        console.log('   - Password is correct (case-sensitive)')
        console.log('   - No extra spaces in email/password')
        console.log('   - API logs for detailed error messages')
    }
}

main()
    .catch((e) => {
        console.error('Error:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
