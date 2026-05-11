import fastify from 'fastify';
import prismaPlugin from './plugins/prisma'
import redisPlugin from './plugins/redis'
import corsPlugin from './plugins/cors'
import errorsPlugin from './plugins/errors'
import authPlugin from './plugins/auth'
import { assertRequiredSecurityEnv, requireSecret } from './utils/config'
import { loadWebAuthnConfig } from './utils/webauthn-config'
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

assertRequiredSecurityEnv();
loadWebAuthnConfig();

const server = fastify({
    logger: true,
    trustProxy: true,
});

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_MIME_TYPES: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/avif': 'avif',
};

function detectImageExtension(buffer: Buffer): string | null {
    if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpg';
    if (
        buffer.length >= 8 &&
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47 &&
        buffer[4] === 0x0d &&
        buffer[5] === 0x0a &&
        buffer[6] === 0x1a &&
        buffer[7] === 0x0a
    ) return 'png';
    if (
        buffer.length >= 12 &&
        buffer.toString('ascii', 0, 4) === 'RIFF' &&
        buffer.toString('ascii', 8, 12) === 'WEBP'
    ) return 'webp';
    if (
        buffer.length >= 16 &&
        buffer.toString('ascii', 4, 8) === 'ftyp' &&
        buffer.toString('ascii', 8, Math.min(buffer.length, 32)).includes('avif')
    ) return 'avif';
    return null;
}

async function streamToLimitedBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
    const chunks: Buffer[] = [];
    let total = 0;

    for await (const chunk of stream as any) {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        total += buffer.length;
        if (total > MAX_UPLOAD_BYTES) {
            throw { statusCode: 413, code: 'UPLOAD_TOO_LARGE', message: 'Image upload must be 5MB or smaller' };
        }
        chunks.push(buffer);
    }

    return Buffer.concat(chunks, total);
}

async function authorizeUpload(request: any, reply: any) {
    const adminToken = request.cookies?.admin_token;
    if (adminToken) {
        try {
            const decoded = request.server.jwt.verify(adminToken) as any;
            if (decoded?.type === 'ADMIN' && decoded?.sub) {
                const admin = await request.server.prisma.adminUser.findUnique({
                    where: { admin_id: decoded.sub },
                    select: { admin_id: true, status: true }
                });
                if (admin?.status === 'ACTIVE') {
                    return { actor_type: 'PLATFORM_ADMIN', actor_id: admin.admin_id, vendor_id: null };
                }
            }
        } catch {
            // Fall through to bearer-token validation below.
        }
    }

    try {
        await request.jwtVerify();
    } catch {
        reply.status(401).send({ code: 'UNAUTHORIZED', message: 'Admin authentication required' });
        return null;
    }

    const user = request.user;
    if (user?.vendor_id && user?.vendor_admin_id && user.role === 'ADMIN') {
        const vendorAdmin = await request.server.prisma.vendorAdminUser.findFirst({
            where: {
                vendor_admin_id: user.vendor_admin_id,
                vendor_id: user.vendor_id,
                status: 'ACTIVE'
            },
            select: { vendor_admin_id: true, vendor_id: true }
        });

        if (vendorAdmin) {
            return { actor_type: 'VENDOR_ADMIN', actor_id: vendorAdmin.vendor_admin_id, vendor_id: vendorAdmin.vendor_id };
        }
    }

    if (!user?.vendor_id || !user?.staff_id || user.role !== 'ADMIN') {
        reply.status(403).send({ code: 'FORBIDDEN', message: 'Vendor admin access required' });
        return null;
    }

    const staff = await request.server.prisma.staffUser.findFirst({
        where: {
            staff_id: user.staff_id,
            vendor_id: user.vendor_id,
            status: 'ENABLED',
            role: 'ADMIN'
        },
        select: { staff_id: true, vendor_id: true }
    });

    if (!staff) {
        reply.status(403).send({ code: 'FORBIDDEN', message: 'Vendor admin access required' });
        return null;
    }

    return { actor_type: 'VENDOR_ADMIN', actor_id: staff.staff_id, vendor_id: staff.vendor_id };
}

// Register Core Plugins
server.register(errorsPlugin) // Global Error Handler (Register first)
server.register(corsPlugin)
server.register(require('@fastify/cookie'), {
    secret: requireSecret('COOKIE_SECRET'),
    hook: 'onRequest',
    parseOptions: {}
})
server.register(require('@fastify/multipart'), {
    limits: {
        files: 1,
        fileSize: MAX_UPLOAD_BYTES,
    }
})
server.register(require('@fastify/static'), {
    root: require('path').join(__dirname, '../uploads'),
    prefix: '/uploads/',
})

server.register(prismaPlugin)
server.register(redisPlugin)
server.register(authPlugin)

// Register Modules
import authRoutes from './modules/auth/routes'
import vendorAuthRoutes from './modules/vendor-auth/routes'
import vendorRoutes from './modules/vendor/routes'
import programRoutes from './modules/program/routes'
import memberRoutes from './modules/member/routes'
import transactionRoutes from './modules/transaction/routes'

server.register(authRoutes, { prefix: '/api/v1' })
server.register(vendorAuthRoutes, { prefix: '/api/v1' })
server.register(vendorRoutes, { prefix: '/api/v1' })
server.register(programRoutes, { prefix: '/api/v1' })
server.register(memberRoutes, { prefix: '/api/v1' })
server.register(transactionRoutes, { prefix: '/api/v1' })
import vendorAdminRoutes from './modules/vendor-admin/routes'
server.register(vendorAdminRoutes, { prefix: '/api/v1' })

// Inline Upload Route
server.register(async function (fastify) {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    fastify.post('/uploads', async (req: any, reply) => {
        const actor = await authorizeUpload(req, reply);
        if (!actor) return reply;

        let data;
        try {
            data = await req.file();
        } catch (err: any) {
            const statusCode = err?.statusCode || 400;
            return reply.status(statusCode).send({
                code: statusCode === 413 ? 'UPLOAD_TOO_LARGE' : 'VALIDATION_ERROR',
                message: statusCode === 413 ? 'Image upload must be 5MB or smaller' : 'Invalid upload request'
            });
        }
        if (!data) return reply.status(400).send({ code: 'VALIDATION_ERROR', message: 'No file uploaded' });

        const expectedExt = ALLOWED_IMAGE_MIME_TYPES[data.mimetype];
        if (!expectedExt) {
            return reply.status(415).send({
                code: 'UNSUPPORTED_MEDIA_TYPE',
                message: 'Only JPEG, PNG, WebP, and AVIF images are allowed'
            });
        }

        let buffer: Buffer;
        try {
            buffer = await streamToLimitedBuffer(data.file);
        } catch (err: any) {
            const statusCode = err?.statusCode || 400;
            return reply.status(statusCode).send({
                code: err?.code || 'VALIDATION_ERROR',
                message: err?.message || 'Invalid upload request'
            });
        }
        const detectedExt = detectImageExtension(buffer);
        if (!detectedExt || detectedExt !== expectedExt) {
            return reply.status(415).send({
                code: 'UNSUPPORTED_MEDIA_TYPE',
                message: 'Uploaded file content does not match an allowed image type'
            });
        }

        const scope = actor.vendor_id || 'platform';
        const relativeDir = path.join('branding', scope);
        const targetDir = path.join(uploadDir, relativeDir);
        if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

        const uniqueName = `${randomUUID()}.${detectedExt}`;
        const relativePath = path.join(relativeDir, uniqueName);
        const filePath = path.join(uploadDir, relativePath);

        await fs.promises.writeFile(filePath, buffer, { flag: 'wx' });

        await fastify.prisma.adminAuditLog.create({
            data: {
                actor_type: actor.actor_type,
                actor_id: actor.actor_id,
                vendor_id: actor.vendor_id,
                action: 'UPLOAD_BRANDING_IMAGE',
                payload: {
                    original_filename: data.filename,
                    stored_path: relativePath.replace(/\\/g, '/'),
                    mime_type: data.mimetype,
                    size_bytes: buffer.length
                }
            }
        });

        const publicPath = relativePath.replace(/\\/g, '/');
        const fileUrl = `${process.env.API_BASE_URL || 'http://localhost:8000'}/uploads/${publicPath}`;
        return { url: fileUrl };
    });
}, { prefix: '/api/v1' });


// Current routes are registered at root level of server? 
// Wait, `server.register(authRoutes)` etc are at root?
// In previous view of server.ts:
// server.register(authRoutes) -> this usually has a prefix inside the module or it's root.
// Let's check authRoutes definition to be consistent. 
// Actually, looking at server.ts again:
// server.get('/health') ...
// server.register(authRoutes)
// If I use `prefix: '/api/v1/admin/auth'`, it should work.
// But wait, the previous `server.ts` dump showed: `server.register(authRoutes)`. 
// I should probably follow that pattern OR put it under /api/v1 if I want to clean up.
// For now, I'll stick to the requested path.
server.register(require('./modules/admin/auth.routes').adminAuthRoutes, { prefix: '/api/v1/admin/auth' })
server.register(require('./modules/admin/vendor.routes').adminVendorRoutes, { prefix: '/api/v1/admin/vendors' })
server.register(require('./modules/admin/member.routes').adminMemberRoutes, { prefix: '/api/v1/admin/members' })
server.register(require('./modules/admin/users.routes').adminUserRoutes, { prefix: '/api/v1/admin/users' })

import { SMSFlowService } from './services/smsflow.service';

// Instantiate once for health checks to avoid log spam and cache config
const healthCheckSender = new SMSFlowService();

server.get('/health', async (request, reply) => {
    let redis_ok = false
    try {
        const pong = await server.redis.ping()
        redis_ok = pong === 'PONG'
    } catch {
        redis_ok = false
    }
    const body = {
        status: redis_ok ? 'ok' : 'degraded',
        timestamp: new Date().toISOString(),
        otp_provider: 'smsflow',
        otp_configured: healthCheckSender.isConfigured(),
        redis_ok,
    }
    if (!redis_ok) {
        return reply.status(503).send(body)
    }
    return body
})

const start = async () => {
    try {
        const port = parseInt(process.env.PORT || '8000');
        const host = process.env.HOST || '0.0.0.0';
        console.log('Server is starting up...');
        await server.listen({ port, host });
        console.log(`Server listening at http://${host}:${port}`);
        console.log('Routes loaded.');
    } catch (err) {
        server.log.error(err);
        process.exit(1);
    }
};

start();
