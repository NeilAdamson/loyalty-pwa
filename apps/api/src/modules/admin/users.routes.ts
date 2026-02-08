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

    // Get single admin (for edit form; no password)
    server.get('/:id', { preHandler: [verifyAdmin] }, async (request, reply) => {
        const { id } = request.params as any;
        const admin = await server.prisma.adminUser.findUnique({
            where: { admin_id: id },
            select: {
                admin_id: true,
                email: true,
                name: true,
                role: true,
                status: true,
                created_at: true,
                last_login_at: true
            }
        });
        if (!admin) {
            return reply.status(404).send({ message: 'Admin user not found' });
        }
        return { admin };
    });

    // Update admin (name, email, role, status, optional password)
    server.patch('/:id', { preHandler: [verifyAdmin] }, async (request, reply) => {
        const { id } = request.params as any;
        const body = request.body as any;
        const currentAdminId = (request as any).admin.admin_id;

        const existing = await server.prisma.adminUser.findUnique({ where: { admin_id: id } });
        if (!existing) {
            return reply.status(404).send({ message: 'Admin user not found' });
        }

        const data: Record<string, unknown> = {};

        if (body.name !== undefined) {
            if (typeof body.name !== 'string' || !body.name.trim()) {
                return reply.status(400).send({ message: 'Name is required' });
            }
            data.name = body.name.trim();
        }
        if (body.email !== undefined) {
            const email = typeof body.email === 'string' ? body.email.trim() : '';
            if (!email) return reply.status(400).send({ message: 'Email is required' });
            const other = await server.prisma.adminUser.findFirst({
                where: { email, admin_id: { not: id } }
            });
            if (other) {
                return reply.status(409).send({ message: 'Another admin already has this email' });
            }
            data.email = email;
        }
        if (body.role !== undefined) {
            if (!['SUPER_ADMIN', 'SUPPORT'].includes(body.role)) {
                return reply.status(400).send({ message: 'Invalid role' });
            }
            data.role = body.role;
        }
        if (body.status !== undefined) {
            if (!['ACTIVE', 'DISABLED'].includes(body.status)) {
                return reply.status(400).send({ message: 'Invalid status' });
            }
            if (id === currentAdminId && body.status === 'DISABLED') {
                return reply.status(400).send({ message: 'Cannot disable your own account' });
            }
            data.status = body.status;
        }
        if (body.password !== undefined && body.password !== '') {
            const pwd = String(body.password);
            if (pwd.length < 8) {
                return reply.status(400).send({ message: 'Password must be at least 8 characters' });
            }
            data.password_hash = await bcrypt.hash(pwd, 10);
        }

        if (Object.keys(data).length === 0) {
            return reply.status(400).send({ message: 'No fields to update' });
        }

        const admin = await server.prisma.adminUser.update({
            where: { admin_id: id },
            data,
            select: { admin_id: true, email: true, name: true, role: true, status: true }
        });

        await server.prisma.adminAuditLog.create({
            data: {
                actor_type: 'PLATFORM_ADMIN',
                actor_id: currentAdminId,
                action: 'UPDATE_ADMIN',
                payload: { target_admin_id: id, updated_fields: Object.keys(data) }
            }
        });

        return { admin };
    });
}
