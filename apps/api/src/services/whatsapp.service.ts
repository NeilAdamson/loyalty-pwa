import twilio from 'twilio';

// Twilio credentials from Environment
// Supports: (1) Account SID + Auth Token, OR (2) Account SID + API Key + API Secret
const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const API_KEY = process.env.TWILIO_API_KEY;
const API_SECRET = process.env.TWILIO_API_SECRET;
const FROM_NUMBER = process.env.TWILIO_FROM_NUMBER;

export class WhatsAppService {
    private client: any;
    private enabled: boolean = false;

    constructor() {
        if (!ACCOUNT_SID || !FROM_NUMBER) {
            console.warn('[WhatsAppService] Missing TWILIO_ACCOUNT_SID or TWILIO_FROM_NUMBER. OTPs will be logged only.');
            return;
        }
        try {
            if (API_KEY && API_SECRET) {
                this.client = twilio(API_KEY, API_SECRET, { accountSid: ACCOUNT_SID });
                this.enabled = true;
                console.log('[WhatsAppService] Initialized with Twilio (API Key)');
            } else if (AUTH_TOKEN) {
                this.client = twilio(ACCOUNT_SID, AUTH_TOKEN);
                this.enabled = true;
                console.log('[WhatsAppService] Initialized with Twilio (Auth Token)');
            } else {
                console.warn('[WhatsAppService] Missing TWILIO_AUTH_TOKEN or (TWILIO_API_KEY + TWILIO_API_SECRET). OTPs will be logged only.');
            }
        } catch (error) {
            console.error('[WhatsAppService] Failed to initialize Twilio client:', error);
        }
    }

    async sendOtp(to: string, code: string) {
        if (!this.enabled || !this.client) {
            console.log(`[Mock - WhatsApp Disabled] Send to ${to}: Your verification code is ${code}`);
            return;
        }

        try {
            // Ensure connection is 'whatsapp:' prefix
            const toNumber = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
            const fromNumber = FROM_NUMBER?.startsWith('whatsapp:') ? FROM_NUMBER : `whatsapp:${FROM_NUMBER}`;

            const message = await this.client.messages.create({
                body: `Your verification code is: ${code}`,
                from: fromNumber,
                to: toNumber
            });

            console.log(`[WhatsAppService] OTP sent to ${to}. SID: ${message.sid}`);
        } catch (error: any) {
            console.error(`[WhatsAppService] Error sending OTP to ${to}:`, error.message);
            // Fallback to log in dev if sending fails (so I can still log in)
            console.log(`[Fallback Log] OTP for ${to}: ${code}`);
            throw error; // Rethrow so the caller knows it failed if strict
        }
    }
}
