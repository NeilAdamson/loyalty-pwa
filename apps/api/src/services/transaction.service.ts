import { Prisma, PrismaClient } from '@prisma/client'
import { ERROR_CODES } from '../plugins/errors'
import type { RedisRateLimiter } from './redis-rate-limiter.service'

// Helper for cooldown check (e.g. 5 seconds)
const STAMP_COOLDOWN_MS = 5000

type LockedCardRow = {
    card_id: string
    vendor_id: string
    member_id: string
    program_id: string
    status: string
    stamps_count: number
    stamps_required: number
    max_stamps_per_day: number
}

type TransactionClient = Prisma.TransactionClient

type TransactionTokenPayload = {
    card_id: string
    member_id: string
    jti: string
}

function appError(statusCode: number, code: string, message: string) {
    return { statusCode, code, message }
}

function isUniqueConstraintError(error: unknown) {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
}

function utcDayStart(now = new Date()): Date {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
}

export class TransactionService {
    constructor(
        private prisma: PrismaClient,
        private rateLimiter: RedisRateLimiter
    ) { }

    private async lockCardForUpdate(tx: TransactionClient, vendorId: string, cardId: string) {
        const rows = await tx.$queryRaw<LockedCardRow[]>`
            SELECT
                c.card_id::text AS card_id,
                c.vendor_id::text AS vendor_id,
                c.member_id::text AS member_id,
                c.program_id::text AS program_id,
                c.status,
                c.stamps_count,
                p.stamps_required,
                p.max_stamps_per_day
            FROM "card_instances" c
            INNER JOIN "programs" p ON p.program_id = c.program_id
            WHERE c.card_id = ${cardId}::uuid
              AND c.vendor_id = ${vendorId}::uuid
            FOR UPDATE OF c
        `

        const card = rows[0]
        if (!card) {
            throw appError(404, ERROR_CODES.NOT_FOUND, 'Card not found')
        }

        return card
    }

    private async markTokenUsed(tx: TransactionClient, vendorId: string, jti: string) {
        try {
            await tx.tokenUse.create({
                data: { vendor_id: vendorId, token_jti: jti }
            })
        } catch (error) {
            if (isUniqueConstraintError(error)) {
                throw appError(409, ERROR_CODES.TOKEN_REPLAYED, 'This token has already been used')
            }
            throw error
        }
    }

    async stamp(vendorId: string, staffId: string, branchId: string, payload: TransactionTokenPayload) {
        const { card_id, jti, member_id } = payload

        await this.rateLimiter.consumeStaffStampHour(staffId)
        try {
            return await this.prisma.$transaction(async (tx) => {
                const card = await this.lockCardForUpdate(tx, vendorId, card_id)

                const dayStart = utcDayStart()
                const stampsToday = await tx.stampTransaction.count({
                    where: {
                        card_id,
                        stamped_at: { gte: dayStart },
                    },
                })
                if (stampsToday >= card.max_stamps_per_day) {
                    throw appError(429, ERROR_CODES.RATE_LIMITED, 'Daily stamp limit reached for this card')
                }

                await this.markTokenUsed(tx, vendorId, jti)

                if (card.member_id !== member_id) {
                    throw appError(404, ERROR_CODES.NOT_FOUND, 'Card not found')
                }

                if (card.status !== 'ACTIVE') {
                    throw appError(409, ERROR_CODES.CARD_NOT_ACTIVE, 'Card is not active')
                }

                if (card.stamps_count >= card.stamps_required) {
                    throw appError(400, ERROR_CODES.CARD_FULL, 'Card is already full, ready to redeem')
                }

                const lastTx = await tx.stampTransaction.findFirst({
                    where: { card_id, vendor_id: vendorId },
                    orderBy: { stamped_at: 'desc' },
                })
                if (lastTx) {
                    const diff = Date.now() - lastTx.stamped_at.getTime()
                    if (diff < STAMP_COOLDOWN_MS) {
                        throw appError(429, ERROR_CODES.RATE_LIMITED, 'Stamping too fast')
                    }
                }

                const updatedCard = await tx.cardInstance.update({
                    where: { card_id },
                    data: { stamps_count: { increment: 1 } },
                    include: { program: true },
                })

                await tx.stampTransaction.create({
                    data: {
                        vendor_id: vendorId,
                        card_id,
                        staff_id: staffId,
                        branch_id: branchId,
                        token_jti: jti,
                    },
                })

                return updatedCard
            })
        } catch (e) {
            await this.rateLimiter.rollbackStaffStampHour(staffId)
            throw e
        }
    }

    async redeem(vendorId: string, staffId: string, branchId: string, payload: TransactionTokenPayload) {
        const { card_id, jti, member_id } = payload

        await this.rateLimiter.consumeStaffRedeemHour(staffId)
        try {
            return await this.prisma.$transaction(async (tx) => {
                const card = await this.lockCardForUpdate(tx, vendorId, card_id)

                await this.markTokenUsed(tx, vendorId, jti)

                if (card.member_id !== member_id) {
                    throw appError(404, ERROR_CODES.NOT_FOUND, 'Card not found')
                }

                if (card.status !== 'ACTIVE') {
                    throw appError(409, ERROR_CODES.CARD_NOT_ELIGIBLE, 'Card not active')
                }

                if (card.stamps_count < card.stamps_required) {
                    throw appError(400, ERROR_CODES.CARD_NOT_ELIGIBLE, 'Card does not have enough stamps')
                }

                await tx.cardInstance.update({
                    where: { card_id },
                    data: {
                        status: 'REDEEMED',
                        redeemed_at: new Date(),
                    },
                })

                await tx.redemptionTransaction.create({
                    data: {
                        vendor_id: vendorId,
                        card_id,
                        staff_id: staffId,
                        branch_id: branchId,
                        token_jti: jti,
                    },
                })

                const activeProgram = await tx.program.findFirst({
                    where: { vendor_id: vendorId, is_active: true },
                })

                let newCard = null
                if (activeProgram) {
                    newCard = await tx.cardInstance.create({
                        data: {
                            vendor_id: vendorId,
                            member_id: member_id,
                            program_id: activeProgram.program_id,
                            status: 'ACTIVE',
                            stamps_count: 0,
                        },
                    })
                }

                return { redeemed_card_id: card_id, new_card: newCard }
            })
        } catch (e) {
            await this.rateLimiter.rollbackStaffRedeemHour(staffId)
            throw e
        }
    }
}
