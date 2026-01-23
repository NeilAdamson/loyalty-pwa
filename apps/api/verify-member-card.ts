import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const BASE_URL = 'http://127.0.0.1:8000'

async function main() {
    console.log('--- Starting Member Card Verification ---')

    // 1. Get Vendor Slug
    const vendor = await prisma.vendor.findUnique({ where: { vendor_slug: 'demo-cafe' } })
    if (!vendor) throw new Error('Vendor not found')
    const slug = vendor.vendor_slug

    // 2. Member Login (OTP)
    // Request
    await fetch(`${BASE_URL}/v/${slug}/auth/member/otp/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: '+1234567890' })
    })

    // Verify
    const verifyRes = await fetch(`${BASE_URL}/v/${slug}/auth/member/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: '+1234567890', code: '123456' })
    })
    if (!verifyRes.ok) throw new Error('Member Login Failed')
    const { token, member } = await verifyRes.json() as any
    console.log('✅ Member Logged In:', member.member_id)

    // 3. Get Card (Should create active card implicitly)
    const cardRes = await fetch(`${BASE_URL}/me/card`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    if (!cardRes.ok) throw new Error(`Get Card Failed: ${await cardRes.text()}`)

    const { card, token: rotatingToken, expires_in_seconds } = await cardRes.json() as any

    if (!card || !card.card_id) throw new Error('Card data missing')
    if (card.status !== 'ACTIVE') throw new Error('Card not active')
    if (!rotatingToken) throw new Error('Rotating token missing')
    if (expires_in_seconds !== 30) throw new Error('Expiry incorrect')

    console.log('✅ Active Card Retrieved:', card.card_id)
    console.log('✅ Rotating Token Generated')

    console.log('\n--- Member Card Verification Complete: PASS ---')
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(() => prisma.$disconnect())
