import fp from 'fastify-plugin'
import cors from '@fastify/cors'

export default fp(async (fastify) => {
    await fastify.register(cors, {
        origin: ['http://localhost:5173', 'http://127.0.0.1:5173'], // Credentials require specific origin, not *
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    })
})
