import { PrismaClient } from '@prisma/client'
import { ERROR_CODES } from '../plugins/errors'

export class VendorService {
    constructor(private prisma: PrismaClient) { }

    async resolveBySlug(slug: string) {
        const vendor = await this.prisma.vendor.findUnique({
            where: { vendor_slug: slug },
        })

        if (!vendor) {
            throw {
                statusCode: 404,
                code: ERROR_CODES.NOT_FOUND,
                message: 'Vendor not found',
            }
        }

        if (vendor.status !== 'ACTIVE' && vendor.status !== 'TRIAL') {
            throw {
                statusCode: 403,
                code: ERROR_CODES.VENDOR_SUSPENDED,
                message: 'Vendor account is suspended',
            }
        }

        return vendor
    }
}
