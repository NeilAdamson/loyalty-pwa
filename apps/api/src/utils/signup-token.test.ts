import { describe, expect, it } from 'vitest'
import {
    buildSignupPayload,
    generateSignupSecret,
    parseSignupTokenQuery,
    signSignupToken,
    verifySignupToken,
} from './signup-token'

describe('signup-token utils', () => {
    const secret = generateSignupSecret()
    const vendorId = '550e8400-e29b-41d4-a716-446655440000'
    const branchId = '660e8400-e29b-41d4-a716-446655440001'

    it('generates a 64-char hex secret', () => {
        expect(generateSignupSecret()).toMatch(/^[0-9a-f]{64}$/)
    })

    it('signs and verifies vendor-level token', () => {
        const sig = signSignupToken(secret, vendorId, 1)
        expect(verifySignupToken(secret, vendorId, 1, null, sig)).toBe(true)
        expect(verifySignupToken(secret, vendorId, 1, undefined, sig)).toBe(true)
    })

    it('signs and verifies branch-specific token', () => {
        const sig = signSignupToken(secret, vendorId, 2, branchId)
        expect(verifySignupToken(secret, vendorId, 2, branchId, sig)).toBe(true)
        expect(verifySignupToken(secret, vendorId, 2, null, sig)).toBe(false)
    })

    it('rejects wrong version or secret', () => {
        const sig = signSignupToken(secret, vendorId, 1)
        expect(verifySignupToken('wrong-secret', vendorId, 1, null, sig)).toBe(false)
        expect(verifySignupToken(secret, vendorId, 2, null, sig)).toBe(false)
    })

    it('buildSignupPayload is stable', () => {
        expect(buildSignupPayload(vendorId, 1, branchId)).toBe(`${vendorId}:1:${branchId}`)
        expect(buildSignupPayload(vendorId, 1)).toBe(`${vendorId}:1:`)
    })

    it('parseSignupTokenQuery normalizes query fields', () => {
        expect(parseSignupTokenQuery({ v: '1', s: 'abc', b: branchId })).toEqual({
            version: 1,
            sig: 'abc',
            branchId,
        })
        expect(parseSignupTokenQuery({})).toEqual({
            version: null,
            sig: null,
            branchId: null,
        })
    })
})
