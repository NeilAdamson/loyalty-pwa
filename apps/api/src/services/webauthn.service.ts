import { randomUUID } from 'crypto'
import type { Redis } from 'ioredis'
import type { PrismaClient } from '@prisma/client'
import {
    generateAuthenticationOptions,
    generateRegistrationOptions,
    verifyAuthenticationResponse,
    verifyRegistrationResponse,
} from '@simplewebauthn/server'
import type {
    AuthenticationResponseJSON,
    AuthenticatorTransportFuture,
    PublicKeyCredentialCreationOptionsJSON,
    PublicKeyCredentialDescriptorJSON,
    PublicKeyCredentialRequestOptionsJSON,
    RegistrationResponseJSON,
} from '@simplewebauthn/types'
import { ERROR_CODES } from '../plugins/errors'
import type { WebAuthnConfig } from '../utils/webauthn-config'
import { loadWebAuthnConfig } from '../utils/webauthn-config'
import type { RedisRateLimiter } from './redis-rate-limiter.service'
import { assertWebAuthnVendorMatch, packWebAuthnUserHandle, unpackWebAuthnUserHandle } from './webauthn-user-handle'

const STATE_PREFIX = 'webauthn:state:'
const STATE_TTL_SEC = 300

type StoredState = {
    challenge: string
    vendor_id: string
    mode: 'member_reg' | 'staff_reg' | 'member_auth' | 'staff_auth'
    member_id?: string
    staff_id?: string
}

function throwPasskeyInvalid(message = 'Passkey verification failed'): never {
    throw { statusCode: 400, code: ERROR_CODES.PASSKEY_INVALID, message }
}

function bufferToB64url(buf: Buffer): string {
    return Buffer.from(buf).toString('base64url')
}

function b64urlToBuffer(s: string): Buffer {
    return Buffer.from(s, 'base64url')
}

export class WebAuthnService {
    /** Set after first successful `loadWebAuthnConfig()` */
    private webAuthnCfg: WebAuthnConfig | null = null
    /** True if env was missing or invalid — do not retry load every request */
    private webAuthnCfgRejected = false

    constructor(
        private prisma: PrismaClient,
        private redis: Redis,
        private rateLimiter: RedisRateLimiter
    ) {}

    /**
     * WebAuthn env is validated only when passkey routes run, so admin/vendor OTP flows
     * keep working if production has not yet set WEBAUTHN_* variables.
     */
    private requireWebAuthnConfig(): WebAuthnConfig {
        if (this.webAuthnCfg) {
            return this.webAuthnCfg
        }
        if (this.webAuthnCfgRejected) {
            throw {
                statusCode: 503,
                code: ERROR_CODES.PASSKEY_NOT_SUPPORTED,
                message:
                    'Passkey sign-in is not configured on this server. Set WEBAUTHN_RP_ID, WEBAUTHN_RP_NAME, and WEBAUTHN_ORIGIN on the API.',
            }
        }
        try {
            this.webAuthnCfg = loadWebAuthnConfig()
            return this.webAuthnCfg
        } catch {
            this.webAuthnCfgRejected = true
            throw {
                statusCode: 503,
                code: ERROR_CODES.PASSKEY_NOT_SUPPORTED,
                message:
                    'Passkey sign-in is not configured on this server. Set WEBAUTHN_RP_ID, WEBAUTHN_RP_NAME, and WEBAUTHN_ORIGIN on the API.',
            }
        }
    }

    private assertOrigin(originHeader: string | undefined): string {
        const cfg = this.requireWebAuthnConfig()
        const origin = originHeader?.trim()
        if (!origin) {
            throwPasskeyInvalid('Missing Origin header')
        }
        if (!cfg.origins.includes(origin)) {
            throwPasskeyInvalid('Origin not allowed for WebAuthn')
        }
        return origin
    }

    private async saveState(state: StoredState): Promise<string> {
        const stateId = randomUUID()
        await this.redis.set(`${STATE_PREFIX}${stateId}`, JSON.stringify(state), 'EX', STATE_TTL_SEC)
        return stateId
    }

    private async consumeState(stateId: string): Promise<StoredState> {
        const key = `${STATE_PREFIX}${stateId}`
        const raw = await this.redis.get(key)
        await this.redis.del(key)
        if (!raw) {
            throwPasskeyInvalid('Passkey session expired. Please try again.')
        }
        try {
            return JSON.parse(raw) as StoredState
        } catch {
            throwPasskeyInvalid()
        }
    }

    async getMemberRegistrationOptions(input: {
        vendorId: string
        memberId: string
        phoneE164: string
        displayName: string
        clientIp: string
        origin: string | undefined
    }): Promise<{ optionsJSON: PublicKeyCredentialCreationOptionsJSON; stateId: string }> {
        this.assertOrigin(input.origin)
        await this.rateLimiter.assertPasskeyOptionsAllowed(input.clientIp)

        const cfg = this.requireWebAuthnConfig()
        const userHandle = packWebAuthnUserHandle('member', input.vendorId, input.memberId)
        const options = await generateRegistrationOptions({
            rpName: cfg.rpName,
            rpID: cfg.rpID,
            userID: userHandle,
            userName: input.phoneE164,
            userDisplayName: input.displayName || 'Member',
            attestationType: 'none',
            authenticatorSelection: {
                residentKey: 'preferred',
                userVerification: 'required',
            },
        })

        const stateId = await this.saveState({
            challenge: options.challenge,
            vendor_id: input.vendorId,
            mode: 'member_reg',
            member_id: input.memberId,
        })

        return { optionsJSON: options as PublicKeyCredentialCreationOptionsJSON, stateId }
    }

    async verifyMemberRegistration(input: {
        vendorId: string
        memberId: string
        stateId: string
        body: RegistrationResponseJSON
        origin: string | undefined
        clientIp: string
    }): Promise<{ webauthn_credential_id: string }> {
        const origin = this.assertOrigin(input.origin)
        await this.rateLimiter.assertPasskeyVerifyAllowed(input.clientIp)

        const state = await this.consumeState(input.stateId)
        if (state.mode !== 'member_reg' || state.vendor_id !== input.vendorId || state.member_id !== input.memberId) {
            throwPasskeyInvalid()
        }

        const verification = await verifyRegistrationResponse({
            response: input.body,
            expectedChallenge: state.challenge,
            expectedOrigin: origin,
            expectedRPID: this.requireWebAuthnConfig().rpID,
            requireUserVerification: true,
        })

        if (!verification.verified || !verification.registrationInfo) {
            throwPasskeyInvalid()
        }

        const info = verification.registrationInfo
        const credentialIdBuf = Buffer.from(info.credentialID, 'base64url')
        const publicKeyBuf = Buffer.from(info.credentialPublicKey)

        const row = await this.prisma.webAuthnCredential.create({
            data: {
                vendor_id: input.vendorId,
                member_id: input.memberId,
                credential_id: credentialIdBuf,
                public_key: publicKeyBuf,
                counter: BigInt(info.counter),
                transports: (input.body.response.transports ?? []) as string[],
                aaguid: info.aaguid ?? undefined,
                device_label: null,
                backup_eligible: info.credentialDeviceType === 'multiDevice',
                backup_state: info.credentialBackedUp === true,
            },
        })

        return { webauthn_credential_id: row.webauthn_credential_id }
    }

    async getStaffRegistrationOptions(input: {
        vendorId: string
        staffId: string
        username: string
        displayName: string
        clientIp: string
        origin: string | undefined
    }): Promise<{ optionsJSON: PublicKeyCredentialCreationOptionsJSON; stateId: string }> {
        this.assertOrigin(input.origin)
        await this.rateLimiter.assertPasskeyOptionsAllowed(input.clientIp)

        const cfg = this.requireWebAuthnConfig()
        const userHandle = packWebAuthnUserHandle('staff', input.vendorId, input.staffId)
        const options = await generateRegistrationOptions({
            rpName: cfg.rpName,
            rpID: cfg.rpID,
            userID: userHandle,
            userName: `${input.vendorId}:${input.username}`,
            userDisplayName: input.displayName || input.username,
            attestationType: 'none',
            authenticatorSelection: {
                residentKey: 'preferred',
                userVerification: 'required',
            },
        })

        const stateId = await this.saveState({
            challenge: options.challenge,
            vendor_id: input.vendorId,
            mode: 'staff_reg',
            staff_id: input.staffId,
        })

        return { optionsJSON: options as PublicKeyCredentialCreationOptionsJSON, stateId }
    }

    async verifyStaffRegistration(input: {
        vendorId: string
        staffId: string
        stateId: string
        body: RegistrationResponseJSON
        origin: string | undefined
        clientIp: string
    }): Promise<{ webauthn_credential_id: string }> {
        const origin = this.assertOrigin(input.origin)
        await this.rateLimiter.assertPasskeyVerifyAllowed(input.clientIp)

        const state = await this.consumeState(input.stateId)
        if (state.mode !== 'staff_reg' || state.vendor_id !== input.vendorId || state.staff_id !== input.staffId) {
            throwPasskeyInvalid()
        }

        const verification = await verifyRegistrationResponse({
            response: input.body,
            expectedChallenge: state.challenge,
            expectedOrigin: origin,
            expectedRPID: this.requireWebAuthnConfig().rpID,
            requireUserVerification: true,
        })

        if (!verification.verified || !verification.registrationInfo) {
            throwPasskeyInvalid()
        }

        const info = verification.registrationInfo
        const credentialIdBuf = Buffer.from(info.credentialID, 'base64url')
        const publicKeyBuf = Buffer.from(info.credentialPublicKey)

        const row = await this.prisma.webAuthnCredential.create({
            data: {
                vendor_id: input.vendorId,
                staff_id: input.staffId,
                credential_id: credentialIdBuf,
                public_key: publicKeyBuf,
                counter: BigInt(info.counter),
                transports: (input.body.response.transports ?? []) as string[],
                aaguid: info.aaguid ?? undefined,
                device_label: null,
                backup_eligible: info.credentialDeviceType === 'multiDevice',
                backup_state: info.credentialBackedUp === true,
            },
        })

        return { webauthn_credential_id: row.webauthn_credential_id }
    }

    async getMemberAuthenticationOptions(input: {
        vendorId: string
        phoneE164?: string
        clientIp: string
        origin: string | undefined
    }): Promise<{ optionsJSON: PublicKeyCredentialRequestOptionsJSON; stateId: string }> {
        this.assertOrigin(input.origin)
        await this.rateLimiter.assertPasskeyOptionsAllowed(input.clientIp)

        let allowCredentials: PublicKeyCredentialDescriptorJSON[] | undefined

        if (input.phoneE164) {
            const member = await this.prisma.member.findUnique({
                where: {
                    vendor_id_phone_e164: {
                        vendor_id: input.vendorId,
                        phone_e164: input.phoneE164,
                    },
                },
                select: { member_id: true },
            })
            if (!member) {
                throwPasskeyInvalid('No account found for this number')
            }
            const creds = await this.prisma.webAuthnCredential.findMany({
                where: {
                    vendor_id: input.vendorId,
                    member_id: member.member_id,
                    revoked_at: null,
                },
                select: { credential_id: true, transports: true },
            })
            if (creds.length === 0) {
                throwPasskeyInvalid('No passkey registered for this number')
            }
            allowCredentials = creds.map((c) => ({
                id: bufferToB64url(Buffer.from(c.credential_id)),
                type: 'public-key' as const,
                transports: (c.transports ?? []) as AuthenticatorTransportFuture[],
            }))
        }

        const cfg = this.requireWebAuthnConfig()
        const options = await generateAuthenticationOptions({
            rpID: cfg.rpID,
            userVerification: 'required',
            allowCredentials: allowCredentials && allowCredentials.length > 0 ? allowCredentials : undefined,
        })

        const stateId = await this.saveState({
            challenge: options.challenge,
            vendor_id: input.vendorId,
            mode: 'member_auth',
        })

        return { optionsJSON: options as PublicKeyCredentialRequestOptionsJSON, stateId }
    }

    async verifyMemberAuthentication(input: {
        vendorId: string
        stateId: string
        body: AuthenticationResponseJSON
        origin: string | undefined
        clientIp: string
    }): Promise<{ member_id: string }> {
        const origin = this.assertOrigin(input.origin)
        await this.rateLimiter.assertPasskeyVerifyAllowed(input.clientIp)

        const state = await this.consumeState(input.stateId)
        if (state.mode !== 'member_auth' || state.vendor_id !== input.vendorId) {
            throwPasskeyInvalid()
        }

        const credIdBuf = b64urlToBuffer(input.body.rawId)
        const dbCred = await this.prisma.webAuthnCredential.findFirst({
            where: {
                credential_id: credIdBuf,
                vendor_id: input.vendorId,
                revoked_at: null,
                member_id: { not: null },
            },
        })
        if (!dbCred || !dbCred.member_id) {
            throwPasskeyInvalid()
        }

        const assertionUserHandle =
            input.body.response.userHandle != null && input.body.response.userHandle !== ''
                ? b64urlToBuffer(input.body.response.userHandle)
                : null
        if (assertionUserHandle) {
            const parsed = unpackWebAuthnUserHandle(assertionUserHandle)
            assertWebAuthnVendorMatch(input.vendorId, parsed.vendorId)
            if (parsed.kind !== 'member' || parsed.actorId !== dbCred.member_id) {
                throw { statusCode: 403, code: ERROR_CODES.PASSKEY_VENDOR_MISMATCH, message: 'Passkey mismatch' }
            }
        }

        const verification = await verifyAuthenticationResponse({
            response: input.body,
            expectedChallenge: state.challenge,
            expectedOrigin: origin,
            expectedRPID: this.requireWebAuthnConfig().rpID,
            authenticator: {
                credentialID: bufferToB64url(Buffer.from(dbCred.credential_id)),
                credentialPublicKey: new Uint8Array(dbCred.public_key),
                counter: Number(dbCred.counter),
            },
            requireUserVerification: true,
        })

        if (!verification.verified || verification.authenticationInfo?.newCounter === undefined) {
            throwPasskeyInvalid()
        }

        const newCounter = verification.authenticationInfo.newCounter
        if (newCounter <= Number(dbCred.counter)) {
            throwPasskeyInvalid('Passkey counter regression')
        }

        await this.prisma.webAuthnCredential.update({
            where: { webauthn_credential_id: dbCred.webauthn_credential_id },
            data: {
                counter: BigInt(newCounter),
                last_used_at: new Date(),
            },
        })

        return { member_id: dbCred.member_id }
    }

    async getStaffAuthenticationOptions(input: {
        vendorId: string
        username?: string
        clientIp: string
        origin: string | undefined
    }): Promise<{ optionsJSON: PublicKeyCredentialRequestOptionsJSON; stateId: string }> {
        this.assertOrigin(input.origin)
        await this.rateLimiter.assertPasskeyOptionsAllowed(input.clientIp)

        let allowCredentials: PublicKeyCredentialDescriptorJSON[] | undefined

        if (input.username?.trim()) {
            const u = input.username.trim().toLowerCase()
            const staff = await this.prisma.staffUser.findFirst({
                where: { vendor_id: input.vendorId, username: u, status: 'ENABLED' },
                select: { staff_id: true },
            })
            if (!staff) {
                throwPasskeyInvalid('Unknown staff username')
            }
            const creds = await this.prisma.webAuthnCredential.findMany({
                where: {
                    vendor_id: input.vendorId,
                    staff_id: staff.staff_id,
                    revoked_at: null,
                },
                select: { credential_id: true, transports: true },
            })
            if (creds.length === 0) {
                throwPasskeyInvalid('No passkey registered for this username')
            }
            allowCredentials = creds.map((c) => ({
                id: bufferToB64url(Buffer.from(c.credential_id)),
                type: 'public-key' as const,
                transports: (c.transports ?? []) as AuthenticatorTransportFuture[],
            }))
        }

        const cfg = this.requireWebAuthnConfig()
        const options = await generateAuthenticationOptions({
            rpID: cfg.rpID,
            userVerification: 'required',
            allowCredentials: allowCredentials && allowCredentials.length > 0 ? allowCredentials : undefined,
        })

        const stateId = await this.saveState({
            challenge: options.challenge,
            vendor_id: input.vendorId,
            mode: 'staff_auth',
        })

        return { optionsJSON: options as PublicKeyCredentialRequestOptionsJSON, stateId }
    }

    async verifyStaffAuthentication(input: {
        vendorId: string
        stateId: string
        body: AuthenticationResponseJSON
        origin: string | undefined
        clientIp: string
    }): Promise<{ staff_id: string; role: string }> {
        const origin = this.assertOrigin(input.origin)
        await this.rateLimiter.assertPasskeyVerifyAllowed(input.clientIp)

        const state = await this.consumeState(input.stateId)
        if (state.mode !== 'staff_auth' || state.vendor_id !== input.vendorId) {
            throwPasskeyInvalid()
        }

        const credIdBuf = b64urlToBuffer(input.body.rawId)
        const dbCred = await this.prisma.webAuthnCredential.findFirst({
            where: {
                credential_id: credIdBuf,
                vendor_id: input.vendorId,
                revoked_at: null,
                staff_id: { not: null },
            },
        })
        if (!dbCred || !dbCred.staff_id) {
            throwPasskeyInvalid()
        }

        const assertionUserHandle =
            input.body.response.userHandle != null && input.body.response.userHandle !== ''
                ? b64urlToBuffer(input.body.response.userHandle)
                : null
        if (assertionUserHandle) {
            const parsed = unpackWebAuthnUserHandle(assertionUserHandle)
            assertWebAuthnVendorMatch(input.vendorId, parsed.vendorId)
            if (parsed.kind !== 'staff' || parsed.actorId !== dbCred.staff_id) {
                throw { statusCode: 403, code: ERROR_CODES.PASSKEY_VENDOR_MISMATCH, message: 'Passkey mismatch' }
            }
        }

        const verification = await verifyAuthenticationResponse({
            response: input.body,
            expectedChallenge: state.challenge,
            expectedOrigin: origin,
            expectedRPID: this.requireWebAuthnConfig().rpID,
            authenticator: {
                credentialID: bufferToB64url(Buffer.from(dbCred.credential_id)),
                credentialPublicKey: new Uint8Array(dbCred.public_key),
                counter: Number(dbCred.counter),
            },
            requireUserVerification: true,
        })

        if (!verification.verified || verification.authenticationInfo?.newCounter === undefined) {
            throwPasskeyInvalid()
        }

        const newCounter = verification.authenticationInfo.newCounter
        if (newCounter <= Number(dbCred.counter)) {
            throwPasskeyInvalid('Passkey counter regression')
        }

        await this.prisma.webAuthnCredential.update({
            where: { webauthn_credential_id: dbCred.webauthn_credential_id },
            data: {
                counter: BigInt(newCounter),
                last_used_at: new Date(),
            },
        })

        const staff = await this.prisma.staffUser.findFirst({
            where: { staff_id: dbCred.staff_id, vendor_id: input.vendorId, status: 'ENABLED' },
            select: { staff_id: true, role: true },
        })
        if (!staff) {
            throw { statusCode: 403, code: ERROR_CODES.STAFF_DISABLED, message: 'Staff account disabled' }
        }

        return { staff_id: staff.staff_id, role: staff.role }
    }

    async listMemberPasskeys(vendorId: string, memberId: string) {
        return this.prisma.webAuthnCredential.findMany({
            where: { vendor_id: vendorId, member_id: memberId, revoked_at: null },
            select: {
                webauthn_credential_id: true,
                device_label: true,
                created_at: true,
                last_used_at: true,
                transports: true,
            },
            orderBy: { created_at: 'desc' },
        })
    }

    async revokeMemberPasskey(vendorId: string, memberId: string, credentialRowId: string): Promise<void> {
        const res = await this.prisma.webAuthnCredential.updateMany({
            where: {
                webauthn_credential_id: credentialRowId,
                vendor_id: vendorId,
                member_id: memberId,
                revoked_at: null,
            },
            data: { revoked_at: new Date() },
        })
        if (res.count === 0) {
            throw { statusCode: 404, code: ERROR_CODES.NOT_FOUND, message: 'Passkey not found' }
        }
    }
}
