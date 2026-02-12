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
        nav: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1rem 0',
            marginBottom: '4rem',
        },
        logo: {
            fontWeight: 800,
            fontSize: '1.8rem',
            background: 'linear-gradient(to right, #fff, #94a3b8)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.02em',
        },
        hero: {
            textAlign: 'center' as const,
            padding: '6rem 1rem',
            position: 'relative' as const,
            animation: 'fadeIn 0.8s ease-out',
        },
        heroTitle: {
            fontSize: 'min(4.5rem, 12vw)',
            fontWeight: 800,
            lineHeight: 1.1,
            marginBottom: '1.5rem',
            letterSpacing: '-0.03em',
        },
        heroTitleGradient: {
            background: 'linear-gradient(to right, #ec4899, #8b5cf6, #3b82f6)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
        },
        heroSubtitle: {
            fontSize: '1.25rem',
            color: 'var(--text-muted)',
            marginBottom: '3rem',
            maxWidth: '600px',
            marginLeft: 'auto',
            marginRight: 'auto',
            lineHeight: 1.6,
        },
        ctaButton: {
            backgroundColor: 'var(--primary)',
            color: 'white',
            border: 'none',
            padding: '1rem 2.5rem',
            fontSize: '1.1rem',
            borderRadius: '50px',
            cursor: 'pointer',
            fontWeight: 600,
            transition: 'all 0.3s ease',
            boxShadow: '0 4px 15px rgba(236, 72, 153, 0.4)',
        },
        secondaryButton: {
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            color: 'white',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '0.8rem 1.5rem',
            fontSize: '0.9rem',
            borderRadius: '50px',
            cursor: 'pointer',
            fontWeight: 500,
            transition: 'all 0.2s ease',
            marginLeft: '1rem',
        },
        section: {
            padding: '6rem 1rem',
        },
        sectionHeader: {
            textAlign: 'center' as const,
            marginBottom: '4rem',
        },
        sectionTitle: {
            fontSize: '2.5rem',
            fontWeight: 700,
            marginBottom: '1rem',
        },
        sectionText: {
            color: 'var(--text-muted)',
            fontSize: '1.1rem',
        },
        grid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '2rem',
        },
        card: {
            backgroundColor: 'var(--bg-card)',
            padding: '2.5rem',
            borderRadius: '24px',
            border: 'var(--glass-border)',
            backdropFilter: 'blur(10px)',
            transition: 'transform 0.3s ease, box-shadow 0.3s ease',
        },
        cardIcon: {
            fontSize: '2.5rem',
            marginBottom: '1.5rem',
            display: 'inline-block',
            padding: '1rem',
            borderRadius: '16px',
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
        },
        cardTitle: {
            fontSize: '1.25rem',
            fontWeight: 600,
            marginBottom: '0.75rem',
            color: '#fff',
        },
        cardText: {
            color: 'var(--text-muted)',
            lineHeight: 1.6,
        },
        footer: {
            textAlign: 'center' as const,
            padding: '4rem 1rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.05)',
            color: 'var(--text-muted)',
            marginTop: '4rem',
        },
        highlight: {
            color: 'var(--accent)',
            fontWeight: 600,
        }
    };

    return (
        <div style={styles.container}>
            {/* Navigation */}
            <nav style={styles.nav}>
                <div style={styles.logo}>Punch Card</div>
                <div>
                    <button
                        onClick={() => navigate('/vendor/login')}
                        style={{ ...styles.secondaryButton, marginLeft: 0 }}
                    >
                        Vendor Login
                    </button>
                </div>
            </nav>

            {/* Hero Section */}
            <header style={styles.hero}>
                <h1 style={styles.heroTitle}>
                    Smart Digital Loyalty for<br />
                    <span style={styles.heroTitleGradient}>Growing Businesses</span>
                </h1>
                <p style={styles.heroSubtitle}>
                    Punch Card replaces paper stamp cards with a simple, branded digital loyalty experience.
                    No app required.
                </p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                    <button
                        style={styles.ctaButton}
                        onClick={() => window.location.href = 'mailto:hello@punchcard.loyalty'}
                        onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                        onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                        Get Started
                    </button>
                    <button
                        style={styles.secondaryButton}
                        onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                    >
                        Learn More
                    </button>
                </div>
            </header>

            {/* Value Props */}
            <section id="features" style={styles.section}>
                <div style={styles.sectionHeader}>
                    <h2 style={styles.sectionTitle}>Why Choose Punch Card?</h2>
                    <p style={styles.sectionText}>Turn occasional customers into regulars.</p>
                </div>

                <div style={styles.grid}>
                    <div style={styles.card}>
                        <div style={styles.cardIcon}>📱</div>
                        <h3 style={styles.cardTitle}>No App Required</h3>
                        <p style={styles.cardText}>
                            Customers scan a QR code and verify via WhatsApp. No downloads, no account passwords, no friction.
                        </p>
                    </div>

                    <div style={styles.card}>
                        <div style={styles.cardIcon}>🔄</div>
                        <h3 style={styles.cardTitle}>Increase Repeat Visits</h3>
                        <p style={styles.cardText}>
                            Loyalty programs drive frequency. With a digital card, the reward goal is always visible on their phone.
                        </p>
                    </div>

                    <div style={styles.card}>
                        <div style={styles.cardIcon}>🛡️</div>
                        <h3 style={styles.cardTitle}>Reduce Fraud</h3>
                        <p style={styles.cardText}>
                            Eliminate fake stamps. Our system requires staff login, logs every transaction, and enforces cooldowns.
                        </p>
                    </div>

                    <div style={styles.card}>
                        <div style={styles.cardIcon}>🎨</div>
                        <h3 style={styles.cardTitle}>Your Brand, Front & Center</h3>
                        <p style={styles.cardText}>
                            Fully customizable with your logo and colors. It transforms a loyalty mechanic into a brand channel.
                        </p>
                    </div>

                    <div style={styles.card}>
                        <div style={styles.cardIcon}>📊</div>
                        <h3 style={styles.cardTitle}>Real Insights</h3>
                        <p style={styles.cardText}>
                            Track visits, redemptions, and staff performance. Capture basic customer data without complexity.
                        </p>
                    </div>

                    <div style={styles.card}>
                        <div style={styles.cardIcon}>⚡</div>
                        <h3 style={styles.cardTitle}>Fast & Professional</h3>
                        <p style={styles.cardText}>
                            Staff interface is built for speed. Scan, confirm, done. It feels modern, controlled, and professional.
                        </p>
                    </div>
                </div>
            </section>

            {/* How It Works */}
            <section style={{ ...styles.section, background: 'rgba(255,255,255,0.02)', borderRadius: '32px' }}>
                <div style={styles.sectionHeader}>
                    <h2 style={styles.sectionTitle}>Simple for Everyone</h2>
                </div>

                <div style={{ ...styles.grid, maxWidth: '900px', margin: '0 auto' }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '4rem', marginBottom: '1rem', opacity: 0.8 }}>1</div>
                        <h3 style={styles.cardTitle}>Scan</h3>
                        <p style={styles.cardText}>Customer scans your QR code to join.</p>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '4rem', marginBottom: '1rem', opacity: 0.8 }}>2</div>
                        <h3 style={styles.cardTitle}>Verify</h3>
                        <p style={styles.cardText}>One-tap verification via WhatsApp.</p>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '4rem', marginBottom: '1rem', opacity: 0.8 }}>3</div>
                        <h3 style={styles.cardTitle}>Stamp</h3>
                        <p style={styles.cardText}>Staff stamps digitally in seconds.</p>
                    </div>
                </div>
            </section>

            <footer style={styles.footer}>
                <div style={{ marginBottom: '1rem', fontWeight: 700, color: '#fff' }}>Punch Card</div>
                <p>&copy; {new Date().getFullYear()} Punch Card Loyalty. All rights reserved.</p>
            </footer>
        </div>
    );
};

export default LandingPage;
