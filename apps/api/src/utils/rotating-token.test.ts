import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import fastify from 'fastify'
import fastifyJwt from '@fastify/jwt'
import { parseRotatingTokenPayload, verifyRotatingToken } from './rotating-token'

const TOKEN_SECRET = 'test_token_signing_secret'
const JWT_SECRET = 'test_jwt_secret_value'

async function buildTestServer() {
    const app = fastify()
    await app.register(fastifyJwt, { secret: JWT_SECRET })
    await app.register(fastifyJwt, {
        secret: TOKEN_SECRET,
        namespace: 'rotatingToken',
        jwtSign: 'rotatingTokenSign',
    })
    await app.ready()
    return app
}

describe('rotating-token utils', () => {
    let app: Awaited<ReturnType<typeof buildTestServer>>

    beforeEach(async () => {
        app = await buildTestServer()
    })

    afterEach(async () => {
        await app.close()
    })

    it('signs and verifies a rotating token round-trip', async () => {
        const payload = {
            vendor_id: 'vendor-1',
            member_id: 'member-1',
            card_id: 'card-1',
            jti: 'jti-1',
        }

        const token = app.jwt.rotatingToken.sign(payload, { expiresIn: 30 })
        const verified = await verifyRotatingToken(app, token)

        expect(verified).toEqual(payload)
    })

    it('rejects a token signed with JWT_SECRET', async () => {
        const token = app.jwt.sign(
            {
                vendor_id: 'vendor-1',
                member_id: 'member-1',
                card_id: 'card-1',
                jti: 'jti-1',
            },
            { expiresIn: 30 }
        )

        await expect(verifyRotatingToken(app, token)).rejects.toMatchObject({
            statusCode: 401,
            code: 'INVALID_TOKEN',
        })
    })

    it('rejects payload missing card_id or jti', () => {
        expect(() => parseRotatingTokenPayload({ vendor_id: 'v', member_id: 'm' })).toThrow(
            expect.objectContaining({ code: 'INVALID_TOKEN' })
        )
        expect(() =>
            parseRotatingTokenPayload({ vendor_id: 'v', member_id: 'm', card_id: 'c' })
        ).toThrow(expect.objectContaining({ code: 'INVALID_TOKEN' }))
    })
})
