const CACHE_KEY = 'punchcard_member_card_snapshot';

export type MemberCardSnapshot = {
    savedAt: number;
    data: Record<string, unknown>;
};

export function saveMemberCardSnapshot(data: Record<string, unknown>): void {
    try {
        const snapshot: MemberCardSnapshot = { savedAt: Date.now(), data };
        localStorage.setItem(CACHE_KEY, JSON.stringify(snapshot));
    } catch {
        // Ignore quota / private mode errors
    }
}

export function loadMemberCardSnapshot(): MemberCardSnapshot | null {
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as MemberCardSnapshot;
        if (!parsed?.data || typeof parsed.savedAt !== 'number') return null;
        return parsed;
    } catch {
        return null;
    }
}

export function clearMemberCardSnapshot(): void {
    try {
        localStorage.removeItem(CACHE_KEY);
    } catch {
        // ignore
    }
}
