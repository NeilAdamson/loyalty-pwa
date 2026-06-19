import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('--- Verifying Constraints ---')

    // Use demo-cafe seed vendor when present, otherwise any vendor with member + active program
    const vendor =
        (await prisma.vendor.findFirst({ where: { vendor_slug: 'demo-cafe' } })) ??
        (await prisma.vendor.findFirst({
            where: {
                members: { some: {} },
                programs: { some: { is_active: true } },
            },
        }))
    if (!vendor) throw new Error('No suitable vendor found for constraint tests')

    const member = await prisma.member.findFirstOrThrow({
        where: { vendor_id: vendor.vendor_id },
    })
    const program = await prisma.program.findFirstOrThrow({
        where: { vendor_id: vendor.vendor_id, is_active: true },
    })

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

async function verifyTenantBranchIntegrity() {
    console.log('--- Verifying Tenant–Branch Integrity ---')

    const suffix = Date.now()
    const vendorA = await prisma.vendor.create({
        data: {
            vendor_slug: `tenant-branch-a-${suffix}`,
            legal_name: 'Tenant Branch Test A',
            trading_name: 'Tenant Branch Test A',
            status: 'ACTIVE',
            billing_plan_id: 'TEST',
            billing_status: 'TRIAL',
            onboarding_status: 'COMPLETE',
            onboarding_completed_at: new Date(),
            contact_name: 'Test',
            contact_surname: 'A',
            contact_phone: '+27000000001',
        },
    })
    const vendorB = await prisma.vendor.create({
        data: {
            vendor_slug: `tenant-branch-b-${suffix}`,
            legal_name: 'Tenant Branch Test B',
            trading_name: 'Tenant Branch Test B',
            status: 'ACTIVE',
            billing_plan_id: 'TEST',
            billing_status: 'TRIAL',
            onboarding_status: 'COMPLETE',
            onboarding_completed_at: new Date(),
            contact_name: 'Test',
            contact_surname: 'B',
            contact_phone: '+27000000002',
        },
    })

    const branchB = await prisma.branch.create({
        data: { vendor_id: vendorB.vendor_id, name: 'Branch B', is_active: true },
    })

    const pinHash = await import('bcryptjs').then((b) => b.hash('1234', 10))

    console.log('Test 5: Cross-vendor staff branch assignment (Expect Fail)')
    try {
        await prisma.staffUser.create({
            data: {
                vendor_id: vendorA.vendor_id,
                branch_id: branchB.branch_id,
                username: `cross-staff-${suffix}`,
                name: 'Cross Staff',
                role: 'STAMPER',
                status: 'ENABLED',
                pin_hash: pinHash,
            },
        })
        console.error('FAILED: Cross-vendor staff branch assignment was allowed!')
        process.exit(1)
    } catch (e: any) {
        if (e.code === 'P2003') {
            console.log('PASSED: Cross-vendor staff branch assignment blocked.')
        } else {
            console.error('Unexpected error:', e)
            process.exit(1)
        }
    }

    console.log('Test 6: Cross-vendor member branch_joined_id (Expect Fail)')
    try {
        await prisma.member.create({
            data: {
                vendor_id: vendorA.vendor_id,
                branch_joined_id: branchB.branch_id,
                name: 'Cross Member',
                phone_e164: `+2799${String(suffix).slice(-7)}`,
            },
        })
        console.error('FAILED: Cross-vendor member branch assignment was allowed!')
        process.exit(1)
    } catch (e: any) {
        if (e.code === 'P2003') {
            console.log('PASSED: Cross-vendor member branch assignment blocked.')
        } else {
            console.error('Unexpected error:', e)
            process.exit(1)
        }
    }

    await prisma.staffUser.deleteMany({ where: { vendor_id: { in: [vendorA.vendor_id, vendorB.vendor_id] } } })
    await prisma.member.deleteMany({ where: { vendor_id: { in: [vendorA.vendor_id, vendorB.vendor_id] } } })
    await prisma.branch.deleteMany({ where: { vendor_id: { in: [vendorA.vendor_id, vendorB.vendor_id] } } })
    await prisma.vendor.deleteMany({ where: { vendor_id: { in: [vendorA.vendor_id, vendorB.vendor_id] } } })

    console.log('--- Tenant–Branch Integrity Tests Passed ---')
}

async function verifyTenantRecordIntegrity() {
    console.log('--- Verifying Tenant–Record Integrity ---')

    const suffix = Date.now()
    const pinHash = await import('bcryptjs').then((b) => b.hash('1234', 10))

    const vendorA = await prisma.vendor.create({
        data: {
            vendor_slug: `tenant-record-a-${suffix}`,
            legal_name: 'Tenant Record Test A',
            trading_name: 'Tenant Record Test A',
            status: 'ACTIVE',
            billing_plan_id: 'TEST',
            billing_status: 'TRIAL',
            onboarding_status: 'COMPLETE',
            onboarding_completed_at: new Date(),
            contact_name: 'Test',
            contact_surname: 'A',
            contact_phone: '+27000000011',
        },
    })
    const vendorB = await prisma.vendor.create({
        data: {
            vendor_slug: `tenant-record-b-${suffix}`,
            legal_name: 'Tenant Record Test B',
            trading_name: 'Tenant Record Test B',
            status: 'ACTIVE',
            billing_plan_id: 'TEST',
            billing_status: 'TRIAL',
            onboarding_status: 'COMPLETE',
            onboarding_completed_at: new Date(),
            contact_name: 'Test',
            contact_surname: 'B',
            contact_phone: '+27000000012',
        },
    })

    const branchA = await prisma.branch.create({
        data: { vendor_id: vendorA.vendor_id, name: 'Branch A', is_active: true },
    })
    const branchB = await prisma.branch.create({
        data: { vendor_id: vendorB.vendor_id, name: 'Branch B', is_active: true },
    })

    const memberA = await prisma.member.create({
        data: {
            vendor_id: vendorA.vendor_id,
            name: 'Member A',
            phone_e164: `+2781${String(suffix).slice(-7)}`,
        },
    })
    const memberB = await prisma.member.create({
        data: {
            vendor_id: vendorB.vendor_id,
            name: 'Member B',
            phone_e164: `+2782${String(suffix).slice(-7)}`,
        },
    })

    const programA = await prisma.program.create({
        data: {
            vendor_id: vendorA.vendor_id,
            version: 1,
            is_active: true,
            stamps_required: 10,
            reward_title: 'Reward A',
            reward_description: 'Desc A',
            terms_text: 'Terms A',
        },
    })
    const programB = await prisma.program.create({
        data: {
            vendor_id: vendorB.vendor_id,
            version: 1,
            is_active: true,
            stamps_required: 10,
            reward_title: 'Reward B',
            reward_description: 'Desc B',
            terms_text: 'Terms B',
        },
    })

    const staffA = await prisma.staffUser.create({
        data: {
            vendor_id: vendorA.vendor_id,
            branch_id: branchA.branch_id,
            username: `staff-a-${suffix}`,
            name: 'Staff A',
            role: 'STAMPER',
            status: 'ENABLED',
            pin_hash: pinHash,
        },
    })
    const staffB = await prisma.staffUser.create({
        data: {
            vendor_id: vendorB.vendor_id,
            branch_id: branchB.branch_id,
            username: `staff-b-${suffix}`,
            name: 'Staff B',
            role: 'STAMPER',
            status: 'ENABLED',
            pin_hash: pinHash,
        },
    })

    const cardA = await prisma.cardInstance.create({
        data: {
            vendor_id: vendorA.vendor_id,
            member_id: memberA.member_id,
            program_id: programA.program_id,
            status: 'ACTIVE',
        },
    })
    const cardB = await prisma.cardInstance.create({
        data: {
            vendor_id: vendorB.vendor_id,
            member_id: memberB.member_id,
            program_id: programB.program_id,
            status: 'ACTIVE',
        },
    })

    console.log('Test 7: Cross-vendor card_instances with foreign member_id (Expect Fail)')
    try {
        await prisma.cardInstance.create({
            data: {
                vendor_id: vendorA.vendor_id,
                member_id: memberB.member_id,
                program_id: programA.program_id,
                status: 'ACTIVE',
            },
        })
        console.error('FAILED: Cross-vendor card member assignment was allowed!')
        process.exit(1)
    } catch (e: unknown) {
        const code = typeof e === 'object' && e !== null && 'code' in e ? String((e as { code?: unknown }).code) : undefined
        if (code === 'P2003') {
            console.log('PASSED: Cross-vendor card member assignment blocked.')
        } else {
            console.error('Unexpected error:', e)
            process.exit(1)
        }
    }

    console.log('Test 8: Cross-vendor card_instances with foreign program_id (Expect Fail)')
    try {
        await prisma.cardInstance.create({
            data: {
                vendor_id: vendorA.vendor_id,
                member_id: memberA.member_id,
                program_id: programB.program_id,
                status: 'REDEEMED',
            },
        })
        console.error('FAILED: Cross-vendor card program assignment was allowed!')
        process.exit(1)
    } catch (e: unknown) {
        const code = typeof e === 'object' && e !== null && 'code' in e ? String((e as { code?: unknown }).code) : undefined
        if (code === 'P2003') {
            console.log('PASSED: Cross-vendor card program assignment blocked.')
        } else {
            console.error('Unexpected error:', e)
            process.exit(1)
        }
    }

    console.log('Test 9: Cross-vendor stamp_transactions with foreign card_id (Expect Fail)')
    try {
        await prisma.stampTransaction.create({
            data: {
                vendor_id: vendorA.vendor_id,
                card_id: cardB.card_id,
                staff_id: staffA.staff_id,
                branch_id: branchA.branch_id,
                token_jti: `cross-card-${suffix}`,
            },
        })
        console.error('FAILED: Cross-vendor stamp card assignment was allowed!')
        process.exit(1)
    } catch (e: unknown) {
        const code = typeof e === 'object' && e !== null && 'code' in e ? String((e as { code?: unknown }).code) : undefined
        if (code === 'P2003') {
            console.log('PASSED: Cross-vendor stamp card assignment blocked.')
        } else {
            console.error('Unexpected error:', e)
            process.exit(1)
        }
    }

    console.log('Test 10: Cross-vendor stamp_transactions with foreign staff_id (Expect Fail)')
    try {
        await prisma.stampTransaction.create({
            data: {
                vendor_id: vendorA.vendor_id,
                card_id: cardA.card_id,
                staff_id: staffB.staff_id,
                branch_id: branchA.branch_id,
                token_jti: `cross-staff-${suffix}`,
            },
        })
        console.error('FAILED: Cross-vendor stamp staff assignment was allowed!')
        process.exit(1)
    } catch (e: unknown) {
        const code = typeof e === 'object' && e !== null && 'code' in e ? String((e as { code?: unknown }).code) : undefined
        if (code === 'P2003') {
            console.log('PASSED: Cross-vendor stamp staff assignment blocked.')
        } else {
            console.error('Unexpected error:', e)
            process.exit(1)
        }
    }

    console.log('Test 11: Cross-vendor webauthn_credentials member binding (Expect Fail)')
    try {
        await prisma.webAuthnCredential.create({
            data: {
                vendor_id: vendorA.vendor_id,
                member_id: memberB.member_id,
                credential_id: Buffer.from(`cred-${suffix}-a`),
                public_key: Buffer.from('public-key-test'),
                transports: ['internal'],
            },
        })
        console.error('FAILED: Cross-vendor webauthn member assignment was allowed!')
        process.exit(1)
    } catch (e: unknown) {
        const code = typeof e === 'object' && e !== null && 'code' in e ? String((e as { code?: unknown }).code) : undefined
        if (code === 'P2003') {
            console.log('PASSED: Cross-vendor webauthn member assignment blocked.')
        } else {
            console.error('Unexpected error:', e)
            process.exit(1)
        }
    }

    await prisma.cardInstance.deleteMany({ where: { vendor_id: { in: [vendorA.vendor_id, vendorB.vendor_id] } } })
    await prisma.staffUser.deleteMany({ where: { vendor_id: { in: [vendorA.vendor_id, vendorB.vendor_id] } } })
    await prisma.member.deleteMany({ where: { vendor_id: { in: [vendorA.vendor_id, vendorB.vendor_id] } } })
    await prisma.program.deleteMany({ where: { vendor_id: { in: [vendorA.vendor_id, vendorB.vendor_id] } } })
    await prisma.branch.deleteMany({ where: { vendor_id: { in: [vendorA.vendor_id, vendorB.vendor_id] } } })
    await prisma.vendor.deleteMany({ where: { vendor_id: { in: [vendorA.vendor_id, vendorB.vendor_id] } } })

    console.log('--- Tenant–Record Integrity Tests Passed ---')
}

async function runAll() {
    await main()
    await verifyTenantBranchIntegrity()
    await verifyTenantRecordIntegrity()
}

runAll()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
