import React, { useState } from 'react'
import { startRegistration } from '@simplewebauthn/browser'
import type { RegistrationResponseJSON } from '@simplewebauthn/types'
import { api } from '../utils/api'
import AdminButton from './admin/ui/AdminButton'

type Props = {
    vendorSlug: string
    onDone: () => void
}

/**
 * One-shot enrollment after OTP login. Does not block card access if skipped.
 */
const PasskeyEnrollPrompt: React.FC<Props> = ({ vendorSlug, onDone }) => {
    const [busy, setBusy] = useState(false)
    const [err, setErr] = useState('')

    const enroll = async () => {
        setBusy(true)
        setErr('')
        try {
            const opt = await api.post(`/api/v1/v/${vendorSlug}/auth/member/passkey/register/options`)
            const reg = await startRegistration(opt.data.optionsJSON)
            await api.post(`/api/v1/v/${vendorSlug}/auth/member/passkey/register/verify`, {
                stateId: opt.data.stateId,
                response: reg as RegistrationResponseJSON,
            })
            onDone()
        } catch (e: unknown) {
            const msg =
                typeof e === 'object' && e !== null && 'response' in e
                    ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
                    : undefined
            setErr(msg || 'Could not add passkey. You can try again from Account settings.')
        } finally {
            setBusy(false)
        }
    }

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 1000,
                background: 'rgba(15, 23, 42, 0.75)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 20,
            }}
        >
            <div
                style={{
                    maxWidth: 400,
                    width: '100%',
                    background: 'var(--surface, #1e293b)',
                    borderRadius: 12,
                    padding: 24,
                    border: '1px solid var(--border, rgba(255,255,255,0.12))',
                    color: 'var(--text, #f8fafc)',
                }}
            >
                <h2 style={{ margin: '0 0 8px', fontSize: 18 }}>Skip SMS next time?</h2>
                <p style={{ margin: '0 0 16px', fontSize: 14, color: 'var(--text-secondary, #94a3b8)', lineHeight: 1.5 }}>
                    Add a passkey (fingerprint or device PIN) for this store so you can sign in faster on this device.
                </p>
                {err ? (
                    <p style={{ color: 'var(--danger, #f87171)', fontSize: 13, marginBottom: 12 }}>{err}</p>
                ) : null}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <AdminButton type="button" variant="primary" isLoading={busy} fullWidth onClick={() => void enroll()}>
                        Add passkey
                    </AdminButton>
                    <AdminButton type="button" variant="secondary" disabled={busy} fullWidth onClick={onDone}>
                        Not now
                    </AdminButton>
                </div>
            </div>
        </div>
    )
}

export default PasskeyEnrollPrompt
