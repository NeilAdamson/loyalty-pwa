import nodemailer from 'nodemailer'
import type { Transporter } from 'nodemailer'

const ADMIN_EMAIL_DOMAIN = 'punchcard.co.za'
const DEFAULT_VENDOR_REGISTRATION_NOTIFY_EMAIL = 'neil@punchcard.co.za'

export type NewVendorRegistrationDetails = {
    trading_name: string
    legal_name: string
    vendor_slug: string
    owner_first_name: string
    owner_last_name: string
    owner_email: string
    contact_phone: string | null
    vendor_status: string
    registered_at: Date
}

function getVendorRegistrationNotifyEmail(): string {
    const configured = process.env.VENDOR_REGISTRATION_NOTIFY_EMAIL?.trim()
    return configured || DEFAULT_VENDOR_REGISTRATION_NOTIFY_EMAIL
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
}

interface EmailConfig {
    host: string
    port: number
    secure: boolean
    auth: {
        user: string
        pass: string
    }
    from: string
}

function getEmailConfig(): EmailConfig | null {
    const host = process.env.SMTP_HOST
    const port = parseInt(process.env.SMTP_PORT || '465', 10)
    const user = process.env.SMTP_USER
    const pass = process.env.SMTP_PASSWORD
    const secure = process.env.SMTP_SECURE === 'true'
    const fromEmail = process.env.SMTP_FROM || user || ''
    const from = fromEmail.includes('<') ? fromEmail : `Punchcard <${fromEmail}>`

    const hasPlaceholderValue = [host, user, pass, fromEmail].some((value) =>
        !value || /smtp\.example\.com|noreply@example\.com|your_|change[_-]?me/i.test(value)
    )

    if (!host || !user || !pass || hasPlaceholderValue) {
        console.warn('[EmailService] SMTP not configured - emails will be logged only')
        return null
    }

    return { host, port, secure, auth: { user, pass }, from }
}

export class EmailService {
    private transporter: Transporter | null = null
    private config: EmailConfig | null = null

    constructor() {
        this.config = getEmailConfig()
        if (this.config) {
            this.transporter = nodemailer.createTransport({
                host: this.config.host,
                port: this.config.port,
                secure: this.config.secure,
                auth: this.config.auth
            })
        }
    }

    async sendPasswordResetEmail(toEmail: string, resetToken: string, firstName: string): Promise<boolean> {
        const resetUrl = `${process.env.CORS_ALLOWED_ORIGIN || 'http://localhost:5173'}/admin/reset-password?token=${resetToken}`
        
        const subject = 'Reset your Punchcard admin password'
        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .header h1 { color: #007bff; margin: 0; font-size: 28px; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 8px; }
        .button { display: inline-block; background: #007bff; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
        .button:hover { background: #0056b3; }
        .footer { margin-top: 30px; font-size: 13px; color: #666; text-align: center; }
        .warning { color: #856404; background: #fff3cd; padding: 12px; border-radius: 4px; margin-top: 20px; font-size: 13px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Punchcard</h1>
        </div>
        <div class="content">
            <p>Hi ${firstName},</p>
            <p>We received a request to reset your Punchcard admin password.</p>
            <p>Click the button below to create a new password:</p>
            <p style="text-align: center;">
                <a href="${resetUrl}" class="button">Reset Password</a>
            </p>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; font-size: 13px; color: #666;">${resetUrl}</p>
            <div class="warning">
                This link will expire in 1 hour. If you didn't request this reset, you can safely ignore this email.
            </div>
        </div>
        <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Punchcard. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
        `.trim()

        const textContent = `
Hi ${firstName},

We received a request to reset your Punchcard admin password.

Click the link below to create a new password:
${resetUrl}

This link will expire in 1 hour.

If you didn't request this reset, you can safely ignore this email.

- The Punchcard Team
        `.trim()

        if (!this.transporter || !this.config) {
            console.log('[EmailService] SMTP not configured - logging email instead:')
            console.log(`  To: ${toEmail}`)
            console.log(`  Subject: ${subject}`)
            console.log(`  Reset URL: ${resetUrl}`)
            return true
        }

        try {
            await this.transporter.sendMail({
                from: this.config.from,
                to: toEmail,
                subject,
                text: textContent,
                html: htmlContent
            })
            console.log(`[EmailService] Password reset email sent to ${toEmail}`)
            return true
        } catch (error) {
            console.error('[EmailService] Failed to send email:', error)
            return false
        }
    }

    async sendVendorRegistrationCode(toEmail: string, code: string, firstName: string, tradingName: string): Promise<boolean> {
        const subject = 'Your Punchcard vendor registration code'
        const safeFirstName = escapeHtml(firstName || 'there')
        const safeTradingName = escapeHtml(tradingName || 'your business')
        const htmlContent = `
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #222;">
    <div style="max-width: 600px; margin: 0 auto; padding: 32px 20px;">
        <h1 style="margin: 0 0 18px; color: #007bff;">Punchcard</h1>
        <p>Hi ${safeFirstName},</p>
        <p>Use this code to finish registering ${safeTradingName}:</p>
        <p style="font-size: 32px; font-weight: 800; letter-spacing: 8px; margin: 24px 0;">${code}</p>
        <p>This code expires in 15 minutes. If you did not request this, you can ignore this email.</p>
    </div>
</body>
</html>
        `.trim()
        const textContent = `
Hi ${firstName || 'there'},

Use this code to finish registering ${tradingName || 'your business'}:
${code}

This code expires in 15 minutes. If you did not request this, you can ignore this email.
        `.trim()

        if (!this.transporter || !this.config) {
            console.log('[EmailService] SMTP not configured - logging vendor registration email instead:')
            console.log(`  To: ${toEmail}`)
            console.log(`  Subject: ${subject}`)
            console.log(`  Registration Code: ${code}`)
            return true
        }

        try {
            await this.transporter.sendMail({
                from: this.config.from,
                to: toEmail,
                subject,
                text: textContent,
                html: htmlContent
            })
            console.log(`[EmailService] Vendor registration code sent to ${toEmail}`)
            return true
        } catch (error) {
            console.error('[EmailService] Failed to send vendor registration code:', error)
            return false
        }
    }

    async sendNewVendorRegistrationNotification(details: NewVendorRegistrationDetails): Promise<boolean> {
        const notifyEmail = getVendorRegistrationNotifyEmail()
        const ownerName = `${details.owner_first_name} ${details.owner_last_name}`.trim()
        const registeredAt = details.registered_at.toISOString()
        const portalBase = process.env.CORS_ALLOWED_ORIGIN || 'http://localhost:5173'
        const adminUrl = `${portalBase}/v/${details.vendor_slug}/admin/onboarding`

        const subject = `New vendor registered: ${details.trading_name}`
        const safeTradingName = escapeHtml(details.trading_name)
        const safeLegalName = escapeHtml(details.legal_name)
        const safeSlug = escapeHtml(details.vendor_slug)
        const safeOwnerName = escapeHtml(ownerName)
        const safeOwnerEmail = escapeHtml(details.owner_email)
        const safeContactPhone = escapeHtml(details.contact_phone || 'Not provided')
        const safeStatus = escapeHtml(details.vendor_status)
        const safeRegisteredAt = escapeHtml(registeredAt)
        const safeAdminUrl = escapeHtml(adminUrl)

        const htmlContent = `
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #222;">
    <div style="max-width: 600px; margin: 0 auto; padding: 32px 20px;">
        <h1 style="margin: 0 0 18px; color: #007bff;">Punchcard</h1>
        <p>A new vendor has completed self-service registration.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr><td style="padding: 8px 0; font-weight: 700;">Trading name</td><td style="padding: 8px 0;">${safeTradingName}</td></tr>
            <tr><td style="padding: 8px 0; font-weight: 700;">Legal name</td><td style="padding: 8px 0;">${safeLegalName}</td></tr>
            <tr><td style="padding: 8px 0; font-weight: 700;">Store slug</td><td style="padding: 8px 0;">${safeSlug}</td></tr>
            <tr><td style="padding: 8px 0; font-weight: 700;">Owner</td><td style="padding: 8px 0;">${safeOwnerName}</td></tr>
            <tr><td style="padding: 8px 0; font-weight: 700;">Owner email</td><td style="padding: 8px 0;">${safeOwnerEmail}</td></tr>
            <tr><td style="padding: 8px 0; font-weight: 700;">Contact phone</td><td style="padding: 8px 0;">${safeContactPhone}</td></tr>
            <tr><td style="padding: 8px 0; font-weight: 700;">Vendor status</td><td style="padding: 8px 0;">${safeStatus}</td></tr>
            <tr><td style="padding: 8px 0; font-weight: 700;">Registered at</td><td style="padding: 8px 0;">${safeRegisteredAt}</td></tr>
        </table>
        <p><a href="${safeAdminUrl}" style="display:inline-block;background:#007bff;color:white;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:700;">Open vendor onboarding</a></p>
    </div>
</body>
</html>
        `.trim()

        const textContent = `
A new vendor has completed self-service registration.

Trading name: ${details.trading_name}
Legal name: ${details.legal_name}
Store slug: ${details.vendor_slug}
Owner: ${ownerName}
Owner email: ${details.owner_email}
Contact phone: ${details.contact_phone || 'Not provided'}
Vendor status: ${details.vendor_status}
Registered at: ${registeredAt}

Vendor onboarding: ${adminUrl}
        `.trim()

        if (!this.transporter || !this.config) {
            console.log('[EmailService] SMTP not configured - logging new vendor registration notification instead:')
            console.log(`  To: ${notifyEmail}`)
            console.log(`  Subject: ${subject}`)
            console.log(textContent)
            return true
        }

        try {
            await this.transporter.sendMail({
                from: this.config.from,
                to: notifyEmail,
                subject,
                text: textContent,
                html: htmlContent
            })
            console.log(`[EmailService] New vendor registration notification sent to ${notifyEmail}`)
            return true
        } catch (error) {
            console.error('[EmailService] Failed to send new vendor registration notification:', error)
            return false
        }
    }

    async sendVendorPasswordResetEmail(toEmail: string, resetToken: string, firstName: string): Promise<boolean> {
        const resetUrl = `${process.env.CORS_ALLOWED_ORIGIN || 'http://localhost:5173'}/vendor/admin/reset-password?token=${resetToken}`
        const subject = 'Reset your Punchcard vendor password'
        const safeFirstName = escapeHtml(firstName || 'there')
        const safeResetUrl = escapeHtml(resetUrl)
        const htmlContent = `
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #222;">
    <div style="max-width: 600px; margin: 0 auto; padding: 32px 20px;">
        <h1 style="margin: 0 0 18px; color: #007bff;">Punchcard</h1>
        <p>Hi ${safeFirstName},</p>
        <p>Use the link below to reset your vendor admin password:</p>
        <p><a href="${safeResetUrl}" style="display:inline-block;background:#007bff;color:white;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:700;">Reset Password</a></p>
        <p style="word-break: break-all; font-size: 13px; color: #666;">${safeResetUrl}</p>
        <p>This link expires in 1 hour. If you did not request this, you can ignore this email.</p>
    </div>
</body>
</html>
        `.trim()
        const textContent = `
Hi ${firstName || 'there'},

Use this link to reset your Punchcard vendor admin password:
${resetUrl}

This link expires in 1 hour. If you did not request this, you can ignore this email.
        `.trim()

        if (!this.transporter || !this.config) {
            console.log('[EmailService] SMTP not configured - logging vendor reset email instead:')
            console.log(`  To: ${toEmail}`)
            console.log(`  Subject: ${subject}`)
            console.log(`  Reset URL: ${resetUrl}`)
            return true
        }

        try {
            await this.transporter.sendMail({
                from: this.config.from,
                to: toEmail,
                subject,
                text: textContent,
                html: htmlContent
            })
            console.log(`[EmailService] Vendor password reset email sent to ${toEmail}`)
            return true
        } catch (error) {
            console.error('[EmailService] Failed to send vendor reset email:', error)
            return false
        }
    }

    async verifyConnection(): Promise<boolean> {
        if (!this.transporter) {
            console.log('[EmailService] No transporter configured')
            return false
        }
        try {
            await this.transporter.verify()
            console.log('[EmailService] SMTP connection verified')
            return true
        } catch (error) {
            console.error('[EmailService] SMTP verification failed:', error)
            return false
        }
    }
}

export function buildAdminEmail(username: string): string {
    return `${username.toLowerCase().trim()}@${ADMIN_EMAIL_DOMAIN}`
}

export function extractUsernameFromEmail(email: string): string | null {
    const match = email.match(/^([^@]+)@punchcard\.co\.za$/i)
    return match ? match[1].toLowerCase() : null
}

export const ADMIN_EMAIL_DOMAIN_CONST = ADMIN_EMAIL_DOMAIN
