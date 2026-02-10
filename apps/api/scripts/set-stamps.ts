
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const args = process.argv.slice(2);
    if (args.length < 2) {
        console.error('Usage: npx tsx scripts/set-stamps.ts <vendor-slug> <phone>');
        process.exit(1);
    }

    const [vendorSlug, phone] = args;

    try {
        // 1. Find Vendor
        const vendor = await prisma.vendor.findUnique({
            where: { vendor_slug: vendorSlug }
        });

        if (!vendor) {
            console.error(`Vendor not found: ${vendorSlug}`);
            process.exit(1);
        }

        console.log(`Found Vendor: ${vendor.trading_name} (${vendor.vendor_id})`);

        // 2. Find Member
        const member = await prisma.member.findUnique({
            where: {
                vendor_id_phone_e164: {
                    vendor_id: vendor.vendor_id,
                    phone_e164: phone
                }
            }
        });

        if (!member) {
            console.error(`Member not found: ${phone}`);
            process.exit(1);
        }

        console.log(`Found Member: ${member.name} (${member.member_id})`);

        // 3. Find Active Program
        const program = await prisma.program.findFirst({
            where: {
                vendor_id: vendor.vendor_id,
                is_active: true
            }
        });

        if (!program) {
            console.error(`No active program found for vendor`);
            process.exit(1);
        }

        console.log(`Found Active Program: ${program.reward_title} (Req: ${program.stamps_required})`);

        // 4. Find Card
        const card = await prisma.cardInstance.findFirst({
            where: {
                member_id: member.member_id,
                program_id: program.program_id,
                status: 'ACTIVE'
            }
        });

        if (!card) {
            console.error(`No active card found for member`);
            process.exit(1);
        }

        // 5. Update Stamps
        const targetStamps = Math.max(0, program.stamps_required - 1);

        const updatedCard = await prisma.cardInstance.update({
            where: { card_id: card.card_id },
            data: { stamps_count: targetStamps }
        });

        console.log(`\n✅ SUCCESS: Updated card ${card.card_id}`);
        console.log(`   Previous Stamps: ${card.stamps_count}`);
        console.log(`   New Stamps:      ${updatedCard.stamps_count} / ${program.stamps_required}`);
        console.log(`\nReady for final stamp test!`);

    } catch (e) {
        console.error(e);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
