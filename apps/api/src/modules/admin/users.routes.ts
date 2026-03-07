import { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { verifyAdmin } from './middleware';
import { buildAdminEmail } from '../../services/email.service';

const USERNAME_REGEX = /^[a-z][a-z0-9._-]{1,29}$/;

function validateUsername(username: string): { valid: boolean; message?: string } {
    if (!username || typeof username !== 'string') {
        return { valid: false, message: 'Username is required' };
    }
    const clean = username.toLowerCase().trim();
    if (clean.length < 2) {
        return { valid: false, message: 'Username must be at least 2 characters' };
    }
    if (clean.length > 30) {
        return { valid: false, message: 'Username must be 30 characters or less' };
    }
    if (!USERNAME_REGEX.test(clean)) {
        return { valid: false, message: 'Username must start with a letter and contain only lowercase letters, numbers, dots, hyphens, or underscores' };
    }
    return { valid: true };
}

export async function adminUserRoutes(server: FastifyInstance) {
    // List Admins
    server.get('/', { preHandler: [verifyAdmin] }, async (request, reply) => {
        try {
            const admins = await server.prisma.adminUser.findMany({
                select: {
                    admin_id: true,
                    username: true,
                    email: true,
                    first_name: true,
                    last_name: true,
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
            const { username, password, first_name, last_name, role } = request.body as any;

            // Validate username
            const usernameCheck = validateUsername(username);
            if (!usernameCheck.valid) {
                return reply.status(400).send({ message: usernameCheck.message });
            }
            const cleanUsername = username.toLowerCase().trim();

            // Validate names
            if (!first_name || typeof first_name !== 'string' || !first_name.trim()) {
                return reply.status(400).send({ message: 'First name is required' });
            }
            if (!last_name || typeof last_name !== 'string' || !last_name.trim()) {
                return reply.status(400).send({ message: 'Last name is required' });
            }

            // Validate password
            if (!password || typeof password !== 'string' || password.length < 8) {
                return reply.status(400).send({ message: 'Password must be at least 8 characters' });
            }

            // Build email from username
            const email = buildAdminEmail(cleanUsername);

            // Check for existing username or email
            const existingByUsername = await server.prisma.adminUser.findUnique({ where: { username: cleanUsername } });
            if (existingByUsername) {
                return reply.status(409).send({ message: 'This username is already taken' });
            }
            const existingByEmail = await server.prisma.adminUser.findUnique({ where: { email } });
            if (existingByEmail) {
                return reply.status(409).send({ message: 'An admin with this email already exists' });
            }

            const password_hash = await bcrypt.hash(password, 10);

            const admin = await server.prisma.adminUser.create({
                data: {
                    username: cleanUsername,
                    email,
                    password_hash,
                    first_name: first_name.trim(),
                    last_name: last_name.trim(),
                    role: role || 'SUPPORT',
                    status: 'ACTIVE'
                },
                select: {
                    admin_id: true,
                    username: true,
                    email: true,
                    first_name: true,
                    last_name: true,
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
                    payload: { created_admin_id: admin.admin_id, username: admin.username, email: admin.email }
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
                username: true,
                email: true,
                first_name: true,
                last_name: true,
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

    // Update admin (first_name, last_name, role, status, optional password)
    // Note: username and email are immutable after creation
    server.patch('/:id', { preHandler: [verifyAdmin] }, async (request, reply) => {
        const { id } = request.params as any;
        const body = request.body as any;
        const currentAdminId = (request as any).admin.admin_id;

        const existing = await server.prisma.adminUser.findUnique({ where: { admin_id: id } });
        if (!existing) {
            return reply.status(404).send({ message: 'Admin user not found' });
        }

        const data: Record<string, unknown> = {};

        if (body.first_name !== undefined) {
            if (typeof body.first_name !== 'string' || !body.first_name.trim()) {
                return reply.status(400).send({ message: 'First name is required' });
            }
            data.first_name = body.first_name.trim();
        }
        if (body.last_name !== undefined) {
            if (typeof body.last_name !== 'string' || !body.last_name.trim()) {
                return reply.status(400).send({ message: 'Last name is required' });
            }
            data.last_name = body.last_name.trim();
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
            select: {
                admin_id: true,
                username: true,
                email: true,
                first_name: true,
                last_name: true,
                role: true,
                status: true
            }
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
