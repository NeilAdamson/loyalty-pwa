import { requireEnv } from './config'

export type WebAuthnConfig = {
    rpID: string
    rpName: string
    /** Allowed full origins (scheme + host + optional port), e.g. https://punchcard.co.za */
    origins: string[]
}

/** Validates WebAuthn-related env at process startup. */
export function loadWebAuthnConfig(): WebAuthnConfig {
    const rpID = requireEnv('WEBAUTHN_RP_ID').trim()
    const rpName = requireEnv('WEBAUTHN_RP_NAME').trim()
    const originsRaw = requireEnv('WEBAUTHN_ORIGIN')
    const origins = originsRaw
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean)
    if (origins.length === 0) {
        throw new Error('WEBAUTHN_ORIGIN must list at least one origin')
    }
    return { rpID, rpName, origins }
}
