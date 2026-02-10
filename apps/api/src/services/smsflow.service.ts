/**
 * SMSFlow.co.za SMS provider for OTP delivery (Portal Integration API).
 *
 * Required flow (per SMSFlow docs/support):
 *  1) GET  /api/integration/authentication   (Basic Auth: ClientID / ClientSecret) -> { token, expiresInMinutes, schema }
 *  2) POST /api/integration/BulkMessages     (Bearer <token>) body: { SendOptions, messages[] }
 *
 * Phone format: international without + (e.g. 27821234567).
 */

const SMSFLOW_CLIENT_ID = process.env.SMSFLOW_CLIENT_ID;
const SMSFLOW_CLIENT_SECRET = process.env.SMSFLOW_CLIENT_SECRET;
const SMSFLOW_SENDER_ID = process.env.SMSFLOW_SENDER_ID || 'Loyalty';

const SMSFLOW_BASE_URL = process.env.SMSFLOW_BASE_URL || 'https://portal.smsflow.co.za';
const SMSFLOW_AUTH_URL = `${SMSFLOW_BASE_URL}/api/integration/authentication`;
const SMSFLOW_MESSAGES_URL = `${SMSFLOW_BASE_URL}/api/integration/BulkMessages`;

/** Normalize E.164 to SMSFlow format: digits only, no leading + */
function toSmsFlowNumber(e164: string): string {
    return e164.replace(/\D/g, '').replace(/^\+/, '');
}

export class SMSFlowService {
    private enabled = false;

    // Cached login token
    private authToken: string | null = null;
    private authTokenExpiresAt: number | null = null; // epoch millis

    constructor() {
        if (!SMSFLOW_CLIENT_ID?.trim() || !SMSFLOW_CLIENT_SECRET?.trim()) {
            console.warn('[SMSFlowService] SMSFlow DISABLED: SMSFLOW_CLIENT_ID or SMSFLOW_CLIENT_SECRET not set. OTP is logged only (check API logs for the code).');
            return;
        }
        this.enabled = true;
        console.log('[SMSFlowService] SMSFlow ENABLED (portal integration). OTP will be sent via SMS.');
    }

    isConfigured(): boolean {
        return this.enabled;
    }

    /** Fetch or reuse a bearer token from the SMSFlow authentication endpoint. */
    private async getAuthToken(): Promise<string> {
        if (!this.enabled) {
            throw new Error('SMSFlow not configured');
        }

        const now = Date.now();
        const safetyMs = 60_000; // refresh 1 minute before reported expiry

        if (this.authToken && this.authTokenExpiresAt && now < this.authTokenExpiresAt - safetyMs) {
            return this.authToken;
        }

        const basic = Buffer.from(`${SMSFLOW_CLIENT_ID}:${SMSFLOW_CLIENT_SECRET}`, 'utf8').toString('base64');

        let json: any;
        try {
            const res = await fetch(SMSFLOW_AUTH_URL, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Basic ${basic}`,
                },
            });

            const bodyText = await res.text();
            try {
                json = bodyText ? JSON.parse(bodyText) : null;
            } catch {
                json = null;
            }

            if (!res.ok || !json || !json.token) {
                console.error('[SMSFlowService] Failed to obtain login token from SMSFlow.', {
                    status: res.status,
                    body: bodyText,
                });
                throw new Error(`SMSFlow auth failed with status ${res.status}`);
            }
        } catch (err: any) {
            const detail = err?.message ?? String(err);
            console.error('[SMSFlowService] Error calling SMSFlow authentication endpoint:', detail);
            throw { statusCode: 502, message: 'Could not obtain SMS provider token. Please try again.' };
        }

        const expiresInMinutes = typeof json.expiresInMinutes === 'number' && json.expiresInMinutes > 0
            ? json.expiresInMinutes
            : 60; // sensible default if API omits it

        this.authToken = json.token;
        this.authTokenExpiresAt = Date.now() + expiresInMinutes * 60_000;

        return this.authToken;
    }

    async sendOtp(to: string, code: string): Promise<void> {
        if (!this.enabled) {
            console.log(`[SMSFlowService] OTP not sent (SMSFlow not configured). Code for ${to}: ${code} — use this code to verify.`);
            return;
        }

        const toNumber = toSmsFlowNumber(to);
        const content = `Your verification code is: ${code}`;

        const payload = {
            SendOptions: {
                startDeliveryUtc: null,
                campaignName: SMSFLOW_SENDER_ID || 'Loyalty OTP',
                checkOptOuts: true,
            },
            messages: [
                {
                    content,
                    destination: toNumber,
                },
            ],
        };

        try {
            const bearer = await this.getAuthToken();

            const res = await fetch(SMSFLOW_MESSAGES_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${bearer}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            const bodyText = await res.text();
            let json: any;
            try {
                json = bodyText ? JSON.parse(bodyText) : null;
            } catch {
                json = null;
            }

            const statusCode = json?.statusCode;
            const isLogicalSuccess =
                statusCode === 0 || // documented example
                statusCode === 200 || // observed in production response
                typeof statusCode === 'undefined'; // be lenient if field missing

            if (!res.ok || !isLogicalSuccess) {
                console.error('[SMSFlowService] SMS send failed.', {
                    httpStatus: res.status,
                    statusCode,
                    body: bodyText,
                });
                throw new Error(`SMSFlow send failed (http=${res.status}, statusCode=${statusCode})`);
            }

            console.log(`[SMSFlowService] OTP sent via SMSFlow to ${toNumber}.`);
        } catch (error: any) {
            const detail = error?.cause?.message ?? error?.message ?? String(error);
            console.error(`[SMSFlowService] Error sending OTP to ${to}:`, detail);
            console.log(`[Fallback Log] OTP for ${to}: ${code}`);
            throw { statusCode: 502, message: 'Could not send verification code. Please try again.' };
        }
    }
}
