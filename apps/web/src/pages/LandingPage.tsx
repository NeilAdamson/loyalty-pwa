import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const LandingPage: React.FC = () => {
    const navigate = useNavigate();
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToSection = (id: string) => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    };

    const styles = {
        container: {
            color: '#fff',
            fontFamily: 'var(--font-family)',
            overflowX: 'hidden' as const,
        },
        nav: {
            position: 'fixed' as const,
            top: 0,
            left: 0,
            right: 0,
            zIndex: 100,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: scrolled ? '0.75rem 1.5rem' : '1rem 1.5rem',
            background: scrolled ? '#e2ddcf' : 'transparent',
            backdropFilter: 'blur(12px)',
            borderBottom: scrolled ? '1px solid rgba(0, 0, 0, 0.08)' : 'none',
            boxShadow: scrolled ? '0 2px 12px rgba(0, 0, 0, 0.06)' : 'none',
            transition: 'all 0.3s ease',
        },
        navLinks: {
            display: 'flex',
            gap: '2rem',
            alignItems: 'center',
        },
        navLink: {
            color: '#e2e8f0',
            textDecoration: 'none',
            fontSize: '0.95rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'color 0.2s',
        },
        logoWrapper: {
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            cursor: 'pointer',
        },
        logoImg: {
            height: '32px',
            width: 'auto',
        },
        logoText: {
            fontWeight: 800,
            fontSize: '1.4rem',
            color: '#fff',
            letterSpacing: '-0.02em',
        },
        hero: {
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            padding: '8rem 2rem 4rem',
            position: 'relative' as const,
        },
        heroGrid: {
            maxWidth: '1200px',
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '4rem',
            alignItems: 'center',
            width: '100%',
        },
        heroContent: {
            animation: 'fadeIn 0.8s ease-out',
        },
        heroTitle: {
            fontSize: 'min(3.2rem, 8vw)',
            fontWeight: 800,
            lineHeight: 1.15,
            marginBottom: '1.5rem',
            letterSpacing: '-0.03em',
        },
        heroSubtitle: {
            fontSize: '1.15rem',
            color: '#e2e8f0',
            marginBottom: '2.5rem',
            lineHeight: 1.65,
            maxWidth: '520px',
        },
        heroImageContainer: {
            position: 'relative' as const,
            animation: 'float 6s ease-in-out infinite',
            display: 'flex',
            justifyContent: 'center',
        },
        heroImage: {
            maxWidth: '100%',
            height: 'auto',
            borderRadius: '24px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
        },
        primaryButton: {
            background: '#dc2626',
            color: 'white',
            border: 'none',
            padding: '1rem 2.5rem',
            fontSize: '1.05rem',
            borderRadius: '50px',
            cursor: 'pointer',
            fontWeight: 700,
            transition: 'all 0.3s ease',
            boxShadow: '0 2px 8px rgba(185, 28, 28, 0.35)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
        },
        secondaryButton: {
            backgroundColor: 'transparent',
            color: '#1d4ed8',
            border: '2px solid #1d4ed8',
            padding: '1rem 2rem',
            fontSize: '1.05rem',
            borderRadius: '50px',
            cursor: 'pointer',
            fontWeight: 600,
            transition: 'all 0.2s ease',
        },
        buttonGroup: {
            display: 'flex',
            gap: '1rem',
            flexWrap: 'wrap' as const,
        },
        section: {
            padding: '8rem 2rem',
        },
        containerInner: {
            maxWidth: '1200px',
            margin: '0 auto',
        },
        sectionHeaderCentered: {
            textAlign: 'center' as const,
            marginBottom: '5rem',
            maxWidth: '800px',
            margin: '0 auto 5rem',
        },
        sectionTitle: {
            fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
            fontWeight: 800,
            marginBottom: '1rem',
            letterSpacing: '-0.02em',
        },
        sectionSubtitle: {
            color: '#374151',
            fontSize: '1.15rem',
            lineHeight: 1.6,
        },
        twoColumn: {
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '4rem',
            alignItems: 'center',
        },
        grid3: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '2rem',
        },
        card: {
            padding: '2.5rem',
            borderRadius: '24px',
            border: 'var(--glass-border)',
            background: 'var(--bg-card)',
            backdropFilter: 'blur(10px)',
            transition: 'transform 0.3s ease',
        },
        landingCard: {
            padding: '2.5rem',
            borderRadius: '24px',
            border: '1px solid rgba(0, 0, 0, 0.06)',
            background: 'rgba(255, 255, 255, 0.92)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.06)',
            transition: 'transform 0.3s ease',
        },
        iconBox: {
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'rgba(185, 28, 28, 0.12)',
            color: '#b91c1c',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.5rem',
            marginBottom: '1.5rem',
        },
        stepBox: {
            textAlign: 'center' as const,
            padding: '2rem',
        },
        stepNumber: {
            fontSize: '1rem',
            fontWeight: 700,
            color: 'var(--primary)',
            textTransform: 'uppercase' as const,
            letterSpacing: '0.1em',
            marginBottom: '1rem',
            display: 'block',
        },
        stepIcon: {
            width: '80px',
            height: '80px',
            margin: '0 auto 2rem',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2rem',
        },
        checkList: {
            listStyle: 'none',
            padding: 0,
            margin: 0,
        },
        checkItem: {
            display: 'flex',
            alignItems: 'flex-start',
            gap: '1rem',
            marginBottom: '1rem',
            fontSize: '1.1rem',
            color: 'var(--text-muted)',
        },
        checkIcon: {
            color: '#10b981',
            flexShrink: 0,
            marginTop: '0.2rem',
        },
        footer: {
            padding: '4rem 2rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.05)',
            background: 'rgba(0,0,0,0.2)',
        },
        badge: {
            display: 'inline-block',
            padding: '0.5rem 1rem',
            borderRadius: '20px',
            background: 'rgba(185, 28, 28, 0.14)',
            color: '#b91c1c',
            fontSize: '0.85rem',
            fontWeight: 700,
            marginBottom: '1.5rem',
            letterSpacing: '0.08em',
            textTransform: 'uppercase' as const,
        },
        badgeYellow: {
            display: 'inline-block',
            padding: '0.5rem 1rem',
            borderRadius: '20px',
            background: 'rgba(180, 83, 9, 0.16)',
            color: '#b45309',
            fontSize: '0.85rem',
            fontWeight: 700,
            marginBottom: '1.5rem',
            letterSpacing: '0.08em',
            textTransform: 'uppercase' as const,
        },
        badgeBlue: {
            display: 'inline-block',
            padding: '0.5rem 1rem',
            borderRadius: '20px',
            background: 'rgba(29, 78, 216, 0.12)',
            color: '#1d4ed8',
            fontSize: '0.85rem',
            fontWeight: 700,
            marginBottom: '1.5rem',
            letterSpacing: '0.08em',
            textTransform: 'uppercase' as const,
        }
    };

    return (
        <div style={styles.container}>
            {/* NAVIGATION */}
            <nav style={styles.nav} className={scrolled ? 'landing-nav-scrolled' : 'landing-nav-at-top'}>
                <div style={styles.logoWrapper} onClick={() => scrollToSection('hero')}>
                    <img src="/assets/Punch-card-logo-sm-01.avif" alt="PunchCard" className="landing-nav-logo" />
                </div>
                <div style={styles.navLinks} className="landing-nav-links">
                    <span className="landing-nav-link" style={styles.navLink} onClick={() => scrollToSection('how-it-works')}>How It Works</span>
                    <span className="landing-nav-link" style={styles.navLink} onClick={() => scrollToSection('benefits')}>Benefits</span>
                    <span className="landing-nav-link" style={styles.navLink} onClick={() => scrollToSection('businesses')}>Businesses</span>
                </div>

                <div className="landing-nav-buttons" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <button
                        style={{ ...styles.secondaryButton, padding: '0.5rem 1.25rem', fontSize: '0.9rem' }}
                        onClick={() => navigate('/vendor/login')}
                    >
                        Vendor Login
                    </button>
                    <button
                        style={{ ...styles.primaryButton, padding: '0.5rem 1.25rem', fontSize: '0.9rem' }}
                        onClick={() => window.location.href = 'mailto:info@punchcard.co.za'}
                    >
                        Contact Us
                    </button>
                </div>
            </nav>

            {/* 1. HERO SECTION */}
            <section id="hero" style={styles.hero} className="landing-hero-bg">
                <div style={styles.heroGrid} className="landing-hero-grid">
                    <div style={styles.heroContent}>
                        <img src="/assets/Punch-card-logo-01.avif" alt="PunchCard" className="landing-hero-logo" />
                        <h1 style={styles.heroTitle}>
                            <span className="landing-headline-red">Turn Every Visit Into a Return Visit</span>
                        </h1>
                        <p style={styles.heroSubtitle} className="landing-hero-subtitle">
                            PunchCard replaces paper loyalty cards with a simple digital stamp card that works instantly from a QR code.
                            <br /><br />
                            <strong>No apps to download.</strong> No cards to lose. Just scan, stamp and reward loyal customers.
                        </p>
                        <div style={styles.buttonGroup} className="landing-hero-buttons">
                            <button
                                style={styles.primaryButton}
                                className="landing-cta-primary"
                                onClick={() => window.location.href = 'mailto:info@punchcard.co.za?subject=Get PunchCard for my business'}
                            >
                                Get PunchCard For Your Business
                            </button>
                            <button
                                style={styles.secondaryButton}
                                className="landing-cta-secondary"
                                onClick={() => scrollToSection('problem')}
                            >
                                Learn More
                            </button>
                        </div>
                    </div>
                    <div style={styles.heroImageContainer} className="landing-hero-image-desk">
                        <div className="landing-pic-frame landing-hero-pic" style={{ maxWidth: '520px', width: '100%' }}>
                            <img src="/assets/Pics/Punchcard-pic-05.jpg" alt="Digital loyalty on your phone" />
                        </div>
                    </div>
                </div>
            </section>

            {/* 2. PROBLEM SECTION */}
            <section id="problem" style={styles.section} className="landing-cream landing-circle-pale-yellow">
                <div style={styles.containerInner}>
                    <div style={styles.twoColumn} className="landing-two-column">
                        <div className="landing-pic-frame">
                            <img src="/assets/Pics/Punchcard-pic-03.jpg" alt="Paper cards don't work" />
                        </div>
                        <div>
                            <span style={styles.badge}>The Problem</span>
                            <h2 style={styles.sectionTitle} className="landing-title-red">Paper Loyalty Cards Don't Work Anymore</h2>
                            <p style={styles.sectionSubtitle} className="mb-6">
                                Many small businesses still rely on paper stamp cards to reward loyal customers. But paper cards create problems:
                            </p>
                            <ul style={styles.checkList}>
                                <li style={styles.checkItem}><span style={styles.checkIcon}>✗</span> Customers forget them at home</li>
                                <li style={styles.checkItem}><span style={styles.checkIcon}>✗</span> Cards get lost or damaged</li>
                                <li style={styles.checkItem}><span style={styles.checkIcon}>✗</span> Staff can accidentally give extra stamps</li>
                                <li style={styles.checkItem}><span style={styles.checkIcon}>✗</span> Businesses cannot track how the program performs</li>
                            </ul>
                            <p style={{ ...styles.sectionSubtitle, marginTop: '2rem', color: '#1f2937', fontWeight: 500 }}>
                                PunchCard replaces paper cards with a digital loyalty system that works instantly from a QR code.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* 3. PRODUCT EXPLANATION */}
            <section style={styles.section} className="landing-cream landing-circle-pale-red">
                <div style={styles.containerInner}>
                    <div style={styles.sectionHeaderCentered} className="landing-section-header">
                        <span style={styles.badgeYellow}>The Solution</span>
                        <h2 style={styles.sectionTitle} className="landing-title-amber">A Digital Loyalty Card That Works From Your Phone</h2>
                        <p style={styles.sectionSubtitle}>
                            PunchCard gives your business a branded digital loyalty card that customers access directly from their phone.
                        </p>
                    </div>

                    <div style={{ ...styles.twoColumn, alignItems: 'center' }} className="landing-two-column">
                        <div>
                            <p style={{ ...styles.sectionSubtitle, marginBottom: '1.5rem' }}>
                                Customers simply scan a QR code in your store and their loyalty card opens instantly in their browser.
                            </p>
                            <p style={{ ...styles.sectionSubtitle, marginBottom: '1.5rem', fontWeight: 700 }}>
                                There is no app to download and no account to manage.
                            </p>
                            <p style={styles.sectionSubtitle}>
                                Your staff add stamps by scanning the customer's card, and PunchCard tracks everything automatically.
                            </p>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div className="landing-pic-frame" style={{ maxWidth: '90%', margin: '0 auto' }}>
                                <img src="/assets/Pics/Punchcard-pic-01.jpg" alt="Scan QR code for your card" />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* 4. HOW IT WORKS */}
            <section id="how-it-works" style={styles.section} className="landing-cream landing-circle-pale-blue">
                <div style={styles.containerInner}>
                    <div style={styles.sectionHeaderCentered} className="landing-section-header">
                        <h2 style={styles.sectionTitle} className="landing-headline-blue">Three Simple Steps</h2>
                        <p style={styles.sectionSubtitle}>How PunchCard works for you and your customers.</p>
                    </div>

                    <div style={styles.grid3} className="landing-grid-three">
                        <div style={styles.stepBox}>
                            <span style={{ ...styles.stepNumber, color: '#b91c1c' }}>Step 1</span>
                            <div style={styles.stepIcon}>📱</div>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', color: '#b91c1c' }}>Customers Join Instantly</h3>
                            <p style={styles.sectionSubtitle}>
                                Customers scan your QR code and verify their phone number via WhatsApp. Their digital loyalty card opens immediately.
                            </p>
                        </div>
                        <div style={styles.stepBox}>
                            <span style={{ ...styles.stepNumber, color: '#b45309' }}>Step 2</span>
                            <div style={styles.stepIcon}>✨</div>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', color: '#b45309' }}>Staff Add Stamps</h3>
                            <p style={styles.sectionSubtitle}>
                                Your staff log into the PunchCard staff screen and scan the customer's card to add a stamp. The process takes only seconds.
                            </p>
                        </div>
                        <div style={styles.stepBox}>
                            <span style={{ ...styles.stepNumber, color: '#1d4ed8' }}>Step 3</span>
                            <div style={styles.stepIcon}>🎁</div>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', color: '#1d4ed8' }}>Rewards Are Redeemed</h3>
                            <p style={styles.sectionSubtitle}>
                                When the card is full, staff confirm the reward redemption and a new card automatically begins.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* PICTURE STRIP – See PunchCard in action */}
            <section style={{ padding: '4rem 2rem' }} className="landing-cream landing-circle-pale-yellow">
                <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                    <h2 style={{ ...styles.sectionTitle, textAlign: 'center', marginBottom: '1rem' }} className="landing-headline-amber">See PunchCard In Action</h2>
                    <p className="landing-pic-strip-intro" style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto 2rem', padding: '0 1rem', fontSize: '1.1rem', lineHeight: 1.6, color: '#374151' }}>
                        PunchCard fits into the moments you already have—at the counter, in the café, at the till. Convenience at your fingertips no matter where you are. Customers have their card ready on their phone and loyalty gets rewarded. No extra hardware; no extra hassle; no extra overheads.
                    </p>
                    <div className="landing-pic-strip">
                        {[1, 2, 3, 4, 5].map((n) => (
                            <div key={n} className="landing-pic-frame" style={{ minHeight: '180px' }}>
                                <img src={`/assets/Pics/Punchcard-pic-0${n}.jpg`} alt={`PunchCard in use ${n}`} />
                            </div>
                        ))}
                    </div>
                    <p className="landing-pic-strip-outro" style={{ textAlign: 'center', marginTop: '1.5rem', padding: '0 1rem', fontSize: '0.95rem', lineHeight: 1.5, color: '#6b7280' }}>
                        Your brand, your space—PunchCard fits where you work.
                    </p>
                </div>
            </section>

            {/* 5. BUSINESS BENEFITS */}
            <section id="benefits" style={styles.section} className="landing-cream landing-circle-pale-red">
                <div style={styles.containerInner}>
                    <div style={styles.sectionHeaderCentered} className="landing-section-header">
                        <h2 style={styles.sectionTitle} className="landing-title-blue">Why Businesses Choose PunchCard</h2>
                    </div>

                    <div style={styles.grid3} className="landing-grid-three">
                        <div style={styles.landingCard}>
                            <div style={{ ...styles.iconBox, background: 'rgba(185, 28, 28, 0.12)', color: '#b91c1c' }}>📈</div>
                            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.75rem', color: '#b91c1c' }}>Increase Repeat Visits</h3>
                            <p style={{ color: '#374151', lineHeight: 1.6, margin: 0 }}>Encourage customers to return more often and build stronger loyalty.</p>
                        </div>
                        <div style={styles.landingCard}>
                            <div style={{ ...styles.iconBox, background: 'rgba(180, 83, 9, 0.12)', color: '#b45309' }}>🔍</div>
                            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.75rem', color: '#b45309' }}>No More Lost Cards</h3>
                            <p style={{ color: '#374151', lineHeight: 1.6, margin: 0 }}>Customers always have their loyalty card on their phone.</p>
                        </div>
                        <div style={styles.landingCard}>
                            <div style={{ ...styles.iconBox, background: 'rgba(29, 78, 216, 0.12)', color: '#1d4ed8' }}>👥</div>
                            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.75rem', color: '#1d4ed8' }}>Staff Accountability</h3>
                            <p style={{ color: '#374151', lineHeight: 1.6, margin: 0 }}>Every stamp and reward redemption is recorded and linked to a staff member.</p>
                        </div>
                        <div style={styles.landingCard}>
                            <div style={{ ...styles.iconBox, background: 'rgba(185, 28, 28, 0.12)', color: '#b91c1c' }}>🎨</div>
                            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.75rem', color: '#b91c1c' }}>Branded Experience</h3>
                            <p style={{ color: '#374151', lineHeight: 1.6, margin: 0 }}>Your logo and colours appear on the customer's digital loyalty card.</p>
                        </div>
                        <div style={styles.landingCard}>
                            <div style={{ ...styles.iconBox, background: 'rgba(180, 83, 9, 0.12)', color: '#b45309' }}>⚡</div>
                            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.75rem', color: '#b45309' }}>Simple For Staff</h3>
                            <p style={{ color: '#374151', lineHeight: 1.6, margin: 0 }}>Staff simply scan and stamp. No complicated systems to learn.</p>
                        </div>
                        <div style={styles.landingCard}>
                            <div style={{ ...styles.iconBox, background: 'rgba(29, 78, 216, 0.12)', color: '#1d4ed8' }}>📊</div>
                            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.75rem', color: '#1d4ed8' }}>Business Insights</h3>
                            <p style={{ color: '#374151', lineHeight: 1.6, margin: 0 }}>See exactly how many members join and how rewards are redeemed.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* 6. IDEAL BUSINESSES & 7. CUSTOMER EXPERIENCE */}
            <section id="businesses" style={styles.section} className="landing-cream landing-circle-pale-blue">
                <div style={styles.containerInner}>
                    <div style={styles.twoColumn} className="landing-two-column">
                        <div>
                            <h2 style={{ ...styles.sectionTitle, marginBottom: '2rem' }} className="landing-title-amber">Perfect For Businesses With Repeat Customers</h2>
                            <p style={styles.sectionSubtitle}>PunchCard works especially well for:</p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '1.5rem', marginBottom: '2.5rem' }}>
                                {['Coffee Shops', 'Takeaways', 'Car Washes', 'Hair Salons', 'Barber Shops', 'Nail Salons', 'Bakeries', 'Juice Bars', 'Gyms', 'Retail Stores'].map(biz => (
                                    <span key={biz} style={{ padding: '0.5rem 1rem', background: 'rgba(254, 249, 195, 0.5)', borderRadius: '8px', border: '1px solid rgba(180, 83, 9, 0.2)', color: '#1f2937', fontWeight: 600 }}>
                                        {biz}
                                    </span>
                                ))}
                            </div>
                            <p style={{ color: '#1f2937', fontWeight: 600, fontSize: '1.1rem' }}>
                                If customers visit your business regularly, PunchCard helps turn those visits into loyalty.
                            </p>
                        </div>

                        <div style={{ background: 'rgba(255,255,255,0.7)', padding: '3rem', borderRadius: '24px', border: '1px solid rgba(29, 78, 216, 0.2)', boxShadow: '0 8px 24px rgba(0,0,0,0.06)' }}>
                            <h2 style={{ ...styles.sectionTitle, fontSize: '2rem', marginBottom: '1.5rem', color: '#1d4ed8' }}>Customers Love It Because It's Simple</h2>
                            <ul style={{ ...styles.checkList, marginBottom: '2rem' }}>
                                <li style={{ ...styles.checkItem, color: '#1f2937' }}><span style={{ ...styles.checkIcon, color: '#2563eb' }}>1.</span> Scan the QR code in your store</li>
                                <li style={{ ...styles.checkItem, color: '#1f2937' }}><span style={{ ...styles.checkIcon, color: '#2563eb' }}>2.</span> Enter their phone number</li>
                                <li style={{ ...styles.checkItem, color: '#1f2937' }}><span style={{ ...styles.checkIcon, color: '#2563eb' }}>3.</span> Verify via WhatsApp</li>
                                <li style={{ ...styles.checkItem, color: '#1f2937' }}><span style={{ ...styles.checkIcon, color: '#2563eb' }}>4.</span> Show their card to collect stamps</li>
                            </ul>
                            <div style={{ paddingLeft: '1.5rem', borderLeft: '3px solid #3b82f6' }}>
                                <p style={{ fontWeight: 600, marginBottom: '0.5rem', color: '#1f2937' }}>No apps to download.</p>
                                <p style={{ fontWeight: 600, marginBottom: '0.5rem', color: '#1f2937' }}>No cards to carry.</p>
                                <p style={{ color: '#374151' }}>Their loyalty card is always on their phone.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* 8. SECURITY & 9. FEATURES */}
            <section style={styles.section} className="landing-cream landing-circle-pale-yellow">
                <div style={styles.containerInner}>
                    <div style={styles.twoColumn} className="landing-two-column">
                        <div>
                            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🛡️</div>
                            <h2 style={styles.sectionTitle} className="landing-title-blue">Built With Security In Mind</h2>
                            <p style={{ ...styles.sectionSubtitle, marginBottom: '2rem' }}>
                                PunchCard includes several protections to ensure loyalty rewards are issued fairly.
                            </p>
                            <ul style={styles.checkList}>
                                <li style={{ ...styles.checkItem, color: '#374151' }}><span style={{ ...styles.checkIcon, color: '#1d4ed8' }}>✓</span> Staff must log in before stamping</li>
                                <li style={{ ...styles.checkItem, color: '#374151' }}><span style={{ ...styles.checkIcon, color: '#1d4ed8' }}>✓</span> Customer cards use rotating QR codes</li>
                                <li style={{ ...styles.checkItem, color: '#374151' }}><span style={{ ...styles.checkIcon, color: '#1d4ed8' }}>✓</span> Every stamp and reward is recorded</li>
                                <li style={{ ...styles.checkItem, color: '#374151' }}><span style={{ ...styles.checkIcon, color: '#1d4ed8' }}>✓</span> Audit logs track activity</li>
                            </ul>
                            <p style={{ marginTop: '2rem', color: '#374151' }}>This ensures loyalty programs remain fair and transparent.</p>
                        </div>

                        <div style={styles.landingCard}>
                            <h2 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: '1.5rem', color: '#b45309' }}>Everything You Need To Run A Loyalty Program</h2>
                            <p style={{ color: '#374151', marginBottom: '1.5rem' }}>PunchCard includes:</p>
                            <div className="landing-features-inner" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div style={{ color: '#374151', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#b91c1c', flexShrink: 0 }}></div>
                                    Branded digital cards
                                </div>
                                <div style={{ color: '#374151', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#b45309', flexShrink: 0 }}></div>
                                    QR codes for your store
                                </div>
                                <div style={{ color: '#374151', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#1d4ed8', flexShrink: 0 }}></div>
                                    Staff login system
                                </div>
                                <div style={{ color: '#374151', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#b91c1c', flexShrink: 0 }}></div>
                                    Vendor dashboard
                                </div>
                                <div style={{ color: '#374151', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#b45309', flexShrink: 0 }}></div>
                                    Member management
                                </div>
                                <div style={{ color: '#374151', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#1d4ed8', flexShrink: 0 }}></div>
                                    Secure stamp logging
                                </div>
                            </div>
                            <p style={{ marginTop: '2rem', color: '#374151', fontWeight: 600 }}>
                                PunchCard handles the technology so you can focus on your customers.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* 10. GETTING STARTED */}
            <section style={styles.section} className="landing-cream landing-circle-pale-red">
                <div style={styles.containerInner}>
                    <div style={styles.sectionHeaderCentered} className="landing-section-header">
                        <h2 style={styles.sectionTitle} className="landing-headline-red">Getting Started Is Easy</h2>
                        <p style={styles.sectionSubtitle}>Most businesses can be live within a few days.</p>
                    </div>

                    <div className="landing-getting-started-steps" style={{ display: 'flex', justifyContent: 'center', gap: '2rem', flexWrap: 'wrap', marginBottom: '4rem' }}>
                        <div className="landing-step-card" style={{ background: 'rgba(255,255,255,0.6)', padding: '2rem', borderRadius: '16px', border: '1px solid rgba(185, 28, 28, 0.2)', flex: '1 1 250px', textAlign: 'center' }}>
                            <div className="landing-step-img-wrap" style={{ marginBottom: '1rem' }}>
                                <img src="/assets/Pics/Punchcard-pic-01.jpg" alt="Contact PunchCard" style={{ width: '100%', maxWidth: '140px', height: '100px', objectFit: 'cover', borderRadius: '12px', margin: '0 auto', display: 'block' }} />
                            </div>
                            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#b91c1c', marginBottom: '1rem' }}>Step 1</div>
                            <p style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1f2937' }}>Contact PunchCard.</p>
                        </div>
                        <div className="landing-step-card" style={{ background: 'rgba(255,255,255,0.6)', padding: '2rem', borderRadius: '16px', border: '1px solid rgba(180, 83, 9, 0.2)', flex: '1 1 250px', textAlign: 'center' }}>
                            <div className="landing-step-img-wrap" style={{ marginBottom: '1rem' }}>
                                <img src="/assets/Pics/Punchcard-pic-02.jpg" alt="Branded card and QR posters" style={{ width: '100%', maxWidth: '140px', height: '100px', objectFit: 'cover', borderRadius: '12px', margin: '0 auto', display: 'block' }} />
                            </div>
                            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#b45309', marginBottom: '1rem' }}>Step 2</div>
                            <p style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1f2937' }}>We set up your branded loyalty card and provide QR posters.</p>
                        </div>
                        <div className="landing-step-card" style={{ background: 'rgba(255,255,255,0.6)', padding: '2rem', borderRadius: '16px', border: '1px solid rgba(29, 78, 216, 0.2)', flex: '1 1 250px', textAlign: 'center' }}>
                            <div className="landing-step-img-wrap" style={{ marginBottom: '1rem' }}>
                                <img src="/assets/Pics/Punchcard-pic-03.jpg" alt="Display QR and start stamping" style={{ width: '100%', maxWidth: '140px', height: '100px', objectFit: 'cover', borderRadius: '12px', margin: '0 auto', display: 'block' }} />
                            </div>
                            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1d4ed8', marginBottom: '1rem' }}>Step 3</div>
                            <p style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1f2937' }}>Display the QR code in your store and start stamping.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* 11. ABOUT & 12. CONTACT CTA */}
            <section style={{ padding: '6rem 2rem', textAlign: 'center' }} className="landing-cream landing-circle-pale-blue">
                <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                    <h2 style={{ ...styles.sectionTitle, fontSize: '2rem', marginBottom: '1.5rem' }} className="landing-headline-blue">Helping Local Businesses Build Loyal Customers</h2>
                    <p style={{ ...styles.sectionSubtitle, marginBottom: '1rem', color: '#1f2937' }}>
                        PunchCard was created to help local businesses modernise their loyalty programs. By replacing paper stamp cards with a simple digital solution, PunchCard makes it easier for businesses to reward loyal customers and encourage repeat visits.
                    </p>
                    <p style={{ ...styles.sectionSubtitle, marginBottom: '4rem', color: '#1f2937' }}>
                        Our goal is to give small businesses the same tools large brands use to build loyalty. Without the complexity.
                    </p>

                    <div style={{ background: '#fff', padding: '4rem 2rem', borderRadius: '24px', border: '3px solid #ef4444', boxShadow: '0 12px 40px rgba(0,0,0,0.15)' }}>
                        <h2 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', fontWeight: 800, marginBottom: '1rem', letterSpacing: '-0.02em', color: '#1f2937' }}>Interested In PunchCard For Your Business?</h2>
                        <p style={{ ...styles.sectionSubtitle, marginBottom: '2.5rem', color: '#374151' }}>Contact us to learn more or request a demonstration.</p>
                        <button
                            style={{ ...styles.primaryButton, padding: '1.2rem 3rem', fontSize: '1.2rem' }}
                            className="landing-cta-primary"
                            onClick={() => window.location.href = 'mailto:info@punchcard.co.za'}
                        >
                            Contact Us Today
                        </button>
                        <p style={{ marginTop: '1.5rem', color: '#6b7280' }}>
                            Or email us directly at <a href="mailto:info@punchcard.co.za" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}>info@punchcard.co.za</a>
                        </p>
                    </div>
                </div>
            </section>

            {/* 13. FOOTER */}
            <footer style={{ ...styles.footer, borderTop: '1px solid rgba(0,0,0,0.06)', background: '#fffef5', padding: '4rem 2rem' }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '2rem' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', cursor: 'pointer' }} onClick={() => scrollToSection('hero')}>
                            <img src="/assets/Punch-card-logo-sm-01.avif" alt="PunchCard" className="landing-footer-logo" />
                        </div>
                        <p style={{ color: '#1f2937', fontWeight: 600, marginBottom: '0.5rem' }}>Digital Loyalty Made Simple</p>
                        <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>&copy; {new Date().getFullYear()} PunchCard South Africa</p>
                    </div>

                    <div style={{ display: 'flex', gap: '4rem', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <span style={{ color: '#1f2937', fontWeight: 700, marginBottom: '0.5rem' }}>Links</span>
                            <a style={{ color: '#374151', textDecoration: 'none', cursor: 'pointer' }} onClick={() => scrollToSection('hero')}>Home</a>
                            <a style={{ color: '#374151', textDecoration: 'none', cursor: 'pointer' }} onClick={() => scrollToSection('how-it-works')}>How It Works</a>
                            <a style={{ color: '#374151', textDecoration: 'none', cursor: 'pointer' }} onClick={() => scrollToSection('businesses')}>Businesses</a>
                            <a href="mailto:info@punchcard.co.za" style={{ color: '#1d4ed8', textDecoration: 'none', fontWeight: 500 }}>Contact</a>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <span style={{ color: '#1f2937', fontWeight: 700, marginBottom: '0.5rem' }}>Contact</span>
                            <a href="mailto:info@punchcard.co.za" style={{ color: '#1d4ed8', textDecoration: 'none', fontWeight: 500 }}>info@punchcard.co.za</a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
