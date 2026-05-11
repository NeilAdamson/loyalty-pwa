import { describe, expect, it } from 'vitest'
import {
    assertWebAuthnVendorMatch,
    packWebAuthnUserHandle,
    unpackWebAuthnUserHandle,
} from './webauthn-user-handle'

const VENDOR = '11111111-1111-1111-1111-111111111111'
const ACTOR = '22222222-2222-2222-2222-222222222222'

describe('packWebAuthnUserHandle / unpackWebAuthnUserHandle', () => {
    it('round-trips member', () => {
        const h = packWebAuthnUserHandle('member', VENDOR, ACTOR)
        expect(h.length).toBe(33)
        expect(unpackWebAuthnUserHandle(h)).toEqual({
            kind: 'member',
            vendorId: VENDOR,
            actorId: ACTOR,
        })
    })

    it('round-trips staff', () => {
        const h = packWebAuthnUserHandle('staff', VENDOR, ACTOR)
        expect(unpackWebAuthnUserHandle(h)).toEqual({
            kind: 'staff',
            vendorId: VENDOR,
            actorId: ACTOR,
        })
    })

    it('rejects wrong length', () => {
        expect(() => unpackWebAuthnUserHandle(Buffer.alloc(10))).toThrow()
    })
})

describe('assertWebAuthnVendorMatch', () => {
    it('passes when vendor matches', () => {
        expect(() => assertWebAuthnVendorMatch(VENDOR, VENDOR)).not.toThrow()
    })

    it('throws PASSKEY_VENDOR_MISMATCH when vendor differs', () => {
        expect(() => assertWebAuthnVendorMatch(VENDOR, ACTOR)).toThrow(/Passkey is not valid/)
    })
})
