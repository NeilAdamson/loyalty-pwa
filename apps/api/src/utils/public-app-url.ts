export function getPublicAppUrl(fallback = 'http://localhost:5173'): string {
    const configured = process.env.PUBLIC_APP_URL?.trim()
    if (configured) {
        return configured.replace(/\/$/, '')
    }
    return fallback.replace(/\/$/, '')
}
