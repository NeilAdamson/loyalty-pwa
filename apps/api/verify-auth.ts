import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const BASE_URL = 'http://127.0.0.1:8000'

async function main() {
    console.log('--- Starting Auth Verification ---')

    // 1. Get Vendor Slug
    const vendor = await prisma.vendor.findFirst()
    if (!vendor) throw new Error('No vendor found. Run seed first.')
    const slug = vendor.vendor_slug
    console.log(`Target Vendor: ${slug} (${vendor.vendor_id})`)

    // --- Member Auth Flow ---
    console.log('\n[Member Auth] Testing OTP Flow...')
    const phone = '+15550001234'

    // A. Request OTP
    const req1 = await fetch(`${BASE_URL}/v/${slug}/auth/member/otp/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
    })
    if (!req1.ok) throw new Error(`OTP Request failed: ${req1.status} ${await req1.text()}`)
    console.log('✅ OTP Request success')

    // B. Verify OTP (Mock: 123456)
    const req2 = await fetch(`${BASE_URL}/v/${slug}/auth/member/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code: '123456' })
    })
    if (!req2.ok) throw new Error(`OTP Verify failed: ${req2.status} ${await req2.text()}`)
    const res2 = await req2.json() as any
    if (!res2.token || !res2.member) throw new Error('Invalid OTP Verify response')
    console.log('✅ OTP Verify success. Token received.')


    // --- Staff Auth Flow ---
    console.log('\n[Staff Auth] Testing PIN Flow...')

    // Get Staff ID from DB
    const staff = await prisma.staffUser.findFirst({ where: { vendor_id: vendor.vendor_id } })
    if (!staff) throw new Error('No staff found.')

    // A. Login Success (PIN: 1234)
    const req3 = await fetch(`${BASE_URL}/v/${slug}/auth/staff/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staff_id: staff.staff_id, pin: '1234' })
    })
    if (!req3.ok) throw new Error(`Staff Login failed: ${req3.status} ${await req3.text()}`)
    const res3 = await req3.json() as any
    if (!res3.token || res3.staff.role !== 'STAMPER') throw new Error('Invalid Staff Login response')
    console.log('✅ Staff Login success. Token received.')

    // B. Login Fail (Wrong PIN)
    const req4 = await fetch(`${BASE_URL}/v/${slug}/auth/staff/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staff_id: staff.staff_id, pin: '0000' })
    })
    if (req4.ok) throw new Error('Staff Login SHOULD fail with wrong PIN')
    if (req4.status !== 401) throw new Error(`Expected 401, got ${req4.status}`)
    console.log('✅ Staff Login failed as expected (Wrong PIN)')

    console.log('\n--- Verification Complete: ALL PASS ---')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
