import { PrismaClient } from '@prisma/client'
import { ERROR_CODES } from '../plugins/errors'

export type ProgramInput = {
    stamps_required: number
    max_stamps_per_day: number
    reward_title: string
    reward_description: string
    terms_text: string
}

export class ProgramService {
    constructor(private prisma: PrismaClient) { }

    async createDraft(vendorId: string, data: { stamps_required: number; max_stamps_per_day?: number; reward_title: string; reward_description?: string; terms_text?: string }) {
        // 1. Determine next version
        // We could use an aggregate, or just let DB handle it?
        // DB doesn't auto-increment version relative to vendor_id easily without logic.
        // Let's find max version.
        const lastProgram = await this.prisma.program.findFirst({
            where: { vendor_id: vendorId },
            orderBy: { version: 'desc' }
        })
        const nextVersion = (lastProgram?.version || 0) + 1

        return this.prisma.program.create({
            data: {
                vendor_id: vendorId,
                version: nextVersion,
                is_active: false, // DRAFT
                stamps_required: data.stamps_required,
                max_stamps_per_day: data.max_stamps_per_day !== undefined ? data.max_stamps_per_day : 3,
                reward_title: data.reward_title,
                reward_description: data.reward_description || '',
                terms_text: data.terms_text || ''
            }
        })
    }

    async activateProgram(vendorId: string, programId: string) {
        // 1. Check existence and ownership
        const program = await this.prisma.program.findUnique({
            where: { program_id: programId }
        })

        if (!program || program.vendor_id !== vendorId) {
            throw { statusCode: 404, code: ERROR_CODES.NOT_FOUND, message: 'Program not found' }
        }

        if (program.is_active) {
            // Idempotent success
            return program
        }

        // 2. Atomic Transaction
        const [_, updatedProgram] = await this.prisma.$transaction([
            // Deactivate all for this vendor
            this.prisma.program.updateMany({
                where: { vendor_id: vendorId, is_active: true },
                data: { is_active: false }
            }),
            // Activate target
            this.prisma.program.update({
                where: { program_id: programId },
                data: { is_active: true }
            })
        ])

        return updatedProgram
    }

    async getActiveProgram(vendorId: string) {
        return this.prisma.program.findFirst({
            where: { vendor_id: vendorId, is_active: true }
        })
    }

    async listPrograms(vendorId: string) {
        return this.prisma.program.findMany({
            where: { vendor_id: vendorId },
            orderBy: { version: 'desc' },
            include: {
                _count: {
                    select: { cards: true }
                }
            }
        })
    }

    async createActiveVersion(vendorId: string, data: ProgramInput) {
        const [lastProgram, activeProgram] = await Promise.all([
            this.prisma.program.findFirst({
                where: { vendor_id: vendorId },
                orderBy: { version: 'desc' }
            }),
            this.getActiveProgram(vendorId)
        ])

        const unchanged = activeProgram
            && activeProgram.stamps_required === data.stamps_required
            && activeProgram.max_stamps_per_day === data.max_stamps_per_day
            && activeProgram.reward_title === data.reward_title
            && activeProgram.reward_description === data.reward_description
            && activeProgram.terms_text === data.terms_text

        if (unchanged) {
            return {
                program: activeProgram,
                previousProgram: activeProgram,
                created: false
            }
        }

        const nextVersion = (lastProgram?.version || 0) + 1

        const program = await this.prisma.$transaction(async (tx) => {
            await tx.program.updateMany({
                where: { vendor_id: vendorId, is_active: true },
                data: { is_active: false }
            })

            return tx.program.create({
                data: {
                    vendor_id: vendorId,
                    version: nextVersion,
                    is_active: true,
                    stamps_required: data.stamps_required,
                    max_stamps_per_day: data.max_stamps_per_day,
                    reward_title: data.reward_title,
                    reward_description: data.reward_description,
                    terms_text: data.terms_text
                }
            })
        })

        return {
            program,
            previousProgram: activeProgram,
            created: true
        }
    }
}
