import fp from 'fastify-plugin'
import cors from '@fastify/cors'

export default fp(async (fastify) => {
    await fastify.register(cors, {
        origin: '*', // For dev only. In prod, list specific domains.
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    })
})
