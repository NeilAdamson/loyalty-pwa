import { randomUUID } from 'crypto'
import Redis from 'ioredis'
import { PrismaClient } from '@prisma/client'
import { TransactionService } from './src/services/transaction.service'
import { RedisRateLimiter } from './src/services/redis-rate-limiter.service'

const prisma = new PrismaClient()
const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379'
const redis = new Redis(redisUrl)
const transactionService = new TransactionService(prisma, new RedisRateLimiter(redis))

type Fixture = {
    vendorId: string
    branchId: string
    staffId: string
    programId: string
}

type CardFixture = {
    cardId: string
    memberId: string
}

function assert(condition: unknown, message: string): asserts condition {
    if (!condition) {
        throw new Error(message)
    }
}

function getErrorCode(error: unknown) {
    return typeof error === 'object' && error !== null && 'code' in error
        ? String((error as { code?: unknown }).code)
        : undefined
}

function describeSettled(results: PromiseSettledResult<unknown>[]) {
    return results.map((result) => {
        if (result.status === 'fulfilled') return 'fulfilled'
        return `rejected:${getErrorCode(result.reason) ?? 'UNKNOWN'}`
    }).join(', ')
}

async function cleanupVendor(vendorId: string) {
    await prisma.tokenUse.deleteMany({ where: { vendor_id: vendorId } })
    await prisma.stampTransaction.deleteMany({ where: { vendor_id: vendorId } })
    await prisma.redemptionTransaction.deleteMany({ where: { vendor_id: vendorId } })
    await prisma.cardInstance.deleteMany({ where: { vendor_id: vendorId } })
    await prisma.staffUser.deleteMany({ where: { vendor_id: vendorId } })
    await prisma.member.deleteMany({ where: { vendor_id: vendorId } })
    await prisma.program.deleteMany({ where: { vendor_id: vendorId } })
    await prisma.branch.deleteMany({ where: { vendor_id: vendorId } })
    await prisma.vendor.deleteMany({ where: { vendor_id: vendorId } })
}

async function createFixture(): Promise<Fixture> {
    const suffix = randomUUID().slice(0, 8)
    const vendor = await prisma.vendor.create({
        data: {
            vendor_slug: `tx-integrity-${suffix}`,
            legal_name: 'Transaction Integrity Test Pty Ltd',
            trading_name: 'Transaction Integrity Test',
            status: 'ACTIVE',
            billing_plan_id: 'TEST',
            billing_status: 'TRIAL',
            onboarding_status: 'COMPLETE',
            onboarding_completed_at: new Date(),
            contact_name: 'Tx',
            contact_surname: 'Tester',
            contact_phone: '+27000000000'
        }
    })

    const branch = await prisma.branch.create({
        data: {
            vendor_id: vendor.vendor_id,
            name: 'Integrity Test Branch',
            is_active: true
        }
    })

    const staff = await prisma.staffUser.create({
        data: {
            vendor_id: vendor.vendor_id,
            branch_id: branch.branch_id,
            username: `tester-${suffix}`,
            name: 'Integrity Tester',
            role: 'STAMPER',
            status: 'ENABLED',
            pin_hash: 'not-used-by-service-test'
        }
    })

    const program = await prisma.program.create({
        data: {
            vendor_id: vendor.vendor_id,
            version: 1,
            is_active: true,
            stamps_required: 5,
            reward_title: 'Integrity Reward',
            reward_description: 'Concurrency verification reward',
            terms_text: 'Test data only'
        }
    })

    return {
        vendorId: vendor.vendor_id,
        branchId: branch.branch_id,
        staffId: staff.staff_id,
        programId: program.program_id
    }
}

async function createCard(fixture: Fixture, stampsCount: number): Promise<CardFixture> {
    const suffix = randomUUID().slice(0, 8)
    const member = await prisma.member.create({
        data: {
            vendor_id: fixture.vendorId,
            name: `Integrity Member ${suffix}`,
            phone_e164: `+2700${suffix}`,
            consent_service: true,
            consent_marketing: false
        }
    })

    const card = await prisma.cardInstance.create({
        data: {
            vendor_id: fixture.vendorId,
            member_id: member.member_id,
            program_id: fixture.programId,
            status: 'ACTIVE',
            stamps_count: stampsCount
        }
    })

    return { cardId: card.card_id, memberId: member.member_id }
}

function stampPayload(card: CardFixture, jti = randomUUID()) {
    return {
        card_id: card.cardId,
        member_id: card.memberId,
        jti
    }
}

async function stamp(fixture: Fixture, card: CardFixture, jti = randomUUID()) {
    return transactionService.stamp(
        fixture.vendorId,
        fixture.staffId,
        fixture.branchId,
        stampPayload(card, jti)
    )
}

async function redeem(fixture: Fixture, card: CardFixture, jti = randomUUID()) {
    return transactionService.redeem(
        fixture.vendorId,
        fixture.staffId,
        fixture.branchId,
        stampPayload(card, jti)
    )
}

async function verifyConcurrentStampCooldown(fixture: Fixture) {
    const card = await createCard(fixture, 0)
    const attempts = [randomUUID(), randomUUID()]
    const results = await Promise.allSettled(attempts.map((jti) => stamp(fixture, card, jti)))

    const successes = results.filter((result) => result.status === 'fulfilled')
    const failures = results.filter((result) => result.status === 'rejected')
    assert(successes.length === 1, `Expected one concurrent stamp success; got ${describeSettled(results)}`)
    assert(failures.length === 1, `Expected one concurrent stamp failure; got ${describeSettled(results)}`)
    assert(getErrorCode(failures[0].reason) === 'RATE_LIMITED', `Expected RATE_LIMITED; got ${describeSettled(results)}`)

    const persisted = await prisma.cardInstance.findUniqueOrThrow({ where: { card_id: card.cardId } })
    const txCount = await prisma.stampTransaction.count({ where: { card_id: card.cardId } })
    assert(persisted.stamps_count === 1, `Expected card to have exactly one stamp; got ${persisted.stamps_count}`)
    assert(txCount === 1, `Expected exactly one stamp transaction; got ${txCount}`)
}

async function verifyNoOverfillOnConcurrentFinalStamp(fixture: Fixture) {
    const card = await createCard(fixture, 4)
    const results = await Promise.allSettled([stamp(fixture, card), stamp(fixture, card)])

    const successes = results.filter((result) => result.status === 'fulfilled')
    const failures = results.filter((result) => result.status === 'rejected')
    assert(successes.length === 1, `Expected one final stamp success; got ${describeSettled(results)}`)
    assert(failures.length === 1, `Expected one final stamp failure; got ${describeSettled(results)}`)
    assert(getErrorCode(failures[0].reason) === 'CARD_FULL', `Expected CARD_FULL; got ${describeSettled(results)}`)

    const persisted = await prisma.cardInstance.findUniqueOrThrow({ where: { card_id: card.cardId } })
    const txCount = await prisma.stampTransaction.count({ where: { card_id: card.cardId } })
    assert(persisted.stamps_count === 5, `Expected card to stop at 5 stamps; got ${persisted.stamps_count}`)
    assert(txCount === 1, `Expected exactly one final stamp transaction; got ${txCount}`)
}

async function verifyConcurrentRedeemCreatesOneNewCard(fixture: Fixture) {
    const card = await createCard(fixture, 5)
    const results = await Promise.allSettled([redeem(fixture, card), redeem(fixture, card)])

    const successes = results.filter((result) => result.status === 'fulfilled')
    const failures = results.filter((result) => result.status === 'rejected')
    assert(successes.length === 1, `Expected one redeem success; got ${describeSettled(results)}`)
    assert(failures.length === 1, `Expected one redeem failure; got ${describeSettled(results)}`)
    assert(getErrorCode(failures[0].reason) === 'CARD_NOT_ELIGIBLE', `Expected CARD_NOT_ELIGIBLE; got ${describeSettled(results)}`)

    const redeemedCard = await prisma.cardInstance.findUniqueOrThrow({ where: { card_id: card.cardId } })
    const redeemTxCount = await prisma.redemptionTransaction.count({ where: { card_id: card.cardId } })
    const activeCards = await prisma.cardInstance.count({
        where: {
            vendor_id: fixture.vendorId,
            member_id: card.memberId,
            status: 'ACTIVE'
        }
    })

    assert(redeemedCard.status === 'REDEEMED', `Expected original card to be REDEEMED; got ${redeemedCard.status}`)
    assert(redeemTxCount === 1, `Expected exactly one redemption transaction; got ${redeemTxCount}`)
    assert(activeCards === 1, `Expected exactly one replacement active card; got ${activeCards}`)
}

async function verifyDuplicateTokenStillReplays(fixture: Fixture) {
    const card = await createCard(fixture, 0)
    const jti = randomUUID()
    await stamp(fixture, card, jti)

    try {
        await stamp(fixture, card, jti)
        throw new Error('Expected duplicate token stamp to fail')
    } catch (error) {
        assert(getErrorCode(error) === 'TOKEN_REPLAYED', `Expected TOKEN_REPLAYED; got ${getErrorCode(error) ?? 'UNKNOWN'}`)
    }
}

async function main() {
    console.log('--- Verifying transaction integrity under concurrency ---')

    const fixture = await createFixture()
    try {
        await verifyConcurrentStampCooldown(fixture)
        console.log('PASSED: concurrent stamps serialize and enforce cooldown')

        await verifyNoOverfillOnConcurrentFinalStamp(fixture)
        console.log('PASSED: concurrent final stamps cannot overfill a card')

        await verifyConcurrentRedeemCreatesOneNewCard(fixture)
        console.log('PASSED: concurrent redeems create only one replacement active card')

        await verifyDuplicateTokenStillReplays(fixture)
        console.log('PASSED: duplicate token use still returns TOKEN_REPLAYED')

        console.log('--- Transaction integrity verification complete: PASS ---')
    } finally {
        await cleanupVendor(fixture.vendorId)
    }
}

main()
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
        await redis.quit()
    })
