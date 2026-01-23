import { PrismaClient } from '@prisma/client'
import { ERROR_CODES } from '../plugins/errors'

// Helper for cooldown check (e.g. 5 seconds)
const STAMP_COOLDOWN_MS = 5000

export class TransactionService {
    constructor(private prisma: PrismaClient) { }

    /**
     * Parse and Validate Rotating Token Payload
     * Note: Signature verification happens in the Route via fastify.jwt.verify
     * Here we check logical constraints (Replay, Expiry if not checked by JWT)
     */
    async validateToken(vendorId: string, jti: string) {
        // 1. Check Replay Protection
        const used = await this.prisma.tokenUse.findUnique({
            where: {
                vendor_id_token_jti: {
                    vendor_id: vendorId,
                    token_jti: jti
                }
            }
        })
        if (used) {
            throw {
                statusCode: 409,
                code: 'TOKEN_REPLAYED',
                message: 'This token has already been used'
            }
        }
    }

    async stamp(vendorId: string, staffId: string, branchId: string, payload: any) {
        const { card_id, jti } = payload

        // 1. Validate Token Replay
        await this.validateToken(vendorId, jti)

        // 2. Fetch Card + Status Check
        const card = await this.prisma.cardInstance.findUnique({
            where: { card_id },
            include: { program: true }
        })

        if (!card || card.status !== 'ACTIVE') {
            throw {
                statusCode: 409, // Conflict with state
                code: ERROR_CODES.CARD_ALREADY_ACTIVE, // Not quite, maybe CARD_NOT_ACTIVE
                message: 'Card is not active'
            }
        }

        if (card.vendor_id !== vendorId) {
            throw { statusCode: 404, code: ERROR_CODES.NOT_FOUND, message: 'Card not found' }
        }

        // 3. Check Card Full?
        if (card.stamps_count >= card.program.stamps_required) {
            throw {
                statusCode: 400,
                code: 'CARD_FULL',
                message: 'Card is already full, ready to redeem'
            }
        }

        // 4. Cooldown Check
        // Find last stamp transaction for this card
        const lastTx = await this.prisma.stampTransaction.findFirst({
            where: { card_id },
            orderBy: { stamped_at: 'desc' }
        })
        if (lastTx) {
            const diff = Date.now() - lastTx.stamped_at.getTime()
            if (diff < STAMP_COOLDOWN_MS) {
                throw {
                    statusCode: 429,
                    code: 'RATE_LIMITED',
                    message: 'Stamping too fast'
                }
            }
        }

        // 5. Atomic Transaction
        return this.prisma.$transaction(async (tx) => {
            // A. Mark Token Used
            await tx.tokenUse.create({
                data: { vendor_id: vendorId, token_jti: jti }
            })

            // B. Increment Stamp
            const updatedCard = await tx.cardInstance.update({
                where: { card_id },
                data: { stamps_count: { increment: 1 } },
                include: { program: true }
            })

            // C. Log Transaction
            await tx.stampTransaction.create({
                data: {
                    vendor_id: vendorId,
                    card_id,
                    staff_id: staffId,
                    branch_id: branchId,
                    token_jti: jti,
                }
            })

            return updatedCard
        })
    }

    async redeem(vendorId: string, staffId: string, branchId: string, payload: any) {
        const { card_id, jti, member_id } = payload

        // 1. Validate Token Replay
        await this.validateToken(vendorId, jti)

        // 2. Fetch Card
        const card = await this.prisma.cardInstance.findUnique({
            where: { card_id },
            include: { program: true }
        })

        if (!card || card.status !== 'ACTIVE') {
            throw { statusCode: 409, code: 'CARD_NOT_ELIGIBLE', message: 'Card not active' }
        }

        // 3. Check Eligibility
        if (card.stamps_count < card.program.stamps_required) {
            throw {
                statusCode: 400,
                code: 'CARD_NOT_ELIGIBLE',
                message: 'Card does not have enough stamps'
            }
        }

        // 4. Atomic Transaction
        return this.prisma.$transaction(async (tx) => {
            // A. Mark Token Used
            await tx.tokenUse.create({
                data: { vendor_id: vendorId, token_jti: jti }
            })

            // B. Mark Old Card Redeemed
            await tx.cardInstance.update({
                where: { card_id },
                data: {
                    status: 'REDEEMED',
                    redeemed_at: new Date()
                }
            })

            // C. Log Redemption
            await tx.redemptionTransaction.create({
                data: {
                    vendor_id: vendorId,
                    card_id,
                    staff_id: staffId,
                    branch_id: branchId,
                    token_jti: jti
                }
            })

            // D. Create New Active Card (if Active Program exists)
            // We need to fetch active program again to ensure we use current version?
            // Or just use the same program ID? 
            // Usually, we want the LATEST active program.
            const activeProgram = await tx.program.findFirst({
                where: { vendor_id: vendorId, is_active: true }
            })

            let newCard = null
            if (activeProgram) {
                newCard = await tx.cardInstance.create({
                    data: {
                        vendor_id: vendorId,
                        member_id: member_id,
                        program_id: activeProgram.program_id,
                        status: 'ACTIVE',
                        stamps_count: 0
                    }
                })
            }

            return { redeemed_card_id: card_id, new_card: newCard }
        })
    }
}
