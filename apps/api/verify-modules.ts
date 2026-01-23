import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const BASE_URL = 'http://127.0.0.1:8000'

async function main() {
    console.log('--- Starting Modules Verification ---')

    // 1. Get Vendor Slug
    const vendor = await prisma.vendor.findUnique({ where: { vendor_slug: 'demo-cafe' } })
    if (!vendor) throw new Error('Vendor not found')
    const slug = vendor.vendor_slug

    // 2. Setup Admin Staff (if not exists)
    // Seed created 'Alice Staff' as STAMPER. We need an ADMIN.
    const adminPinHash = await import('bcryptjs').then(b => b.hash('9999', 10))
    let admin = await prisma.staffUser.findFirst({ where: { vendor_id: vendor.vendor_id, role: 'ADMIN' } })
    if (!admin) {
        admin = await prisma.staffUser.create({
            data: {
                vendor_id: vendor.vendor_id,
                branch_id: (await prisma.branch.findFirst({ where: { vendor_id: vendor.vendor_id } }))!.branch_id,
                name: 'Boss Admin',
                role: 'ADMIN',
                status: 'ENABLED',
                pin_hash: adminPinHash,
                // staff_id is UUID PK, auto-generated
            }
        })
        console.log('Created Admin Staff')
    }

    // 3. Login as Admin
    const loginRes = await fetch(`${BASE_URL}/v/${slug}/auth/staff/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staff_id: admin.staff_id, pin: '9999' })
    })
    if (!loginRes.ok) throw new Error('Admin Login Failed')
    const { token } = await loginRes.json() as any
    console.log('✅ Admin Logged In')

    // 4. Create Draft Program
    const draftRes = await fetch(`${BASE_URL}/programs`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            stamps_required: 8,
            reward_title: 'Super Coffee',
            reward_description: 'Better than free',
            terms_text: 'VIP Only'
        })
    })
    if (!draftRes.ok) throw new Error(`Create Draft Failed: ${await draftRes.text()}`)
    const draft = await draftRes.json() as any
    if (draft.is_active) throw new Error('Draft should be inactive')
    console.log('✅ Draft Program Created:', draft.program_id)

    // 5. Activate Program
    const activateRes = await fetch(`${BASE_URL}/programs/${draft.program_id}/activate`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
    })
    if (!activateRes.ok) throw new Error(`Activate Failed: ${await activateRes.text()}`)
    const activated = await activateRes.json() as any
    if (!activated.is_active) throw new Error('Program should be active')
    console.log('✅ Program Activated')

    // 6. Verify Public Active Program
    const publicRes = await fetch(`${BASE_URL}/v/${slug}/programs/active`)
    if (!publicRes.ok) throw new Error('Fetch Active Failed')
    const active = await publicRes.json() as any
    if (active.program_id !== draft.program_id) throw new Error('Public active program mismatch')
    console.log('✅ Public Active Program Verified')

    // 7. Verify Old Program is Inactive (The seed created one active program)
    const oldPrograms = await prisma.program.findMany({
        where: { vendor_id: vendor.vendor_id, program_id: { not: draft.program_id } }
    })
    for (const p of oldPrograms) {
        if (p.is_active) throw new Error(`Old Program ${p.version} is still active! Atomicity failed.`)
    }
    console.log('✅ Atomicity Verified: Old programs deactivated')

    console.log('\n--- Modules Verification Complete: ALL PASS ---')
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(() => prisma.$disconnect())
