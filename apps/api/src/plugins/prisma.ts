import fp from 'fastify-plugin'
import { FastifyPluginAsync } from 'fastify'
import { PrismaClient } from '@prisma/client'

// Declare declaration merging for Fastify instance
declare module 'fastify' {
    interface FastifyInstance {
        prisma: PrismaClient
    }
}

const prismaPlugin: FastifyPluginAsync = async (fastify) => {
    const prisma = new PrismaClient()

    await prisma.$connect()

    fastify.decorate('prisma', prisma)

    fastify.addHook('onClose', async (server) => {
        await server.prisma.$disconnect()
    })
}

export default fp(prismaPlugin)
