import React from 'react';
import { useNavigate } from 'react-router-dom';

const LandingPage: React.FC = () => {
    const navigate = useNavigate();

    const styles = {
        container: {
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '2rem',
            color: '#fff',
            fontFamily: 'var(--font-family)',
        },
        hero: {
            textAlign: 'center' as const,
            padding: '4rem 1rem',
        },
        heroTitle: {
            fontSize: '3.5rem',
            fontWeight: 800,
            marginBottom: '1rem',
            background: 'linear-gradient(to right, #ec4899, #8b5cf6)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
        },
        heroSubtitle: {
            fontSize: '1.5rem',
            color: '#a1a1aa',
            marginBottom: '2rem',
            maxWidth: '600px',
            marginLeft: 'auto',
            marginRight: 'auto',
        },
        button: {
            backgroundColor: '#ec4899',
            color: 'white',
            border: 'none',
            padding: '1rem 2rem',
            fontSize: '1.2rem',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 600,
            transition: 'transform 0.2s',
        },
        section: {
            padding: '4rem 1rem',
        },
        sectionTitle: {
            textAlign: 'center' as const,
            fontSize: '2.5rem',
            marginBottom: '3rem',
        },
        grid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '2rem',
        },
        card: {
            backgroundColor: '#1f2937',
            padding: '2rem',
            borderRadius: '12px',
            border: '1px solid #374151',
        },
        cardTitle: {
            fontSize: '1.5rem',
            marginBottom: '1rem',
            color: '#f472b6',
        },
        cardText: {
            color: '#d1d5db',
            lineHeight: 1.6,
        },
        footer: {
            textAlign: 'center' as const,
            padding: '4rem 1rem',
            borderTop: '1px solid #374151',
            color: '#6b7280',
            marginTop: '4rem',
        }
    };

    return (
        <div style={styles.container}>
            {/* Nav */}
            <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 0' }}>
                <div style={{ fontWeight: 700, fontSize: '1.5rem' }}>Loyalty Ladies</div>
                <button
                    onClick={() => navigate('/admin/login')}
                    style={{ ...styles.button, padding: '0.5rem 1rem', fontSize: '1rem', backgroundColor: 'transparent', border: '1px solid #ec4899' }}
                >
                    Vendor Login
                </button>
            </nav>

            {/* Hero */}
            <header style={styles.hero}>
                <h1 style={styles.heroTitle}>Digital Loyalty.<br />No App Required.</h1>
                <p style={styles.heroSubtitle}>
                    Replace paper stamp cards with a stunning, fraud-resistant digital solution.
                    Your customers just scan and go.
                </p>
                <button style={styles.button} onClick={() => window.location.href = 'mailto:hello@loyaltyladies.com'}>
                    Get Started
                </button>
            </header>

            {/* Benefits */}
            <section style={styles.section}>
                <h2 style={styles.sectionTitle}>Why Go Digital?</h2>
                <div style={styles.grid}>
                    <div style={styles.card}>
                        <h3 style={styles.cardTitle}>📱 No App Install</h3>
                        <p style={styles.cardText}>
                            Customers join in seconds by scanning a QR code and verifying via WhatsApp.
                            No friction, higher conversion.
                        </p>
                    </div>
                    <div style={styles.card}>
                        <h3 style={styles.cardTitle}>🛡️ Fraud Resistant</h3>
                        <p style={styles.cardText}>
                            Say goodbye to fake stamps. Our rotating encrypted tokens and server-side verification
                            ensure every stamp is legitimate.
                        </p>
                    </div>
                    <div style={styles.card}>
                        <h3 style={styles.cardTitle}>📊 Real Analytics</h3>
                        <p style={styles.cardText}>
                            Know exactly who your loyal customers are. Track visits, redemptions, and staff performance
                            in real-time.
                        </p>
                    </div>
                </div>
            </section>

            {/* How it Works */}
            <section style={styles.section}>
                <h2 style={styles.sectionTitle}>How It Works</h2>
                <div style={styles.grid}>
                    <div style={styles.card}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>1️⃣</div>
                        <h3 style={styles.cardTitle}>Scan to Join</h3>
                        <p style={styles.cardText}>
                            Customers scan your unique QR code at the counter to join your program instantly.
                        </p>
                    </div>
                    <div style={styles.card}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>2️⃣</div>
                        <h3 style={styles.cardTitle}>Collect Stamps</h3>
                        <p style={styles.cardText}>
                            They present their phone. Your staff enters a PIN to stamp their digital card securely.
                        </p>
                    </div>
                    <div style={styles.card}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>3️⃣</div>
                        <h3 style={styles.cardTitle}>Get Rewarded</h3>
                        <p style={styles.cardText}>
                            When the card is full, the system alerts your staff to redeem the reward and reset the card.
                        </p>
                    </div>
                </div>
            </section>

            <footer style={styles.footer}>
                &copy; {new Date().getFullYear()} Loyalty Ladies. All rights reserved.
            </footer>
        </div>
    );
};

export default LandingPage;
