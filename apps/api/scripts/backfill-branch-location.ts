
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Backfilling Branch locations...');

    // Update all branches where city is null
    const result = await prisma.branch.updateMany({
        where: {
            city: null, // Only update if not set
        },
        data: {
            city: 'Johannesburg',
            region: 'East'
        }
    });

    console.log(`Updated ${result.count} branches with default City/Region.`);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
