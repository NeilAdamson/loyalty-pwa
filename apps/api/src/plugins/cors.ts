import fp from 'fastify-plugin'
import cors from '@fastify/cors'

export default fp(async (fastify) => {
    const allowedOrigins = [
        'http://localhost:5173',
        'http://127.0.0.1:5173'
    ];

    if (process.env.CORS_ALLOWED_ORIGIN) {
        allowedOrigins.push(process.env.CORS_ALLOWED_ORIGIN);
    }

    await fastify.register(cors, {
        origin: allowedOrigins,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    })
})
