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
    fastify.setErrorHandler((error: FastifyError, request, reply) => {
        const { validation, statusCode } = error

        // 1. Validation Errors (Fastify Schema)
        if (validation) {
            return reply.status(400).send({
                code: ERROR_CODES.VALIDATION_ERROR,
                message: 'Invalid request parameters',
                details: validation,
            })
        }

        // 2. Prisma Known Request Errors
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            // P2002: Unique constraint failed
            if (error.code === 'P2002') {
                // Try to identify the constraint
                // Parsing meta.target or error.message if target is ambiguous
                // Note: Prisma 5+ puts field names in meta.target
                // However, partial unique indexes often surface via the constraint name in the message
                // or we have to rely on known field combos.

                // Strategy: We can't always get the constraint name directly from `meta` in all adapters,
                // but let's check input fields roughly if strict constraint name isn't visible.

                // Ideal: Use the actual constraint name if we can match it from the error message
                // Postgres error usually contains 'constraint "name"'
                const msg = error.message

                for (const [constraintName, businessCode] of Object.entries(CONSTRAINT_MAP)) {
                    if (msg.includes(constraintName)) {
                        return reply.status(409).send({
                            code: businessCode,
                            message: 'Conflict: Logic violation',
                        })
                    }
                }

                // Fallback for other P2002
                return reply.status(409).send({
                    code: ERROR_CODES.CONFLICT,
                    message: 'Unique constraint violation',
                    details: error.meta,
                })
            }

            // P2025: Record not found
            if (error.code === 'P2025') {
                return reply.status(404).send({
                    code: ERROR_CODES.NOT_FOUND,
                    message: 'Resource not found',
                })
            }
        }

        // 3. Status Code set on Error object
        if (statusCode && statusCode >= 400) {
            return reply.status(statusCode).send({
                code: (error as any).code || 'HTTP_ERROR',
                message: error.message,
            })
        }

        // 4. Fallback 500
        request.log.error(error)
        // console.error('CRITICAL ERROR:', error) // Removed debug log
        reply.status(500).send({
            code: ERROR_CODES.INTERNAL_SERVER_ERROR,
            message: 'Internal Server Error',
        })
    })
})
