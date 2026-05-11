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
    // WebAuthn / passkeys
    PASSKEY_INVALID: 'PASSKEY_INVALID',
    PASSKEY_VENDOR_MISMATCH: 'PASSKEY_VENDOR_MISMATCH',
    PASSKEY_RATE_LIMITED: 'PASSKEY_RATE_LIMITED',
    PASSKEY_NOT_SUPPORTED: 'PASSKEY_NOT_SUPPORTED',
} as const

type ApiError = FastifyError & {
    statusCode?: number
    code?: string
    retryAfterSec?: number
}

// Map constraint names to Error Codes
const CONSTRAINT_MAP: Record<string, string> = {
    'ux_programs_one_active_per_vendor': ERROR_CODES.PROGRAM_ALREADY_ACTIVE,
    'ux_cards_one_active_per_member_vendor': ERROR_CODES.CARD_ALREADY_ACTIVE,
    'token_use_pkey': ERROR_CODES.TOKEN_REPLAYED,
}

function getUniqueConstraintCode(error: Prisma.PrismaClientKnownRequestError) {
    const target = error.meta?.target
    const targetText = Array.isArray(target) ? target.join(',') : typeof target === 'string' ? target : ''

    if (targetText.includes('vendor_id') && targetText.includes('token_jti')) {
        return ERROR_CODES.TOKEN_REPLAYED
    }

    return CONSTRAINT_MAP[targetText] ?? ERROR_CODES.CONFLICT
}

export default fp(async (fastify) => {
    fastify.setErrorHandler((error: ApiError, _request, reply) => {
        let status = typeof error.statusCode === 'number' ? error.statusCode : 500
        let code = error.code
        let message = typeof error.message === 'string' && error.message ? error.message : 'Critical Error'

        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            status = 409
            code = getUniqueConstraintCode(error)
            message = code === ERROR_CODES.TOKEN_REPLAYED ? 'This token has already been used' : 'Unique constraint violation'
        }

        if (status >= 500) console.error('Server error:', error)

        const retryAfterSec =
            typeof (error as ApiError).retryAfterSec === 'number'
                ? (error as ApiError).retryAfterSec
                : undefined
        if (typeof retryAfterSec === 'number' && retryAfterSec > 0) {
            reply.header('Retry-After', String(Math.ceil(retryAfterSec)))
        }

        const payload: { code: string; message: string; retry_after_sec?: number } = {
            code: code ?? ERROR_CODES.INTERNAL_SERVER_ERROR,
            message,
        }
        if (typeof retryAfterSec === 'number' && retryAfterSec > 0) {
            payload.retry_after_sec = Math.ceil(retryAfterSec)
        }

        return reply.status(status).send(payload)
    })
})
