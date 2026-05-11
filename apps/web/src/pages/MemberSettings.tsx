import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../utils/api'
import { useAuth } from '../context/AuthContext'
import AdminButton from '../components/admin/ui/AdminButton'

type PasskeyRow = {
    webauthn_credential_id: string
    device_label: string | null
    created_at: string
    last_used_at: string | null
    transports: string[]
}

const MemberSettings: React.FC = () => {
    const navigate = useNavigate()
    const { logout } = useAuth()
    const [passkeys, setPasskeys] = useState<PasskeyRow[]>([])
    const [loading, setLoading] = useState(true)
    const [err, setErr] = useState('')
    const [busyId, setBusyId] = useState<string | null>(null)

    const load = async () => {
        setLoading(true)
        setErr('')
        try {
            const res = await api.get<{ passkeys: PasskeyRow[] }>('/api/v1/me/passkeys')
            setPasskeys(res.data.passkeys ?? [])
        } catch {
            setErr('Could not load passkeys.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        void load()
    }, [])

    const revoke = async (id: string) => {
        if (!window.confirm('Remove this passkey from your account?')) return
        setBusyId(id)
        try {
            await api.delete(`/api/v1/me/passkeys/${id}`)
            await load()
        } catch {
            setErr('Could not remove passkey.')
        } finally {
            setBusyId(null)
        }
    }

    return (
        <div style={{ minHeight: '100vh', padding: 24, maxWidth: 480, margin: '0 auto', color: 'var(--text, #f8fafc)' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h1 style={{ margin: 0, fontSize: 22 }}>Account</h1>
                <button
                    type="button"
                    onClick={() => navigate('/me/card')}
                    style={{
                        background: 'var(--surface, #1e293b)',
                        border: '1px solid var(--border, #334155)',
                        color: 'var(--text-secondary, #cbd5e1)',
                        padding: '8px 14px',
                        borderRadius: 8,
                        cursor: 'pointer',
                    }}
                >
                    Back to card
                </button>
            </header>

            <section style={{ marginBottom: 32 }}>
                <h2 style={{ fontSize: 16, margin: '0 0 12px' }}>Passkeys</h2>
                <p style={{ fontSize: 14, color: 'var(--text-secondary, #94a3b8)', margin: '0 0 16px', lineHeight: 1.5 }}>
                    Passkeys let you sign in with your fingerprint or device PIN instead of waiting for an SMS code.
                </p>
                {err ? <p style={{ color: 'var(--danger, #f87171)', fontSize: 14 }}>{err}</p> : null}
                {loading ? (
                    <p style={{ color: 'var(--text-secondary)' }}>Loading…</p>
                ) : passkeys.length === 0 ? (
                    <p style={{ color: 'var(--text-secondary)' }}>No passkeys yet. Add one after you sign in with SMS.</p>
                ) : (
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                        {passkeys.map((p) => (
                            <li
                                key={p.webauthn_credential_id}
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '12px 0',
                                    borderBottom: '1px solid var(--border, #334155)',
                                    gap: 12,
                                }}
                            >
                                <div>
                                    <div style={{ fontWeight: 600 }}>
                                        {p.device_label || 'Passkey'}
                                    </div>
                                    <div style={{ fontSize: 12, color: 'var(--text-tertiary, #64748b)' }}>
                                        Added {new Date(p.created_at).toLocaleString()}
                                        {p.last_used_at ? ` · Last used ${new Date(p.last_used_at).toLocaleString()}` : ''}
                                    </div>
                                </div>
                                <AdminButton
                                    type="button"
                                    variant="danger"
                                    disabled={busyId === p.webauthn_credential_id}
                                    isLoading={busyId === p.webauthn_credential_id}
                                    onClick={() => void revoke(p.webauthn_credential_id)}
                                >
                                    Remove
                                </AdminButton>
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            <AdminButton type="button" variant="secondary" fullWidth onClick={() => { logout(); navigate('/') }}>
                Sign out everywhere on this device
            </AdminButton>
        </div>
    )
}

export default MemberSettings
