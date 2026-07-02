export type SignupContext = {
    signup_v?: string;
    signup_s?: string;
    branch_joined_id?: string;
};

const SIGNUP_CONTEXT_KEY = 'punchcard_signup_context';

export function saveSignupContext(slug: string, context: SignupContext): void {
    sessionStorage.setItem(`${SIGNUP_CONTEXT_KEY}:${slug}`, JSON.stringify(context));
}

export function loadSignupContext(slug: string): SignupContext | null {
    const raw = sessionStorage.getItem(`${SIGNUP_CONTEXT_KEY}:${slug}`);
    if (!raw) return null;
    try {
        return JSON.parse(raw) as SignupContext;
    } catch {
        return null;
    }
}

export function parseSignupContextFromSearch(search: string): SignupContext {
    const params = new URLSearchParams(search);
    const context: SignupContext = {};
    const v = params.get('v');
    const s = params.get('s');
    const b = params.get('b');
    if (v) context.signup_v = v;
    if (s) context.signup_s = s;
    if (b) context.branch_joined_id = b;
    return context;
}

export function signupContextFromQuery(context: SignupContext): SignupContext {
    const payload: SignupContext = {};
    if (context.signup_v) payload.signup_v = context.signup_v;
    if (context.signup_s) payload.signup_s = context.signup_s;
    if (context.branch_joined_id) payload.branch_joined_id = context.branch_joined_id;
    return payload;
}

export function hasSignedSignupToken(context: SignupContext): boolean {
    return Boolean(context.signup_v && context.signup_s);
}
