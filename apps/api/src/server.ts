import fastify from 'fastify';
import prismaPlugin from './plugins/prisma'
import corsPlugin from './plugins/cors'
import errorsPlugin from './plugins/errors'
import authPlugin from './plugins/auth'
import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream';
import util from 'util';

const pump = util.promisify(pipeline);

const server = fastify({
    logger: true
});

// Register Core Plugins
server.register(errorsPlugin) // Global Error Handler (Register first)
server.register(corsPlugin)
server.register(require('@fastify/cookie'), {
    secret: "super-secret-cookie-signer-secret-change-me",
    hook: 'onRequest',
    parseOptions: {}
})
server.register(require('@fastify/multipart'))
server.register(require('@fastify/static'), {
    root: require('path').join(__dirname, '../uploads'),
    prefix: '/uploads/',
})

server.register(prismaPlugin)
server.register(authPlugin)

// Register Modules
import authRoutes from './modules/auth/routes'
import vendorRoutes from './modules/vendor/routes'
import programRoutes from './modules/program/routes'
import memberRoutes from './modules/member/routes'
import transactionRoutes from './modules/transaction/routes'

server.register(authRoutes, { prefix: '/api/v1' })
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
        const data = await req.file();
        if (!data) return reply.status(400).send({ message: 'No file uploaded' });

        const ext = path.extname(data.filename);
        const uniqueName = `image-${Date.now()}-${Math.round(Math.random() * 1000)}${ext}`;
        const filePath = path.join(uploadDir, uniqueName);

        await pump(data.file, fs.createWriteStream(filePath));

        const fileUrl = `${process.env.API_BASE_URL || 'http://localhost:8000'}/uploads/${uniqueName}`;
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
import { WhatsAppService } from './services/whatsapp.service';

const OTP_PROVIDER_HEALTH = (process.env.OTP_PROVIDER || process.env.SMS_PROVIDER || 'smsflow').toLowerCase();
// Instantiate once for health checks to avoid log spam and cache config
const healthCheckSender = OTP_PROVIDER_HEALTH === 'smsflow' ? new SMSFlowService() : new WhatsAppService();

server.get('/health', async (request, reply) => {
    return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        otp_provider: OTP_PROVIDER_HEALTH,
        otp_configured: healthCheckSender.isConfigured(),
        twilio_configured: OTP_PROVIDER_HEALTH === 'twilio' ? healthCheckSender.isConfigured() : undefined,
    };
});

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
