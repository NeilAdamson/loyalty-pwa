import { describe, expect, it } from 'vitest'
import { generateSignupSecret, signSignupToken } from '../utils/signup-token'
import { SignupQrService } from './signup-qr.service'

describe('SignupQrService', () => {
    const vendorId = '550e8400-e29b-41d4-a716-446655440000'
    const secret = generateSignupSecret()

    it('requiresSignedUrl when version >= 1', () => {
        const svc = new SignupQrService({} as never)
        expect(svc.requiresSignedUrl(0)).toBe(false)
        expect(svc.requiresSignedUrl(1)).toBe(true)
    })

    it('buildSignupUrl includes signed params when version >= 1', () => {
        const svc = new SignupQrService({} as never)
        process.env.PUBLIC_APP_URL = 'https://example.test'
        const url = svc.buildSignupUrl('demo-cafe', secret, vendorId, 1)
        expect(url).toMatch(/^https:\/\/example\.test\/v\/demo-cafe\/login\?/)
        expect(url).toContain('v=1')
        expect(url).toContain('s=')
    })

    it('buildSignupUrl omits signature in legacy mode', () => {
        const svc = new SignupQrService({} as never)
        process.env.PUBLIC_APP_URL = 'https://example.test'
        const url = svc.buildSignupUrl('demo-cafe', secret, vendorId, 0)
        expect(url).toBe('https://example.test/v/demo-cafe/login')
    })

    it('buildSignupUrl adds branch param', () => {
        const svc = new SignupQrService({} as never)
        process.env.PUBLIC_APP_URL = 'https://example.test'
        const branchId = '660e8400-e29b-41d4-a716-446655440001'
        const url = svc.buildSignupUrl('demo-cafe', secret, vendorId, 1, branchId)
        const sig = signSignupToken(secret, vendorId, 1, branchId)
        expect(url).toContain(`b=${encodeURIComponent(branchId)}`)
        expect(url).toContain(`s=${encodeURIComponent(sig)}`)
    })
})
