import { PrismaClient, Vendor } from '@prisma/client'

export class AdminVendorService {
    constructor(private prisma: PrismaClient) { }

    async list(params: { page?: number, limit?: number, query?: string, status?: string }) {
        const page = params.page || 1
        const limit = params.limit || 20
        const skip = (page - 1) * limit

        const where: any = {}
        if (params.status) where.status = params.status
        if (params.query) {
            where.OR = [
                { trading_name: { contains: params.query, mode: 'insensitive' } },
                { is: { vendor_slug: { contains: params.query, mode: 'insensitive' } } } // 'is' unavailable? maybe just vendor_slug.
                // Prisma 'mode: insensitive' works. 
                // But vendor_slug is unique, so let's check exact or strict contains.
            ]
            // Fix: vendor_slug is String.
            where.OR = [
                { trading_name: { contains: params.query, mode: 'insensitive' } },
                { vendor_slug: { contains: params.query, mode: 'insensitive' } }
            ]
        }

        const [users, total] = await Promise.all([
            this.prisma.vendor.findMany({
                where,
                skip,
                take: limit,
                orderBy: { created_at: 'desc' },
                include: { _count: { select: { members: true, branches: true } } }
            }),
            this.prisma.vendor.count({ where })
        ])

        return { data: users, meta: { total, page, limit } }
    }

    async create(data: {
        legal_name: string,
        trading_name: string,
        vendor_slug: string,
        billing_email?: string
    }) {
        // Defaults
        return this.prisma.vendor.create({
            data: {
                ...data,
                status: 'ACTIVE', // or TRIAL
                billing_plan_id: 'FREE',
                billing_status: 'TRIAL',
                // Create default branding?
                branding: {
                    create: {
                        primary_color: '#000000',
                        secondary_color: '#ffffff'
                    }
                },
                // Create default program
                programs: {
                    create: {
                        version: 1,
                        is_active: true,
                        stamps_required: 10,
                        reward_title: 'Free Reward',
                        reward_description: 'Collect 10 stamps to earn a reward.',
                        terms_text: 'Standard terms and conditions apply.'
                    }
                },
                // Create default branch?
                branches: {
                    create: {
                        name: 'Main Branch'
                    }
                }
            }
        })
    }

    async get(vendorId: string) {
        return this.prisma.vendor.findUnique({
            where: { vendor_id: vendorId },
            include: {
                branding: true,
                branches: true,
                _count: { select: { members: true, staff: true } }
            }
        })
    }

    async update(vendorId: string, data: any) {
        const { branding, ...rest } = data

        // Pick allowed fields for Vendor (avoid passing _count, branches etc)
        const vendorUpdate: any = {}
        const allowed = ['legal_name', 'trading_name', 'vendor_slug', 'billing_email', 'status']
        allowed.forEach(k => {
            if (rest[k] !== undefined) vendorUpdate[k] = rest[k]
        })

        // Prepare Branding Update
        let brandingUpdate = undefined
        if (branding) {
            // Pick branding fields to avoid passing metadata
            const bFields = {
                primary_color: branding.primary_color,
                secondary_color: branding.secondary_color,
                accent_color: branding.accent_color,
                background_color: branding.background_color,
                logo_url: branding.logo_url,
                wordmark_url: branding.wordmark_url,
                card_style: branding.card_style,
                card_bg_image_url: branding.card_bg_image_url,
                welcome_text: branding.welcome_text,
                card_title: branding.card_title
            }

            brandingUpdate = {
                upsert: {
                    create: {
                        ...bFields,
                        primary_color: bFields.primary_color || '#000000',
                        secondary_color: bFields.secondary_color || '#ffffff',
                        accent_color: bFields.accent_color || '#3B82F6',
                        card_style: bFields.card_style || 'SOLID'
                    } as any,
                    update: bFields
                }
            }
        }

        return this.prisma.vendor.update({
            where: { vendor_id: vendorId },
            data: {
                ...vendorUpdate,
                branding: brandingUpdate
            }
        })
    }

    async delete(vendorId: string) {
        return this.prisma.$transaction(async (tx) => {
            // Delete dependencies in order
            await tx.otpRequest.deleteMany({ where: { vendor_id: vendorId } })
            await tx.tokenUse.deleteMany({ where: { vendor_id: vendorId } })
            await tx.stampTransaction.deleteMany({ where: { vendor_id: vendorId } })
            await tx.redemptionTransaction.deleteMany({ where: { vendor_id: vendorId } })

            await tx.cardInstance.deleteMany({ where: { vendor_id: vendorId } })
            await tx.program.deleteMany({ where: { vendor_id: vendorId } })

            await tx.member.deleteMany({ where: { vendor_id: vendorId } })
            await tx.staffUser.deleteMany({ where: { vendor_id: vendorId } })

            await tx.vendorBranding.deleteMany({ where: { vendor_id: vendorId } })
            await tx.branch.deleteMany({ where: { vendor_id: vendorId } })

            // Finally delete vendor
            return tx.vendor.delete({ where: { vendor_id: vendorId } })
        })
    }
}
