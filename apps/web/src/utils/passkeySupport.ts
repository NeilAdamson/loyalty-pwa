/** True when a platform user-verifying authenticator (e.g. Touch ID) is available. */
export async function isPasskeyPlatformAvailable(): Promise<boolean> {
    if (typeof window === 'undefined' || !window.PublicKeyCredential) {
        return false
    }
    try {
        return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
    } catch {
        return false
    }
}
