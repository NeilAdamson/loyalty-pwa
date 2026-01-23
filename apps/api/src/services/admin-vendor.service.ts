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
        const { branding, ...vendorData } = data

        return this.prisma.vendor.update({
            where: { vendor_id: vendorId },
            data: {
                ...vendorData,
                branding: branding ? {
                    upsert: {
                        create: branding,
                        update: branding
                    }
                } : undefined
            }
        })
    }
}
