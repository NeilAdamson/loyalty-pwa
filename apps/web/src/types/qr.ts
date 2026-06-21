export type QrAsset = {
    scope: 'vendor' | 'branch';
    branch_id: string | null;
    branch_name: string | null;
    signup_url: string;
    label: string;
};

export type QrAssetsResponse = {
    vendor_id: string;
    vendor_slug: string;
    trading_name: string;
    requires_signed_url: boolean;
    secret_version: number;
    last_rotated_at: string | null;
    branding: {
        logo_url: string | null;
        wordmark_url: string | null;
        welcome_text: string | null;
        primary_color: string;
        secondary_color: string;
        accent_color: string;
    } | null;
    active_program: {
        stamps_required: number;
        reward_title: string;
        reward_description: string;
        terms_text: string;
    } | null;
    assets: QrAsset[];
};

export type BranchRecord = {
    branch_id: string;
    name: string;
    address_text?: string | null;
    city?: string | null;
    region?: string | null;
    is_active: boolean;
};
