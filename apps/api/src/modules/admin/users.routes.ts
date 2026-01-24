import { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { verifyAdmin } from './middleware';

export async function adminUserRoutes(server: FastifyInstance) {
    // List Admins
    server.get('/', { preHandler: [verifyAdmin] }, async (request, reply) => {
        try {
            const admins = await server.prisma.adminUser.findMany({
                select: {
                    admin_id: true,
                    email: true,
                    name: true,
                    role: true,
                    status: true,
                    created_at: true,
                    last_login_at: true
                },
                orderBy: { created_at: 'desc' }
            });
            return { admins };
        } catch (error) {
            console.error('FAILED TO LIST ADMINS:', error);
            throw error;
        }
    });

    // Create Admin
    server.post('/', { preHandler: [verifyAdmin] }, async (request, reply) => {
        try {
            const { email, password, name, role } = request.body as any;

            if (!email || !password || !name) {
                return reply.status(400).send({ message: 'Email, password, and name are required' });
            }

            const existing = await server.prisma.adminUser.findUnique({ where: { email } });
            if (existing) {
                return reply.status(409).send({ message: 'Admin with this email already exists' });
            }

            const password_hash = await bcrypt.hash(password, 10);

            const admin = await server.prisma.adminUser.create({
                data: {
                    email,
                    password_hash,
                    name,
                    role: role || 'SUPPORT',
                    status: 'ACTIVE'
                },
                select: {
                    admin_id: true,
                    email: true,
                    name: true,
                    role: true,
                    status: true
                }
            });

            // Audit Log
            await server.prisma.adminAuditLog.create({
                data: {
                    actor_type: 'PLATFORM_ADMIN',
                    actor_id: (request as any).admin.admin_id,
                    action: 'CREATE_ADMIN',
                    payload: { created_admin_id: admin.admin_id, email: admin.email }
                }
            });

            return { admin };
        } catch (error) {
            console.error('FAILED TO CREATE ADMIN USER:', error);
            throw error;
        }
    });

    // Update Status (Disable/Enable)
    server.patch('/:id', { preHandler: [verifyAdmin] }, async (request, reply) => {
        const { id } = request.params as any;
        const { status } = request.body as any;

        if (!['ACTIVE', 'DISABLED'].includes(status)) {
            return reply.status(400).send({ message: 'Invalid status' });
        }

        // Prevent self-disable
        const currentAdminId = (request as any).admin.admin_id;
        if (id === currentAdminId && status === 'DISABLED') {
            return reply.status(400).send({ message: 'Cannot disable your own account' });
        }

        const admin = await server.prisma.adminUser.update({
            where: { admin_id: id },
            data: { status },
            select: { admin_id: true, status: true, email: true }
        });

        // Audit Log
        await server.prisma.adminAuditLog.create({
            data: {
                actor_type: 'PLATFORM_ADMIN',
                actor_id: currentAdminId,
                action: 'UPDATE_ADMIN_STATUS',
                payload: { target_admin_id: id, status }
            }
        });

        return { admin };
    });
}
