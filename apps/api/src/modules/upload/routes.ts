
import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream';
import util from 'util';

const pump = util.promisify(pipeline);

const uploadRoutes: FastifyPluginAsync = async (server) => {
    // Ensure uploads directory exists
    const uploadDir = path.join(__dirname, '../../../uploads');
    console.log('Registering Upload Routes...', uploadDir);
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }

    server.post('/uploads', async (req: any, reply) => {
        const data = await req.file();
        if (!data) {
            return reply.status(400).send({ message: 'No file uploaded' });
        }

        // Generate unique filename
        const ext = path.extname(data.filename);
        const uniqueName = `image-${Date.now()}-${Math.round(Math.random() * 1000)}${ext}`;
        const filePath = path.join(uploadDir, uniqueName);

        // Save file
        await pump(data.file, fs.createWriteStream(filePath));

        // Return URL
        // Using localhost:8000 as default base
        const fileUrl = `${process.env.API_BASE_URL || 'http://localhost:8000'}/uploads/${uniqueName}`;

        return { url: fileUrl };
    });
}

export default uploadRoutes;
