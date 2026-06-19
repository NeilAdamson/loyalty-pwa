import fp from 'fastify-plugin'
import fastifyJwt, { type JWT } from '@fastify/jwt'
import { requireSecret } from '../utils/config'
import type { RotatingTokenPayload } from '../utils/rotating-token'

declare module '@fastify/jwt' {
    interface JWT {
        rotatingToken: Pick<JWT, 'sign' | 'verify' | 'decode' | 'options' | 'lookupToken'>
    }
}

declare module 'fastify' {
    interface FastifyReply {
        rotatingTokenSign(
            payload: RotatingTokenPayload,
            options?: { expiresIn?: number }
        ): Promise<string>
    }
}

export default fp(async (fastify) => {    await fastify.register(fastifyJwt, {
        secret: requireSecret('TOKEN_SIGNING_SECRET'),
        namespace: 'rotatingToken',
        jwtSign: 'rotatingTokenSign',
    })
})
