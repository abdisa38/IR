import { useLanguage, languageOptions } from './language'
import { useState, useEffect } from 'react'
import { Icon, Logo, Mark, Modal } from './shared-ui'
import { SiteLink } from './site-routing'
import './location.css'

export function ContactAction({ kind, className = 'button secondary' }: { kind: 'call' | 'directions'; className?: string }) {
  const { t } = useLanguage()
  if (kind === 'call') {
    return (
      <a
        href="tel:0909511588"
        className={className}
        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'none' }}
        aria-label="Call Ilillii Hotel at 0909511588"
      >
        <Icon name="phone" size={17} />
        {t('location.phoneTitle')}: 0909511588
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
      {t('location.directions')}
    </a>
  )
}
export function MapPreview() {
  const [state, setState] = useState('placeholder')
  const { t } = useLanguage()
  return (
    <div className="location-map-component">
      <div className={`location-map-stage map-state-${state}`} aria-live="polite">
        <div className="location-map-lines" aria-hidden="true" />
        <div className="location-map-content">
          {state === 'loading' ? (
            <>
              <span className="map-state-symbol"><Icon name="globe" size={30} /></span>
              <h3>Loading map preview…</h3>
            </>
          ) : state === 'error' ? (
            <>
              <span className="map-state-symbol"><Icon name="info" size={30} /></span>
              <h3>{t('location.address')}</h3>
              <p>{t('location.town')}<br />{t('location.phoneTitle')}: 0909511588</p>
              <button className="map-retry" onClick={() => setState('placeholder')}>
                Retry map preview<Icon name="arrow" size={15} />
              </button>
            </>
          ) : state === 'external' ? (
            <>
              <span className="map-state-symbol"><Icon name="arrow" size={28} /></span>
              <h3>Continue in your maps app.</h3>
              <button className="map-retry" onClick={() => setState('placeholder')}>
                Return to location preview
              </button>
            </>
          ) : (
            <>
              <span className="reserved-location-mark"><Mark /></span>
              <h3>{t('location.mapTitle')}</h3>
              <p style={{ margin: '6px 0 0', fontSize: '13px', color: 'var(--color-muted)' }}>
                {t('location.address')}
              </p>
              <span className="location-town-tag">
                <Icon name="pin" size={13} />
                {t('location.town').toUpperCase()}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
export function FindUsSection() {
  const { t } = useLanguage()
  return (
    <section className="find-ilillii" id="find-us">
      <div className="container">
        <div className="find-section-heading">
          <span className="eyebrow">{t('location.eyebrow')}</span>
          <h2>{t('location.heading')}</h2>
        </div>
        <div className="location-composition">
          <MapPreview />
          <div className="visit-information">
            <span className="eyebrow">{t('location.visitEyebrow')}</span>
            <h3>{t('location.visitTitleLine1')}<br />{t('location.visitTitleLine2')}</h3>
            <div className="visit-detail">
              <Icon name="pin" size={21} />
              <div>
                <strong>{t('location.address')}</strong>
                <span>{t('location.town')}</span>
              </div>
            </div>
            <div className="visit-detail">
              <Icon name="phone" size={21} />
              <div>
                <strong>{t('location.phoneTitle')}: 0909511588</strong>
                <a href="tel:0909511588" style={{ color: 'var(--color-brand)', fontWeight: 600, display: 'inline-block', marginTop: '2px' }}>
                  {t('location.tapToCall')}
                </a>
              </div>
            </div>
            <div className="visit-detail">
              <Icon name="clock" size={21} />
              <div>
                <strong>{t('location.hoursTitle')}</strong>
                <span>{t('location.hoursValue')}</span>
              </div>
            </div>
            <div className="visit-actions">
              <ContactAction kind="directions" className="button primary" />
              <ContactAction kind="call" />
            </div>
            <SiteLink href="/#menu" className="visit-order-link">
              {t('location.exploreMenuBtn')}<Icon name="arrow" size={17} />
            </SiteLink>
          </div>
        </div>
      </div>
    </section>
  )
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
  const [historyOpen, setHistoryOpen] = useState(false)
  const { language, setLanguage, t } = useLanguage()

  const updateCustomerState = () => {
    try {
      const token = localStorage.getItem('ilillii_token')
      const userStr = localStorage.getItem('ilillii_user')
      if (!token && !userStr) {
        localStorage.removeItem('ilillii_customer')
        setCustomer(null)
        return
      }
      if (userStr) {
        const u = JSON.parse(userStr)
        if (u.isStaff || ['admin', 'manager', 'kitchen', 'cashier', 'waiter', 'owner'].includes(u.role)) {
          // Staff/admin accounts must not appear as customer guest profile in public header
          localStorage.removeItem('ilillii_customer')
          setCustomer(null)
          return
        }
      }
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
    const handleOpenHistory = () => setHistoryOpen(true)
    window.addEventListener('ilillii-auth-changed', updateCustomerState)
    window.addEventListener('ilillii-open-history', handleOpenHistory)
    return () => {
      window.removeEventListener('ilillii-auth-changed', updateCustomerState)
      window.removeEventListener('ilillii-open-history', handleOpenHistory)
    }
  }, [])

  useEffect(() => {
    if (mobileNav) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileNav(false)
        setProfileOpen(false)
        setLanguageOpen(false)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKey)
    }
  }, [mobileNav])

  return (
    <>
      <div className="announcement">
        <span>{t('announcement.tagline')}</span>
        <span className="announcement-location">
          <Icon name="pin" size={13} /> {t('announcement.location')}
        </span>
      </div>
      <header className="header">
        <div className="container nav-inner">
          <div className="nav-top-bar">
            <Logo />
            <nav className="navigation" aria-label="Main navigation">
              <SiteLink
                href="/#home"
                className={active === 'home' ? 'active' : ''}
                onClick={() => setMobileNav(false)}
              >
                {t('nav.home')}
              </SiteLink>
              <SiteLink
                href="/#menu"
                className={active === 'menu' ? 'active' : ''}
                onClick={() => setMobileNav(false)}
              >
                {t('nav.menu')}
              </SiteLink>
              <a href="/#about" onClick={() => setMobileNav(false)}>
                {t('nav.story')}
              </a>
              <a href="/#find-us" onClick={() => setMobileNav(false)}>
                {t('nav.findUs')}
              </a>
              <SiteLink
                href="/contact"
                className={active === 'contact' ? 'active' : ''}
                onClick={() => setMobileNav(false)}
              >
                {t('nav.contact')}
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
                  {t('nav.signIn')}
                </SiteLink>
              )}
            </nav>
            <div className="nav-actions">
              <button
                type="button"
                className="language-button"
                onClick={() => setLanguageOpen(true)}
                aria-label="Choose Language"
              >
                <Icon name="globe" size={19} />
                <span className="lang-code-pill desktop-only">{language === 'om' ? 'Oro' : language === 'am' ? 'Amh' : 'Eng'}</span>
                <Icon name="down" size={11} className="desktop-only" />
              </button>
              {cartCount !== undefined ? (
                <button
                  className="cart-trigger button primary nav-order"
                  onClick={onOpenCart}
                  aria-label={`Open cart, ${cartCount} items`}
                >
                  <Icon name="bag" size={18} />
                  <span>{t('nav.yourCart')}</span>
                  <strong>{cartCount}</strong>
                </button>
              ) : (
                <SiteLink href="/#menu" className="button primary nav-order desktop-order-cta">
                  {t('nav.orderFood')}<Icon name="arrow" size={17} />
                </SiteLink>
              )}
              <button
                className="icon-button mobile-toggle"
                aria-label="Toggle navigation"
                aria-expanded={mobileNav}
                onClick={() => setMobileNav(!mobileNav)}
              >
                <Icon name={mobileNav ? 'close' : 'menu'} size={20} />
              </button>
            </div>
          </div>
          {cartCount === undefined && (
            <div className="mobile-header-order-cta">
              <SiteLink href="/#menu" className="button primary mobile-order-btn">
                {t('nav.orderFood')}<Icon name="arrow" size={16} />
              </SiteLink>
            </div>
          )}
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
                <span>{t('nav.yourCart')} ({cartCount})</span>
                <Icon name="arrow" size={15} />
              </button>
            ) : (
              <SiteLink
                href="/#menu"
                className="mobile-drawer-cta"
                onClick={() => setMobileNav(false)}
              >
                <Icon name="meal" size={18} />
                <span>{t('hero.exploreMenu')}</span>
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
                  <span>{t('nav.home')}</span>
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
                  <span>{t('nav.menu')}</span>
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
                  <span>{t('nav.story')}</span>
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
                  <span>{t('nav.findUs')}</span>
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
                  <span>{t('nav.contact')}</span>
                </span>
                <Icon name="arrow" size={14} />
              </SiteLink>
              <button
                type="button"
                className="mobile-nav-item"
                style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left', font: 'inherit', cursor: 'pointer' }}
                onClick={() => {
                  setMobileNav(false)
                  setHistoryOpen(true)
                }}
              >
                <span className="mobile-nav-item-left">
                  <Icon name="clock" size={18} />
                  <span>{t('nav.pastOrders')}</span>
                </span>
                <Icon name="arrow" size={14} />
              </button>
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
                    <span>{t('nav.guestProfile')}</span>
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
                    <strong>{t('nav.signIn')}</strong>
                  </div>
                </div>
                <Icon name="arrow" size={16} />
              </SiteLink>
            )}

            <div className="mobile-drawer-footer">
              <div>{t('location.address')} · {t('location.town')}</div>
              <a href="tel:0909511588" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Icon name="phone" size={14} /> {t('location.phoneTitle')}: 0909511588
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
              style={{ width: '100%', justifyContent: 'center', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              onClick={() => {
                setProfileOpen(false)
                setHistoryOpen(true)
              }}
            >
              <Icon name="clock" size={16} />View Past Orders
            </button>
            <button
              type="button"
              className="button secondary"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={() => {
                localStorage.removeItem('ilillii_customer')
                localStorage.removeItem('ilillii_token')
                localStorage.removeItem('ilillii_user')
                sessionStorage.clear()
                setCustomer(null)
                setProfileOpen(false)
                window.dispatchEvent(new CustomEvent('ilillii-auth-changed'))
              }}
            >
            Sign Out
            </button>
          </div>
        </Modal>
      )}

      {historyOpen && (
        <PastOrdersModal close={() => setHistoryOpen(false)} />
      )}
    </>
  )
}

interface SavedPastOrder {
  orderNumber: string
  date: string
  total: number
  table?: string
  type: string
  items: Array<{ name: string; quantity: number; price: number }>
  status?: string
}

function PastOrdersModal({ close }: { close: () => void }) {
  const [orders, setOrders] = useState<SavedPastOrder[]>([])
  const { t } = useLanguage()

  useEffect(() => {
    try {
      const saved = localStorage.getItem('ilillii_order_history')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) setOrders(parsed)
      }
    } catch (e) {}
  }, [])

  const startFresh = () => {
    localStorage.removeItem('ilillii_active_order_id')
    localStorage.removeItem('ilillii_active_order_time')
    close()
    window.location.hash = '#menu'
    window.dispatchEvent(new CustomEvent('ilillii-clear-cart'))
  }

  const clearHistory = () => {
    if (confirm(t('history.clearConfirm'))) {
      localStorage.removeItem('ilillii_order_history')
      setOrders([])
    }
  }

  return (
    <Modal title={t('history.title')} close={close}>
      <div style={{ maxHeight: '68vh', overflowY: 'auto', paddingRight: '4px' }}>
        <p style={{ margin: '0 0 14px', fontSize: '13px', color: 'var(--color-muted)' }}>
          {t('history.desc')}
        </p>

        {orders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 16px', background: '#fdfbf7', borderRadius: '12px', border: '1px dashed #e2d9cd' }}>
            <span style={{ display: 'grid', placeItems: 'center', width: '48px', height: '48px', margin: '0 auto 12px', background: '#f5ebe1', borderRadius: '50%', color: 'var(--color-brand)' }}>
              <Icon name="bag" size={24} />
            </span>
            <h4 style={{ margin: '0 0 4px', fontSize: '15px', color: 'var(--color-ink)' }}>{t('history.emptyTitle')}</h4>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-muted)' }}>
              {t('history.emptyDesc')}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {orders.map((ord, idx) => (
              <div
                key={ord.orderNumber || idx}
                style={{
                  background: '#fdfbf7',
                  border: '1px solid #ebdcd0',
                  borderRadius: '12px',
                  padding: '14px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <strong style={{ fontSize: '14px', color: 'var(--color-brand)' }}>#{ord.orderNumber}</strong>
                  <span style={{ fontSize: '11px', color: 'var(--color-muted)' }}>
                    {ord.date ? new Date(ord.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recent'}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: '#57534e', marginBottom: '8px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <span style={{ background: '#f5ebe1', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                    {ord.type || 'Dine in'}{ord.table ? ` · Table ${ord.table}` : ''}
                  </span>
                  {ord.status && (
                    <span style={{ background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                      {ord.status}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '13px', borderTop: '1px solid #ebdcd0', paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {ord.items?.map((it, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>{it.quantity} × {it.name}</span>
                      <span style={{ fontWeight: 600 }}>{(it.price * it.quantity).toLocaleString()} ETB</span>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #ebdcd0', marginTop: '8px', paddingTop: '8px', fontWeight: 700, fontSize: '14px' }}>
                  <span>{t('common.total')}</span>
                  <span style={{ color: 'var(--color-brand)' }}>{ord.total?.toLocaleString()} ETB</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
          <button
            type="button"
            className="button primary"
            style={{ flex: 1, justifyContent: 'center' }}
            onClick={startFresh}
          >
            {t('history.startFresh')}
          </button>
          {orders.length > 0 && (
            <button
              type="button"
              className="button secondary"
              style={{ fontSize: '12px', padding: '6px 12px' }}
              onClick={clearHistory}
            >
              {t('history.clear')}
            </button>
          )}
        </div>
      </div>
    </Modal>
  )
}

export function GlobalFooter() {
  const [languageOpen, setLanguageOpen] = useState(false)
  const { language, setLanguage, t } = useLanguage()
  return (
    <footer className="global-footer">
      <div className="container">
        <div className="global-footer-top">
          <div className="footer-brand-wrap">
            <Logo light />
            <p className="footer-addr">
              {t('footer.brandAddr')}
            </p>
            <a href="tel:0909511588" className="footer-phone">
              <Icon name="phone" size={13} />
              <span>0909511588</span>
            </a>
          </div>

          <div className="footer-links-group">
            <span className="footer-title">{t('footer.explore')}</span>
            <div className="footer-nav-row">
              <SiteLink href="/#home">{t('nav.home')}</SiteLink>
              <SiteLink href="/#menu">{t('nav.menu')}</SiteLink>
              <SiteLink href="/contact">{t('nav.contact')}</SiteLink>
              <SiteLink href="/#login">{t('nav.signIn')}</SiteLink>
            </div>
          </div>

          <div className="footer-lang-group">
            <span className="footer-title">{t('footer.language')}</span>
            <button className="footer-action footer-compact-lang" onClick={() => setLanguageOpen(true)}>
              <Icon name="globe" size={14} />
              <span>{language === 'om' ? 'Afaan Oromoo' : language === 'am' ? 'አማርኛ' : 'English'}</span>
            </button>
          </div>
        </div>

        <div className="global-footer-bottom">
          <span>© {new Date().getFullYear()} {t('brand.hotel')}. {t('footer.rights')}</span>
          <span>{t('footer.hours')}</span>
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
