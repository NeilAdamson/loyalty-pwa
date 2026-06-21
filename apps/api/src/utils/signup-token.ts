import { createHmac, randomBytes, timingSafeEqual } from 'crypto'

export function generateSignupSecret(): string {
    return randomBytes(32).toString('hex')
}

export function buildSignupPayload(vendorId: string, version: number, branchId?: string | null): string {
    return `${vendorId}:${version}:${branchId ?? ''}`
}

export function signSignupToken(
    secret: string,
    vendorId: string,
    version: number,
    branchId?: string | null
): string {
    const payload = buildSignupPayload(vendorId, version, branchId)
    return createHmac('sha256', secret).update(payload).digest('base64url').slice(0, 32)
}

export function verifySignupToken(
    secret: string,
    vendorId: string,
    version: number,
    branchId: string | null | undefined,
    sig: string
): boolean {
    if (!secret || !sig || typeof version !== 'number' || version < 1) {
        return false
    }
    const expected = signSignupToken(secret, vendorId, version, branchId)
    if (expected.length !== sig.length) {
        return false
    }
    try {
        return timingSafeEqual(Buffer.from(expected), Buffer.from(sig))
    } catch {
        return false
    }
}

export type SignupTokenInput = {
    v?: unknown
    s?: unknown
    b?: unknown
}

export function parseSignupTokenQuery(input: SignupTokenInput): {
    version: number | null
    sig: string | null
    branchId: string | null
} {
    const versionRaw = input.v
    const sigRaw = input.s
    const branchRaw = input.b

    const version =
        typeof versionRaw === 'string' || typeof versionRaw === 'number'
            ? Number(versionRaw)
            : null
    const sig = typeof sigRaw === 'string' && sigRaw.trim() ? sigRaw.trim() : null
    const branchId = typeof branchRaw === 'string' && branchRaw.trim() ? branchRaw.trim() : null

    return {
        version: version !== null && Number.isInteger(version) && version >= 0 ? version : null,
        sig,
        branchId,
    }
}
