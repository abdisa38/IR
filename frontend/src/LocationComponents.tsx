import { useLanguage, languageOptions } from './language'
import { useState, useEffect } from 'react'
import { Icon, Logo, Mark, Modal } from './shared-ui'
import { SiteLink } from './site-routing'
import './location.css'

export function ContactAction({ kind, className = 'button secondary' }: { kind: 'call' | 'directions'; className?: string }) {
  if (kind === 'call') {
    return (
      <a
        href="tel:0909511588"
        className={className}
        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'none' }}
        aria-label="Call Ilillii Hotel Manager at 0909511588"
      >
        <Icon name="phone" size={17} />
        Call Manager (0909511588)
      </a>
    )
  }
  return (
    <a
      href="https://www.google.com/maps/search/?api=1&query=General+Wako+Gutu+Square+Bale+Robe+Ethiopia"
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'none' }}
      aria-label="Get directions to General Wako Gutu Square, Bale Robe"
    >
      <Icon name="pin" size={17} />
      Get Directions
    </a>
  )
}
export function MapPreview() {
  const [state, setState] = useState('placeholder')
  return <div className="location-map-component"><div className={`location-map-stage map-state-${state}`} aria-live="polite"><div className="location-map-lines" aria-hidden="true" /><div className="location-map-content">{state === 'loading' ? <><span className="map-state-symbol"><Icon name="globe" size={30} /></span><h3>Loading map preview…</h3></> : state === 'error' ? <><span className="map-state-symbol"><Icon name="info" size={30} /></span><h3>Around Awraris, near General Wako Gutu Square</h3><p>Bale Robe, Oromia, Ethiopia.<br />Manager: 0909511588</p><button className="map-retry" onClick={() => setState('placeholder')}>Retry map preview<Icon name="arrow" size={15} /></button></> : state === 'external' ? <><span className="map-state-symbol"><Icon name="arrow" size={28} /></span><h3>Continue in your maps app.</h3><button className="map-retry" onClick={() => setState('placeholder')}>Return to location preview</button></> : <><span className="reserved-location-mark"><Mark /></span><h3>See you in Bale Robe</h3><p style={{ margin: '6px 0 0', fontSize: '13px', color: 'var(--color-muted)' }}>Around Awraris, near General Wako Gutu Square</p><span className="location-town-tag"><Icon name="pin" size={13} />BALE ROBE · OROMIA</span></>}</div></div></div>
}
export function FindUsSection() {
  return <section className="find-ilillii" id="find-us"><div className="container"><div className="find-section-heading"><span className="eyebrow">GOOD FOOD IS JUST THE BEGINNING</span><h2>Find Ilillii Hotel</h2></div><div className="location-composition"><MapPreview /><div className="visit-information"><span className="eyebrow">YOUR PLACE IN BALE ROBE</span><h3>There’s a place<br />for you here.</h3><div className="visit-detail"><Icon name="pin" size={21} /><div><strong>Around Awraris, near General Wako Gutu Square</strong><span>Bale Robe, Oromia, Ethiopia</span></div></div><div className="visit-detail"><Icon name="phone" size={21} /><div><strong>Manager: 0909511588</strong><a href="tel:0909511588" style={{ color: 'var(--color-brand)', fontWeight: 600, display: 'inline-block', marginTop: '2px' }}>Tap to call manager</a></div></div><div className="visit-detail"><Icon name="clock" size={21} /><div><strong>Opening hours</strong><span>Daily: 6:30 AM – 11:00 PM</span></div></div><div className="visit-actions"><ContactAction kind="directions" className="button primary" /><ContactAction kind="call" /></div><SiteLink href="/#menu" className="visit-order-link">Explore our menu & order food<Icon name="arrow" size={17} /></SiteLink></div></div></div></section>
}
export function GlobalHeader({
  active = 'home',
  cartCount,
  onOpenCart,
}: {
  active?: 'home' | 'menu' | 'contact'
  cartCount?: number
  onOpenCart?: () => void
}) {
  const [mobileNav, setMobileNav] = useState(false)
  const [languageOpen, setLanguageOpen] = useState(false)
  const [customer, setCustomer] = useState<{ name?: string; phone?: string; email?: string; avatar?: string; lastOrder?: string } | null>(null)
  const [profileOpen, setProfileOpen] = useState(false)
  const { language, setLanguage } = useLanguage()

  const updateCustomerState = () => {
    try {
      const saved = localStorage.getItem('ilillii_customer')
      if (saved) {
        setCustomer(JSON.parse(saved))
      } else {
        setCustomer(null)
      }
    } catch (e) {
      setCustomer(null)
    }
  }

  useEffect(() => {
    updateCustomerState()
    window.addEventListener('ilillii-auth-changed', updateCustomerState)
    return () => window.removeEventListener('ilillii-auth-changed', updateCustomerState)
  }, [])

  return (
    <>
      <div className="announcement">
        <span>A place to gather. A meal to remember.</span>
        <span className="announcement-location">
          <Icon name="pin" size={13} /> Bale Robe, Oromia
        </span>
      </div>
      <header className="header">
        <div className="container nav-inner">
          <Logo />
          <nav className="navigation" aria-label="Main navigation">
            <SiteLink
              href="/#home"
              className={active === 'home' ? 'active' : ''}
              onClick={() => setMobileNav(false)}
            >
              Home
            </SiteLink>
            <SiteLink
              href="/#menu"
              className={active === 'menu' ? 'active' : ''}
              onClick={() => setMobileNav(false)}
            >
              Our Menu
            </SiteLink>
            <a href="/#about" onClick={() => setMobileNav(false)}>
              Our Story
            </a>
            <a href="/#find-us" onClick={() => setMobileNav(false)}>
              Find Us
            </a>
            <SiteLink
              href="/contact"
              className={active === 'contact' ? 'active' : ''}
              onClick={() => setMobileNav(false)}
            >
              Contact
            </SiteLink>
            {customer?.name ? (
              <button
                type="button"
                onClick={() => {
                  setProfileOpen(true)
                  setMobileNav(false)
                }}
                className="nav-profile-pill"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
              >
                <span className="nav-profile-avatar" style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--color-brand)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: '12px', fontWeight: 700, overflow: 'hidden' }}>
                  {customer.avatar ? (
                    <img src={customer.avatar} alt={customer.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    customer.name.charAt(0).toUpperCase()
                  )}
                </span>
                <span>{customer.name.split(' ')[0]}</span>
              </button>
            ) : (
              <SiteLink href="/#login" onClick={() => setMobileNav(false)}>
                Sign In
              </SiteLink>
            )}
          </nav>
          <div className="nav-actions">
            <button
              className="language-button"
              onClick={() => setLanguageOpen(true)}
              aria-label="Choose Language"
            >
              <Icon name="globe" size={17} />
              <span>{language === 'om' ? 'Afaan Oromoo' : language === 'am' ? 'አማርኛ' : 'English'}</span>
              <Icon name="down" size={13} />
            </button>
            {cartCount !== undefined ? (
              <button
                className="cart-trigger button primary nav-order"
                onClick={onOpenCart}
                aria-label={`Open cart, ${cartCount} items`}
              >
                <Icon name="bag" size={18} />
                <span>Your cart</span>
                <strong>{cartCount}</strong>
              </button>
            ) : (
              <SiteLink href="/#menu" className="button primary nav-order">
                Order Food<Icon name="arrow" size={17} />
              </SiteLink>
            )}
            <button
              className="icon-button mobile-toggle"
              aria-label="Toggle navigation"
              aria-expanded={mobileNav}
              onClick={() => setMobileNav(!mobileNav)}
            >
              <Icon name={mobileNav ? 'close' : 'menu'} />
            </button>
          </div>
        </div>
      </header>

      {/* Modern Professional Mobile Navigation Sheet */}
      {mobileNav && (
        <>
          <div className="mobile-nav-backdrop" onClick={() => setMobileNav(false)} />
          <div className="mobile-nav-sheet">
            <div className="mobile-nav-header">
              <Logo />
              <button
                className="icon-button"
                onClick={() => setMobileNav(false)}
                aria-label="Close navigation"
              >
                <Icon name="close" size={18} />
              </button>
            </div>

            {cartCount !== undefined && cartCount > 0 ? (
              <button
                className="mobile-drawer-cta"
                onClick={() => {
                  setMobileNav(false)
                  onOpenCart?.()
                }}
              >
                <Icon name="bag" size={18} />
                <span>View Your Cart ({cartCount} {cartCount === 1 ? 'item' : 'items'})</span>
                <Icon name="arrow" size={15} />
              </button>
            ) : (
              <SiteLink
                href="/#menu"
                className="mobile-drawer-cta"
                onClick={() => setMobileNav(false)}
              >
                <Icon name="meal" size={18} />
                <span>Explore Menu & Order Food</span>
                <Icon name="arrow" size={15} />
              </SiteLink>
            )}

            <nav className="mobile-nav-links">
              <SiteLink
                href="/#home"
                className={`mobile-nav-item ${active === 'home' ? 'active' : ''}`}
                onClick={() => setMobileNav(false)}
              >
                <span className="mobile-nav-item-left">
                  <Icon name="meal" size={18} />
                  <span>Home</span>
                </span>
                <Icon name="arrow" size={14} />
              </SiteLink>
              <SiteLink
                href="/#menu"
                className={`mobile-nav-item ${active === 'menu' ? 'active' : ''}`}
                onClick={() => setMobileNav(false)}
              >
                <span className="mobile-nav-item-left">
                  <Icon name="menu" size={18} />
                  <span>Our Menu</span>
                </span>
                <Icon name="arrow" size={14} />
              </SiteLink>
              <a
                href="/#about"
                className="mobile-nav-item"
                onClick={() => setMobileNav(false)}
              >
                <span className="mobile-nav-item-left">
                  <Icon name="heart" size={18} />
                  <span>Our Story</span>
                </span>
                <Icon name="arrow" size={14} />
              </a>
              <a
                href="/#find-us"
                className="mobile-nav-item"
                onClick={() => setMobileNav(false)}
              >
                <span className="mobile-nav-item-left">
                  <Icon name="pin" size={18} />
                  <span>Find Us in Bale Robe</span>
                </span>
                <Icon name="arrow" size={14} />
              </a>
              <SiteLink
                href="/contact"
                className={`mobile-nav-item ${active === 'contact' ? 'active' : ''}`}
                onClick={() => setMobileNav(false)}
              >
                <span className="mobile-nav-item-left">
                  <Icon name="phone" size={18} />
                  <span>Contact & Hotel Info</span>
                </span>
                <Icon name="arrow" size={14} />
              </SiteLink>
            </nav>

            {customer?.name ? (
              <button
                type="button"
                className="mobile-guest-card"
                onClick={() => {
                  setProfileOpen(true)
                  setMobileNav(false)
                }}
              >
                <div className="mobile-guest-left">
                  <div className="mobile-avatar-circle">
                    {customer.avatar ? (
                      <img src={customer.avatar} alt={customer.name} />
                    ) : (
                      customer.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="mobile-guest-info">
                    <strong>{customer.name}</strong>
                    <span>Guest Profile & Saved Orders</span>
                  </div>
                </div>
                <Icon name="arrow" size={16} />
              </button>
            ) : (
              <SiteLink
                href="/#login"
                className="mobile-guest-card"
                onClick={() => setMobileNav(false)}
              >
                <div className="mobile-guest-left">
                  <div className="mobile-avatar-circle" style={{ background: '#f5ebe1', color: 'var(--color-brand)' }}>
                    <Icon name="user" size={18} />
                  </div>
                  <div className="mobile-guest-info">
                    <strong>Sign In / Guest Profile</strong>
                    <span>Track orders & view history</span>
                  </div>
                </div>
                <Icon name="arrow" size={16} />
              </SiteLink>
            )}

            <div className="mobile-lang-row">
              <span className="mobile-lang-label">
                <Icon name="globe" size={14} /> Language:
              </span>
              <div className="mobile-lang-pills">
                {languageOptions.map(opt => (
                  <button
                    key={opt.id}
                    className={`mobile-lang-pill ${language === opt.id ? 'active' : ''}`}
                    onClick={() => {
                      setLanguage(opt.id)
                    }}
                  >
                    {opt.native}
                  </button>
                ))}
              </div>
            </div>

            <div className="mobile-drawer-footer">
              <div>Around Awraris, near General Wako Gutu Square · Bale Robe</div>
              <a href="tel:0909511588" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Icon name="phone" size={14} /> Hotline: 0909511588
              </a>
            </div>
          </div>
        </>
      )}
      {languageOpen && (
        <Modal title="Choose Language / Qooqa Filadhaa" close={() => setLanguageOpen(false)}>
          <div className="language-options">
            {languageOptions.map(option => (
              <button
                key={option.id}
                className={`language-option ${language === option.id ? 'selected' : ''}`}
                onClick={() => {
                  setLanguage(option.id)
                  setLanguageOpen(false)
                }}
              >
                <span>{option.native} — {option.label}</span>
                <Icon name={language === option.id ? 'check' : 'globe'} />
              </button>
            ))}
          </div>
        </Modal>
      )}

      {profileOpen && customer && (
        <Modal title="Your Guest Profile" close={() => setProfileOpen(false)}>
          <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
            <div
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: 'var(--color-brand)',
                color: 'white',
                fontSize: '22px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px',
                overflow: 'hidden',
                boxShadow: '0 4px 12px rgba(184, 32, 50, 0.2)',
              }}
            >
              {customer.avatar ? (
                <img src={customer.avatar} alt={customer.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                customer.name ? customer.name.charAt(0).toUpperCase() : 'G'
              )}
            </div>
            <h2 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 750, color: 'var(--color-ink)' }}>{customer.name}</h2>
            {customer.phone && <p style={{ margin: '0 0 4px', fontSize: '13px', color: 'var(--color-muted)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}><Icon name="phone" size={13} />{customer.phone}</p>}
            {customer.email && <p style={{ margin: '0', fontSize: '13px', color: 'var(--color-muted)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}><Icon name="info" size={13} />{customer.email}</p>}
          </div>

          {customer.lastOrder && (
            <div style={{ background: '#fcf8f4', border: '1px solid var(--color-line)', borderRadius: '10px', padding: '14px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <strong style={{ fontSize: '13px', color: 'var(--color-ink)' }}>Recent Order</strong>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-brand)', background: 'white', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--color-line)' }}>
                  {customer.lastOrder}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-muted)', lineHeight: 1.4 }}>
                Saved under your name. When you place an order, our kitchen and service team immediately see your order details.
              </p>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <SiteLink
              href="/#menu"
              className="button primary"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={() => setProfileOpen(false)}
            >
              Order Food<Icon name="arrow" size={16} />
            </SiteLink>
            <button
              type="button"
              className="button secondary"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={() => {
                localStorage.removeItem('ilillii_customer')
                localStorage.removeItem('ilillii_token')
                setCustomer(null)
                setProfileOpen(false)
                window.dispatchEvent(new CustomEvent('ilillii-auth-changed'))
              }}
            >
              Switch Account / Sign Out
            </button>
          </div>
        </Modal>
      )}
    </>
  )
}

export function GlobalFooter() {
  const [languageOpen, setLanguageOpen] = useState(false)
  const { language, setLanguage } = useLanguage()
  return (
    <footer className="global-footer">
      <div className="container">
        <div className="global-footer-top">
          <div className="footer-brand-wrap">
            <Logo light />
            <p className="footer-addr">
              Around Awraris, near General Wako Gutu Square · Bale Robe, Oromia
            </p>
            <a href="tel:0909511588" className="footer-phone">
              <Icon name="phone" size={13} />
              <span>0909511588</span>
            </a>
          </div>

          <div className="footer-links-group">
            <span className="footer-title">EXPLORE</span>
            <div className="footer-nav-row">
              <SiteLink href="/#home">Home</SiteLink>
              <SiteLink href="/#menu">Menu</SiteLink>
              <SiteLink href="/contact">Contact</SiteLink>
              <SiteLink href="/#login">Sign In</SiteLink>
            </div>
          </div>

          <div className="footer-lang-group">
            <span className="footer-title">LANGUAGE</span>
            <button className="footer-action footer-compact-lang" onClick={() => setLanguageOpen(true)}>
              <Icon name="globe" size={14} />
              <span>{language === 'om' ? 'Afaan Oromoo' : language === 'am' ? 'አማርኛ' : 'English'}</span>
            </button>
          </div>
        </div>

        <div className="global-footer-bottom">
          <span>© {new Date().getFullYear()} Ilillii Hotel. All rights reserved.</span>
          <span>Bale Robe, Oromia, Ethiopia · Open Daily 7:00 AM – 11:30 PM</span>
        </div>
      </div>
      {languageOpen && (
        <Modal title="Choose Language / Qooqa Filadhaa" close={() => setLanguageOpen(false)}>
          <div className="language-options">
            {languageOptions.map(option => (
              <button
                key={option.id}
                className={`language-option ${language === option.id ? 'selected' : ''}`}
                onClick={() => {
                  setLanguage(option.id)
                  setLanguageOpen(false)
                }}
              >
                <span>{option.native} — {option.label}</span>
                <Icon name={language === option.id ? 'check' : 'globe'} />
              </button>
            ))}
          </div>
        </Modal>
      )}
    </footer>
  )
}
