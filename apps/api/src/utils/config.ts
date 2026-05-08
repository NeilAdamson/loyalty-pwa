const MIN_SECRET_LENGTH = 16;

export function requireEnv(name: string): string {
    const value = process.env[name];
    if (!value || value.trim() === '') {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
}

export function requireSecret(name: string): string {
    const value = requireEnv(name);
    if (value.length < MIN_SECRET_LENGTH) {
        throw new Error(`Environment variable ${name} must be at least ${MIN_SECRET_LENGTH} characters`);
    }
    if (/change[_-]?me|supersecret|super-secret/i.test(value)) {
        throw new Error(`Environment variable ${name} must not use a known placeholder value`);
    }
    return value;
}

export function assertRequiredSecurityEnv() {
    requireSecret('JWT_SECRET');
    requireSecret('COOKIE_SECRET');
    requireSecret('TOKEN_SIGNING_SECRET');
    requireSecret('OTP_PEPPER');
}
