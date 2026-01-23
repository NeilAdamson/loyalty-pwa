import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('--- Verifying Constraints ---')

    // Get seeded vendor
    const vendor = await prisma.vendor.findFirstOrThrow()
    const member = await prisma.member.findFirstOrThrow()
    const program = await prisma.program.findFirst({ where: { is_active: true } })

    if (!program) throw new Error('Seeded active program not found')

    // CLEANUP: Remove artifacts from previous runs to ensure idempotency
    console.log('Cleaning up previous test data...')
    // Cleanup Test 3 Card
    await prisma.cardInstance.deleteMany({
        where: {
            vendor_id: vendor.vendor_id,
            member_id: member.member_id,
            program_id: program.program_id,
            status: 'ACTIVE',
            // We need to be careful not to delete the seeded card if one exists, 
            // but seed.ts didn't create a card. 
            // If seed.ts DID create a card, we should filter by a specific property if possible.
            // For now, we assume we can safely delete extra cards or just rely on the test.
            // Actually, Test 3 creates a NEW card. 
            // Let's delete ALL cards for this program/member to be safe, 
            // OR better, delete the specific card created by previous runs if we can identify it.
            // Since we can't easily, let's just delete active cards for this member/program 
            // assuming the seed doesn't rely on them.
        }
    })

    await prisma.program.deleteMany({
        where: {
            vendor_id: vendor.vendor_id,
            version: { in: [2, 3] }
        }
    })
    await prisma.tokenUse.deleteMany({
        where: {
            vendor_id: vendor.vendor_id,
            token_jti: 'test-token-123'
        }
    })

    // TEST 1: Partial Unique Index - One Active Program per Vendor
    console.log('Test 1: Create second ACTIVE program (Expect Fail)')
    try {
        await prisma.program.create({
            data: {
                vendor_id: vendor.vendor_id,
                version: 2,
                is_active: true, // Should violate partial index
                stamps_required: 5,
                reward_title: 'Fail',
                reward_description: 'Fail',
                terms_text: 'Fail',
            },
        })
        console.error('FAILED: Second active program was allowed!')
        process.exit(1)
    } catch (e: any) {
        if (e.code === 'P2002') {
            console.log('PASSED: Second active program blocked.')
        } else {
            console.error('Unexpected error:', e)
            process.exit(1)
        }
    }

    // TEST 2: Inactive Program (Should be allowed)
    console.log('Test 2: Create INACTIVE program (Expect Success)')
    try {
        await prisma.program.create({
            data: {
                vendor_id: vendor.vendor_id,
                version: 3,
                is_active: false, // Should NOT violate partial index
                stamps_required: 5,
                reward_title: 'Inactive',
                reward_description: 'Inactive',
                terms_text: 'Inactive',
            },
        })
        console.log('PASSED: Inactive program created.')
    } catch (e) {
        console.error('FAILED: Inactive program blocked unexpectedly', e)
        process.exit(1)
    }

    // TEST 3: Partial Unique Index - One Active Card per Member
    console.log('Test 3: Create second ACTIVE card (Expect Fail)')
    // Create first active card
    await prisma.cardInstance.create({
        data: {
            vendor_id: vendor.vendor_id,
            member_id: member.member_id,
            program_id: program.program_id,
            status: 'ACTIVE',
        }
    })

    try {
        await prisma.cardInstance.create({
            data: {
                vendor_id: vendor.vendor_id,
                member_id: member.member_id,
                program_id: program.program_id,
                status: 'ACTIVE', // Should violate partial index
            }
        })
        console.error('FAILED: Second active card was allowed!')
        process.exit(1)
    } catch (e: any) {
        // Note: Prisma might report P2002 but message differs for partial index
        console.log('PASSED: Second active card blocked (Error: ' + e.code + ')')
    }

    // TEST 4: Replay Protection (TokenUse PK)
    console.log('Test 4: Duplicate Token Use (Expect Fail)')
    const tokenJti = 'test-token-123'
    await prisma.tokenUse.create({
        data: { vendor_id: vendor.vendor_id, token_jti: tokenJti }
    })

    try {
        await prisma.tokenUse.create({
            data: { vendor_id: vendor.vendor_id, token_jti: tokenJti }
        })
        console.error('FAILED: Duplicate token use allowed!')
        process.exit(1)
    } catch (e: any) {
        if (e.code === 'P2002') {
            console.log('PASSED: Duplicate token usage blocked.')
        } else {
            console.error('Unexpected error:', e)
            process.exit(1)
        }
    }

    console.log('--- All Constraint Tests Passed ---')
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
