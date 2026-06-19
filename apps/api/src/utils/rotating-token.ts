import type { FastifyInstance } from 'fastify'

export type RotatingTokenPayload = {
    vendor_id: string
    member_id: string
    card_id: string
    jti: string
}

function invalidTokenError() {
    return {
        statusCode: 401,
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired rotating token',
    }
}

export function parseRotatingTokenPayload(payload: unknown): RotatingTokenPayload {
    if (!payload || typeof payload !== 'object') {
        throw invalidTokenError()
    }

    const candidate = payload as Record<string, unknown>
    const { vendor_id, member_id, card_id, jti } = candidate

    if (
        typeof vendor_id !== 'string' ||
        typeof member_id !== 'string' ||
        typeof card_id !== 'string' ||
        typeof jti !== 'string' ||
        !vendor_id ||
        !member_id ||
        !card_id ||
        !jti
    ) {
        throw invalidTokenError()
    }

    return { vendor_id, member_id, card_id, jti }
}

export async function verifyRotatingToken(
    fastify: FastifyInstance,
    token: string
): Promise<RotatingTokenPayload> {
    try {
        const payload = await fastify.jwt.rotatingToken.verify(token)
        return parseRotatingTokenPayload(payload)
    } catch (err) {
        if (typeof err === 'object' && err !== null && 'statusCode' in err) {
            throw err
        }
        throw invalidTokenError()
    }
}
