import twilio from 'twilio';

// Twilio credentials from Environment
// Supports: (1) Account SID + Auth Token, OR (2) Account SID + API Key + API Secret
const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const API_KEY = process.env.TWILIO_API_KEY;
const API_SECRET = process.env.TWILIO_API_SECRET;
const FROM_NUMBER = process.env.TWILIO_FROM_NUMBER;
// 'sms' = use plain E.164 (works with trial "My Twilio phone number"); 'whatsapp' = use WhatsApp sender (sandbox or approved)
const OTP_CHANNEL = (process.env.TWILIO_OTP_CHANNEL || 'whatsapp').toLowerCase();

export class WhatsAppService {
    private client: any;
    private enabled: boolean = false;

    constructor() {
        if (!ACCOUNT_SID || !FROM_NUMBER) {
            console.warn('[WhatsAppService] Twilio DISABLED: TWILIO_ACCOUNT_SID or TWILIO_FROM_NUMBER not set. No WhatsApp/SMS will be sent; OTP is logged only (check API logs for the code).');
            return;
        }
        try {
            if (API_KEY && API_SECRET) {
                this.client = twilio(API_KEY, API_SECRET, { accountSid: ACCOUNT_SID });
                this.enabled = true;
                console.log(`[WhatsAppService] Twilio ENABLED (API Key). OTP will be sent via ${OTP_CHANNEL === 'sms' ? 'SMS' : 'WhatsApp'}.`);
            } else if (AUTH_TOKEN) {
                this.client = twilio(ACCOUNT_SID, AUTH_TOKEN);
                this.enabled = true;
                console.log(`[WhatsAppService] Twilio ENABLED (Auth Token). OTP will be sent via ${OTP_CHANNEL === 'sms' ? 'SMS' : 'WhatsApp'}.`);
            } else {
                console.warn('[WhatsAppService] Twilio DISABLED: TWILIO_AUTH_TOKEN or (TWILIO_API_KEY + TWILIO_API_SECRET) not set. No WhatsApp will be sent; OTP is logged only.');
            }
        } catch (error) {
            console.error('[WhatsAppService] Failed to initialize Twilio client:', error);
        }
    }

    /** Call from health or startup to verify config without sending. */
    isConfigured(): boolean {
        return this.enabled === true && this.client != null;
    }

    async sendOtp(to: string, code: string) {
        if (!this.enabled || !this.client) {
            console.log(`[WhatsAppService] OTP not sent (Twilio not configured). Code for ${to}: ${code} — use this code to verify.`);
            return;
        }

        try {
            const useSms = OTP_CHANNEL === 'sms';
            const fromNumber = useSms
                ? (FROM_NUMBER || '').replace(/^whatsapp:/i, '')
                : (FROM_NUMBER?.startsWith('whatsapp:') ? FROM_NUMBER : `whatsapp:${FROM_NUMBER}`);
            const toNumber = useSms
                ? to.replace(/^whatsapp:/i, '')
                : (to.startsWith('whatsapp:') ? to : `whatsapp:${to}`);

            const message = await this.client.messages.create({
                body: `Your verification code is: ${code}`,
                from: fromNumber,
                to: toNumber
            });

            console.log(`[WhatsAppService] OTP sent via ${useSms ? 'SMS' : 'WhatsApp'} to ${to}. SID: ${message.sid}`);
        } catch (error: any) {
            console.error(`[WhatsAppService] Error sending OTP to ${to}:`, error?.message ?? error);
            console.log(`[Fallback Log] OTP for ${to}: ${code}`);
            throw { statusCode: 502, message: 'Could not send verification code. Please try again.' };
        }
    }
}
