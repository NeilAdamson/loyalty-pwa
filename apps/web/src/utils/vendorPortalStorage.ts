/** localStorage key for last-used vendor slug on `/vendor/login`. */
export const RECENT_VENDOR_SLUG_KEY = 'punchcard_recent_vendor_slug';

/** Valid store slug format (aligned with platform-admin vendor slug rules). */
export const VENDOR_SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function normalizeVendorSlugInput(raw: string): string {
    return raw.trim().toLowerCase();
}

export function persistRecentVendorSlug(slug: string): void {
    const s = normalizeVendorSlugInput(slug);
    if (!s) return;
    try {
        localStorage.setItem(RECENT_VENDOR_SLUG_KEY, s);
    } catch {
        /* ignore quota / private mode */
    }
}

export function readRecentVendorSlug(): string | null {
    try {
        const v = localStorage.getItem(RECENT_VENDOR_SLUG_KEY);
        return v?.trim() ? normalizeVendorSlugInput(v) : null;
    } catch {
        return null;
    }
}

export function clearRecentVendorSlug(): void {
    try {
        localStorage.removeItem(RECENT_VENDOR_SLUG_KEY);
    } catch {
        /* ignore */
    }
}
