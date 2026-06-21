import { FastifyInstance } from 'fastify'
import { verifyAdmin } from './middleware'
import { FRAUD_ACTIONS } from '../../services/fraud-event.service'

const FRAUD_ACTION_VALUES = Object.values(FRAUD_ACTIONS)

export async function adminFraudRoutes(fastify: FastifyInstance) {
    fastify.get('/fraud-events', { preHandler: [verifyAdmin] }, async (request) => {
        const query = request.query as { page?: string; limit?: string; vendor_id?: string; action?: string }
        const page = Math.max(Number(query.page) || 1, 1)
        const limit = Math.min(Math.max(Number(query.limit) || 50, 1), 100)
        const actionFilter =
            query.action && FRAUD_ACTION_VALUES.includes(query.action as (typeof FRAUD_ACTION_VALUES)[number])
                ? query.action
                : undefined

        const where = {
            action: actionFilter ?? { startsWith: 'FRAUD_' },
            ...(query.vendor_id ? { vendor_id: query.vendor_id } : {}),
        }

        const [total, events] = await Promise.all([
            fastify.prisma.adminAuditLog.count({ where }),
            fastify.prisma.adminAuditLog.findMany({
                where,
                orderBy: { created_at: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
                include: {
                    vendor: {
                        select: {
                            trading_name: true,
                            vendor_slug: true,
                        },
                    },
                },
            }),
        ])

        return {
            data: events,
            meta: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit) || 1,
            },
        }
    })
}
