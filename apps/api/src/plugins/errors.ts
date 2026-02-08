import fp from 'fastify-plugin'
import { FastifyError } from 'fastify'
import { Prisma } from '@prisma/client'

// Stable Error Codes
export const ERROR_CODES = {
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    UNAUTHORIZED: 'UNAUTHORIZED',
    FORBIDDEN: 'FORBIDDEN',
    NOT_FOUND: 'NOT_FOUND',
    CONFLICT: 'CONFLICT',
    INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
    // M2: Programs
    PROGRAM_ALREADY_ACTIVE: 'PROGRAM_ALREADY_ACTIVE',

    // M3: Card & Transactions
    TOKEN_REPLAYED: 'TOKEN_REPLAYED',
    CARD_ALREADY_ACTIVE: 'CARD_ALREADY_ACTIVE',
    CARD_NOT_ACTIVE: 'CARD_NOT_ACTIVE',
    CARD_FULL: 'CARD_FULL',
    CARD_NOT_ELIGIBLE: 'CARD_NOT_ELIGIBLE',
    RATE_LIMITED: 'RATE_LIMITED',
    // Auth
    OTP_EXPIRED: 'OTP_EXPIRED',
    OTP_INVALID: 'OTP_INVALID',
    OTP_RATE_LIMITED: 'OTP_RATE_LIMITED',
    VENDOR_SUSPENDED: 'VENDOR_SUSPENDED',
    STAFF_DISABLED: 'STAFF_DISABLED',
    STAFF_PIN_INVALID: 'STAFF_PIN_INVALID',
} as const

// Map constraint names to Error Codes
const CONSTRAINT_MAP: Record<string, string> = {
    'ux_programs_one_active_per_vendor': ERROR_CODES.PROGRAM_ALREADY_ACTIVE,
    'ux_cards_one_active_per_member_vendor': ERROR_CODES.CARD_ALREADY_ACTIVE,
}

export default fp(async (fastify) => {
    fastify.setErrorHandler((error: FastifyError & { statusCode?: number; message?: string }, request, reply) => {
        const status = typeof error.statusCode === 'number' ? error.statusCode : 500
        const message = typeof error.message === 'string' && error.message ? error.message : 'Critical Error'
        if (status >= 500) console.error('Server error:', error)
        return reply.status(status).send({ message })
    })
})
