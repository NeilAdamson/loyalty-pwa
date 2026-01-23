import { FastifyRequest, FastifyReply } from 'fastify';

export async function verifyAdmin(request: FastifyRequest, reply: FastifyReply) {
    try {
        const token = request.cookies.admin_token;
        if (!token) {
            throw new Error('No token provided');
        }

        const decoded = request.server.jwt.verify(token) as any;
        if (!decoded || decoded.type !== 'ADMIN') {
            throw new Error('Invalid token');
        }

        // Fetch admin to be sure
        const admin = await request.server.prisma.adminUser.findUnique({
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
