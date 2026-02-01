
import twilio from 'twilio';

// Twilio credentials from Environment
const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const API_KEY = process.env.TWILIO_API_KEY;
const API_SECRET = process.env.TWILIO_API_SECRET;
const FROM_NUMBER = process.env.TWILIO_FROM_NUMBER;

export class WhatsAppService {
    private client: any;
    private enabled: boolean = false;

    constructor() {
        if (ACCOUNT_SID && API_KEY && API_SECRET) {
            try {
                // Initialize using API Key Pair (Recommended for security/rotation)
                this.client = twilio(API_KEY, API_SECRET, { accountSid: ACCOUNT_SID });
                this.enabled = true;
                console.log('[WhatsAppService] Initialized with Twilio');
            } catch (error) {
                console.error('[WhatsAppService] Failed to initialize Twilio client:', error);
            }
        } else {
            console.warn('[WhatsAppService] Missing Twilio credentials. OTPs will be logged only.');
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
