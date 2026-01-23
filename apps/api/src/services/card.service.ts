import { PrismaClient } from '@prisma/client'
import { ERROR_CODES } from '../plugins/errors'

export class CardService {
    constructor(private prisma: PrismaClient) { }

    async getOrCreateActiveCard(vendorId: string, memberId: string) {
        // 1. Ensure Active Program exists
        const program = await this.prisma.program.findFirst({
            where: { vendor_id: vendorId, is_active: true }
        })

        if (!program) {
            // No active program = No card. 
            // Should we error or return null?
            // User requirement: "active card (or creates one if missing)". 
            // Implies we need a program to create one.
            throw {
                statusCode: 404,
                code: ERROR_CODES.NOT_FOUND,
                message: 'No active program found for this vendor'
            }
        }

        // 2. Find Existing Active Card
        // We look for 'ACTIVE' status.
        let card = await this.prisma.cardInstance.findFirst({
            where: {
                vendor_id: vendorId,
                member_id: memberId,
                status: 'ACTIVE'
            },
            include: {
                program: true // Return program details (stamps_required etc)
            }
        })

        if (card) {
            return card
        }

        // 3. Create New Card if none exists
        // Check for 'REDEEMED' cards? Replay logic handles new card creation on redeem.
        // Here we just want the current active one.
        // If they have no active card, we assume they are eligible for a new one
        // (unless DB constraint prevents it, but we filtered by ACTIVE).

        card = await this.prisma.cardInstance.create({
            data: {
                vendor_id: vendorId,
                member_id: memberId,
                program_id: program.program_id,
                status: 'ACTIVE',
                stamps_count: 0
            },
            include: {
                program: true
            }
        })

        return card
    }
}
