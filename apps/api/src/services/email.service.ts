import nodemailer from 'nodemailer'
import type { Transporter } from 'nodemailer'

const ADMIN_EMAIL_DOMAIN = 'punchcard.co.za'

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

    if (!host || !user || !pass) {
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
