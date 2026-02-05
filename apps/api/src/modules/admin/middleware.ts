import { FastifyRequest, FastifyReply } from 'fastify';

export async function verifyAdmin(request: FastifyRequest, reply: FastifyReply) {
    console.log('[Middleware] Entering verifyAdmin for', request.url)
    try {
        const req = request as any;
        const token = req.cookies.admin_token;
        if (!token) {
            throw new Error('No token provided');
        }

        const decoded = req.server.jwt.verify(token) as any;
        if (!decoded || decoded.type !== 'ADMIN') {
            throw new Error('Invalid token');
        }

        // Fetch admin to be sure
        const admin = await req.server.prisma.adminUser.findUnique({
            where: { admin_id: decoded.sub }
        });

        if (!admin || admin.status === 'DISABLED') {
            throw new Error('Admin account invalid or disabled');
        }

        (request as any).admin = admin;

    } catch (err) {
        return reply.status(401).send({ message: 'Unauthorized', authenticated: false });
    }
}
