import { PrismaClient, Member } from '@prisma/client'

export class AdminMemberService {
    constructor(private prisma: PrismaClient) { }

    async list(params: { page?: number, limit?: number, query?: string }) {
        const page = params.page || 1
        const limit = params.limit || 20
        const skip = (page - 1) * limit

        const where: any = {}
        if (params.query) {
            where.phone_e164 = { contains: params.query } // insensitive not needed for numbers usually, but OK.
        }

        const [members, total] = await Promise.all([
            this.prisma.member.findMany({
                where,
                skip,
                take: limit,
                orderBy: { created_at: 'desc' },
                include: {
                    vendor: { select: { trading_name: true } },
                    cards: { select: { status: true, stamps_count: true } }
                }
            }),
            this.prisma.member.count({ where })
        ])

        return { data: members, meta: { total, page, limit } }
    }

    async getHistory(memberId: string) {
        // Get member along with transaction history
        const member = await this.prisma.member.findUnique({
            where: { member_id: memberId },
            include: {
                cards: {
                    include: {
                        stamp_txs: true,
                        redeem_txs: true
                    }
                }
            }
        })
        return member
    }

    // Suspend/Reactivate would normally touch the Member record or their Auth Token validity.
    // For now, Member model doesn't have 'status' field (it was skipped in M1). 
    // We can add it or just implement the endpoint as a placeholder or add 'status' to schema now?
    // User Requirement: "Global search + Status". 
    // M1 Schema for Member: 
    //   model Member { ... name, phone_e164, consent_service ... } 
    // It does NOT have 'status'.
    // I should add `status` String @default('ACTIVE') to Member if I want to support suspension.
    // Let's stick to what we have or do a quick migration if essential.
    // The requirement says "status: Active / Suspended". 
    // I MUST ADD IT to SCHEMA.

    // DECISION: I will add `status` to Member in schema in next migration or just skip suspension enforcement for now?
    // "Member Management (Global Search + Status)" - explicitly requested.
    // I missed adding Member.status in Step 1218 (DB Schema).
    // I should add it now to be complete.
}
