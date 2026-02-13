import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { api } from '../../../utils/api';
import { useUnsavedChanges } from '../../../hooks/useUnsavedChanges';

const VendorSettings: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const { token } = useAuth();

    // Form State
    const [tradingName, setTradingName] = useState('');
    const [legalName, setLegalName] = useState('');
    const [vendorSlug, setVendorSlug] = useState('');
    const initialTradingNameRef = useRef<string>('');

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

    useEffect(() => {
        const fetchSettings = async () => {
            if (!token) return;
            try {
                const res = await api.get(`/api/v1/v/${slug}/admin/business`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = res.data;
                const tradingNameValue = data.trading_name || '';
                setTradingName(tradingNameValue);
                setLegalName(data.legal_name || '');
                setVendorSlug(data.slug || '');
                initialTradingNameRef.current = tradingNameValue;
            } catch (error) {
                console.error('Error fetching settings:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, [slug, token]);

    // Check if form is dirty
    const isDirty = tradingName !== initialTradingNameRef.current;

    // Block navigation if there are unsaved changes
    useUnsavedChanges({ isDirty, message: 'You have unsaved settings changes. Are you sure you want to leave?' });

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage(null);

        try {
            await api.put(`/api/v1/v/${slug}/admin/business`,
                { trading_name: tradingName },
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            initialTradingNameRef.current = tradingName;
            setMessage({ text: 'Settings saved successfully!', type: 'success' });

            // Clear message after 3 seconds
            setTimeout(() => setMessage(null), 3000);
        } catch (error) {
            console.error('Error saving settings:', error);
            setMessage({ text: 'Failed to save settings. Please try again.', type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-muted">Loading settings...</div>;
    }

    return (
        <div className="settings-page fade-in max-w-3xl">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Business Settings</h1>
                    <p className="page-subtitle">Update your public profile and view account details.</p>
                </div>
            </div>

            <form onSubmit={handleSave}>
                {/* General Information Card */}
                <div className="glass-panel p-8 mb-8">
                    <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                        <span>🏢</span> General Information
                    </h2>

                    <div className="grid gap-6">
                        <div>
                            <label className="input-label">Trading Name</label>
                            <input
                                type="text"
                                value={tradingName}
                                onChange={(e) => setTradingName(e.target.value)}
                                className="glass-input"
                                placeholder="e.g. The Coffee House"
                                required
                            />
                            <p className="text-xs text-dim mt-2">
                                This is the name displayed to customers on their digital punch cards and messages.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="input-label">Vendor Slug (Store ID)</label>
                                <input
                                    type="text"
                                    value={vendorSlug}
                                    disabled
                                    className="glass-input opacity-70 cursor-not-allowed font-mono text-accent bg-accent/5 border-accent/20"
                                />
                                <p className="text-xs text-dim mt-2">
                                    Your unique identifier for the web portal. Cannot be changed.
                                </p>
                            </div>
                            <div>
                                <label className="input-label">Legal Entity Name</label>
                                <input
                                    type="text"
                                    value={legalName}
                                    disabled
                                    className="glass-input opacity-60 cursor-not-allowed"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Subscription Status Card (Placeholder for now) */}
                <div className="glass-panel p-8 mb-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                        <svg width="200" height="200" viewBox="0 0 24 24" fill="white"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" /></svg>
                    </div>

                    <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                        <span>💳</span> Billing & Subscription
                    </h2>

                    <div className="flex items-center gap-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg max-w-md">
                        <div className="text-2xl">✅</div>
                        <div>
                            <div className="font-bold text-green-400">Account Active</div>
                            <div className="text-sm text-green-400/80">Premium Plan</div>
                        </div>
                    </div>
                    <p className="text-sm text-dim mt-4">
                        Billing management features are coming soon. Contact support for invoice queries.
                    </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-4">
                    <button
                        type="submit"
                        disabled={saving || !isDirty}
                        className={`btn-premium ${saving ? 'opacity-70 cursor-wait' : !isDirty ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {saving ? 'Saving Changes...' : 'Save Changes'}
                    </button>

                    {message && (
                        <div className={`fade-in px-4 py-2 rounded-lg text-sm border ${message.type === 'success'
                                ? 'bg-green-500/10 border-green-500/20 text-green-400'
                                : 'bg-red-500/10 border-red-500/20 text-red-400'
                            }`}>
                            {message.text}
                        </div>
                    )}
                </div>
            </form>
        </div>
    );
};

export default VendorSettings;
