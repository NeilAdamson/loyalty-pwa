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
        billing_email?: string,
        initial_branch_city?: string,
        initial_branch_region?: string,
        monthly_billing_amount: number | string,
        billing_start_date: string;
        contact_name: string;
        contact_surname: string;
        contact_phone: string;
    }) {
        const { initial_branch_city, initial_branch_region, ...vendorData } = data

        // Defaults
        return this.prisma.vendor.create({
            data: {
                ...vendorData,
                status: 'ACTIVE', // or TRIAL
                billing_plan_id: 'FREE',
                billing_status: 'TRIAL',
                monthly_billing_amount: Number(vendorData.monthly_billing_amount),
                billing_start_date: new Date(vendorData.billing_start_date || Date.now()),
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
                        name: 'Main Branch',
                        city: initial_branch_city,
                        region: initial_branch_region
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
                branches: {
                    orderBy: { branch_id: 'asc' }
                },
                programs: true,
                _count: { select: { members: true, staff: true } }
            }
        })
    }

    async update(vendorId: string, data: any) {
        const { branding, program, ...rest } = data

        // Pick and sanitize allowed fields (Prisma rejects empty strings for DateTime/Decimal)
        const vendorUpdate: any = {}
        if (rest.legal_name !== undefined) vendorUpdate.legal_name = String(rest.legal_name).trim()
        if (rest.trading_name !== undefined) vendorUpdate.trading_name = String(rest.trading_name).trim()
        if (rest.vendor_slug !== undefined) vendorUpdate.vendor_slug = String(rest.vendor_slug).trim()
        if (rest.billing_email !== undefined) vendorUpdate.billing_email = rest.billing_email ? String(rest.billing_email).trim() : null
        if (rest.status !== undefined) vendorUpdate.status = String(rest.status).trim() || 'ACTIVE'
        if (rest.contact_name !== undefined) vendorUpdate.contact_name = String(rest.contact_name || '').trim()
        if (rest.contact_surname !== undefined) vendorUpdate.contact_surname = String(rest.contact_surname || '').trim()
        if (rest.contact_phone !== undefined) vendorUpdate.contact_phone = String(rest.contact_phone || '').trim()
        if (rest.monthly_billing_amount !== undefined && rest.monthly_billing_amount !== '') {
            const amt = Number(rest.monthly_billing_amount)
            if (!Number.isNaN(amt)) vendorUpdate.monthly_billing_amount = amt
        }
        if (rest.billing_start_date !== undefined && rest.billing_start_date !== '') {
            const d = new Date(rest.billing_start_date)
            if (!Number.isNaN(d.getTime())) vendorUpdate.billing_start_date = d
        }

        // Program Update (Active)
        if (program) {
            const progData: { reward_title?: string; stamps_required?: number } = {}
            if (program.reward_title !== undefined) progData.reward_title = String(program.reward_title).trim()
            const sr = parseInt(program.stamps_required, 10)
            if (!Number.isNaN(sr) && sr >= 2 && sr <= 30) progData.stamps_required = sr
            if (Object.keys(progData).length > 0) {
                await this.prisma.program.updateMany({
                    where: { vendor_id: vendorId, is_active: true },
                    data: progData
                })
            }
        }

        // Branch Update (Update first branch or create default)
        const { branch_city, branch_region } = data
        console.log(`[AdminVendorService] Updating branch for ${vendorId}. City: ${branch_city}, Region: ${branch_region}`)

        if (branch_city !== undefined || branch_region !== undefined) {
            const firstBranch = await this.prisma.branch.findFirst({
                where: { vendor_id: vendorId },
                orderBy: { branch_id: 'asc' }
            })

            if (firstBranch) {
                console.log(`[AdminVendorService] Updating existing branch ${firstBranch.branch_id}`)
                await this.prisma.branch.update({
                    where: { branch_id: firstBranch.branch_id },
                    data: {
                        city: branch_city,
                        region: branch_region
                    }
                })
            } else {
                console.log(`[AdminVendorService] Creating new branch`)
                // If no branch exists, create one with these details
                await this.prisma.branch.create({
                    data: {
                        vendor_id: vendorId,
                        name: 'Main Branch', // Default name
                        city: branch_city || '',
                        region: branch_region || '',
                        is_active: true
                    }
                })
            }
        }

        // Prepare Branding Update
        let brandingUpdate = undefined
        if (branding) {
            // Pick branding fields to avoid passing metadata
            const bFields = {
                primary_color: branding.primary_color,
                secondary_color: branding.secondary_color,
                accent_color: branding.accent_color,
                background_color: branding.background_color,
                card_text_color: branding.card_text_color,
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
                        card_text_color: bFields.card_text_color || '#ffffff',
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
