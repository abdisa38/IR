import { useLanguage, languageOptions } from './language'
import { useState, useEffect } from 'react'
import { Icon, Logo, Mark, Modal } from './shared-ui'
import { SiteLink } from './site-routing'
import { api } from './api/client'
import './location.css'

export function ContactAction({ kind, className = 'button secondary' }: { kind: 'call' | 'directions'; className?: string }) {
  const { t } = useLanguage()
  if (kind === 'call') {
    return (
      <a
        href="tel:0938890645"
        className={className}
        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'none' }}
        aria-label="Call Ilillii Hotel at 0938890645"
      >
        <Icon name="phone" size={17} />
        {t('location.phoneTitle')}: 0938890645
      </a>
    )
  }
  return (
    <a
      href="https://maps.app.goo.gl/c5xWhAaUGHdzynk77"
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'none' }}
      aria-label="Get directions to Ilillii Bar & Restaurant, Bale Robe"
    >
      <Icon name="pin" size={17} />
      {t('location.directions')}
    </a>
  )
}
export function MapPreview() {
  const { t } = useLanguage()
  return (
    <div className="location-map-component" style={{ position: 'relative', overflow: 'hidden', borderRadius: '14px', minHeight: '320px' }}>
      <iframe
        src="https://maps.google.com/maps?q=7.121960,40.002844&hl=en&z=16&output=embed"
        width="100%"
        height="100%"
        style={{ border: 0, minHeight: '320px', width: '100%', display: 'block' }}
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        title="Ilillii Bar & Restaurant Location"
      />
      <a
        href="https://maps.app.goo.gl/c5xWhAaUGHdzynk77"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          position: 'absolute',
          bottom: '12px',
          left: '12px',
          background: 'rgba(255, 255, 255, 0.95)',
          padding: '6px 12px',
          borderRadius: '20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
          fontSize: '11px',
          fontWeight: 700,
          color: 'var(--color-brand)',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          textDecoration: 'none',
        }}
      >
        <Icon name="pin" size={12} />
        7.121960, 40.002844 · Open in Maps
      </a>
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
                <strong>{t('location.phoneTitle')}: 0938890645</strong>
                <a href="tel:0938890645" style={{ color: 'var(--color-brand)', fontWeight: 600, display: 'inline-block', marginTop: '2px' }}>
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
  const [statusModalOpen, setStatusModalOpen] = useState(false)
  const [activeOrder, setActiveOrder] = useState<SavedPastOrder | null>(null)
  const { language, setLanguage, t } = useLanguage()

  const updateActiveOrder = () => {
    try {
      const saved = localStorage.getItem('ilillii_order_history')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          const latest = parsed[0]
          const orderTime = latest.date ? new Date(latest.date).getTime() : 0
          // Show active order if placed within the last 12 hours
          if (Date.now() - orderTime < 12 * 60 * 60 * 1000) {
            setActiveOrder(latest)
            if (latest.orderNumber) {
              api.getOrder(latest.orderNumber).then(res => {
                if (res.success && res.order) {
                  if (['completed', 'cancelled'].includes(res.order.status)) {
                    localStorage.removeItem('ilillii_active_order_id')
                    localStorage.removeItem('ilillii_active_order_time')
                    window.dispatchEvent(new CustomEvent('ilillii-order-completed'))
                    return
                  }
                  const s = res.order.status === 'pending'
                    ? 'Submitted'
                    : res.order.status === 'accepted'
                    ? 'Accepted'
                    : res.order.status === 'preparing'
                    ? 'Preparing'
                    : res.order.status === 'ready'
                    ? 'Ready to Serve'
                    : res.order.status === 'completed'
                    ? 'Completed'
                    : res.order.status
                  setActiveOrder(curr => (curr ? { ...curr, status: s } : curr))
                }
              }).catch(() => {})
            }
            return
          }
        }
      }
      setActiveOrder(null)
    } catch (e) {
      setActiveOrder(null)
    }
  }

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
    updateActiveOrder()
    const handleOpenHistory = () => setHistoryOpen(true)
    const handleOpenStatus = () => setStatusModalOpen(true)
    const handleOrderPlaced = () => {
      updateActiveOrder()
    }
    const handleOrderCompleted = () => {
      setActiveOrder(null)
    }
    window.addEventListener('ilillii-auth-changed', updateCustomerState)
    window.addEventListener('ilillii-open-history', handleOpenHistory)
    window.addEventListener('ilillii-open-order-status', handleOpenStatus)
    window.addEventListener('ilillii-order-placed', handleOrderPlaced)
    window.addEventListener('ilillii-order-completed', handleOrderCompleted)
    const interval = setInterval(updateActiveOrder, 15000)
    return () => {
      window.removeEventListener('ilillii-auth-changed', updateCustomerState)
      window.removeEventListener('ilillii-open-history', handleOpenHistory)
      window.removeEventListener('ilillii-open-order-status', handleOpenStatus)
      window.removeEventListener('ilillii-order-placed', handleOrderPlaced)
      window.removeEventListener('ilillii-order-completed', handleOrderCompleted)
      clearInterval(interval)
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
              {activeOrder && (
                <button
                  type="button"
                  className="nav-active-order-btn"
                  onClick={() => setStatusModalOpen(true)}
                  title="View your ordered food and live kitchen status"
                  aria-label={`View active order status: ${activeOrder.status || 'Received'}`}
                >
                  <span className="nav-order-dot" />
                  <span className="desktop-order-title desktop-only">{activeOrder.table ? `Table ${activeOrder.table}` : 'My Order'}</span>
                  <span className="mobile-order-title mobile-only">{activeOrder.table ? `T-${activeOrder.table}` : 'Order'}</span>
                  <span className="nav-order-status-badge">
                    {activeOrder.status || 'Received'}
                  </span>
                </button>
              )}
              <button
                type="button"
                className="language-button"
                onClick={() => setLanguageOpen(true)}
                aria-label="Choose Language"
              >
                <Icon name="globe" size={19} />
                <span className="lang-code-pill desktop-only">{language === 'om' ? 'Oro' : language === 'am' ? 'Amh' : 'Eng'}</span>
                <span className="desktop-only"><Icon name="down" size={11} /></span>
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

            {activeOrder && (
              <button
                className="mobile-drawer-cta"
                style={{ background: '#fff7ed', border: '1.5px solid #fed7aa', color: '#9a3412', marginBottom: '8px' }}
                onClick={() => {
                  setMobileNav(false)
                  setStatusModalOpen(true)
                }}
              >
                <Icon name="meal" size={18} />
                <span style={{ flex: 1, textAlign: 'left' }}>
                  <strong style={{ display: 'block', fontSize: '13px' }}>My Order ({activeOrder.status || 'Received'})</strong>
                  <small style={{ fontSize: '11px', color: '#ea580c' }}>
                    {activeOrder.table ? `Table ${activeOrder.table}` : 'Direct Order'} · {activeOrder.items?.length || 0} items
                  </small>
                </span>
                <Icon name="arrow" size={15} />
              </button>
            )}

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
              <a href="tel:0938890645" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Icon name="phone" size={14} /> {t('location.phoneTitle')}: 0938890645
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

      {statusModalOpen && activeOrder && (
        <ActiveOrderStatusModal
          order={activeOrder}
          close={() => setStatusModalOpen(false)}
          onViewHistory={() => {
            setStatusModalOpen(false)
            setHistoryOpen(true)
          }}
          onAddFood={() => {
            setStatusModalOpen(false)
            window.location.hash = '#menu'
          }}
        />
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

function ActiveOrderStatusModal({
  order,
  close,
  onViewHistory,
  onAddFood,
}: {
  order: SavedPastOrder
  close: () => void
  onViewHistory: () => void
  onAddFood: () => void
}) {
  const [currentOrder, setCurrentOrder] = useState<SavedPastOrder>(order)
  const [liveStatus, setLiveStatus] = useState<string>(order.status || 'Submitted')

  // 5-step visual stepper stages
  const stages = [
    { key: 'Submitted', label: 'Order Sent', sub: 'Kitchen notified', icon: 'clock' },
    { key: 'Accepted', label: 'Accepted', sub: 'Confirmed by kitchen', icon: 'check' },
    { key: 'Preparing', label: 'Preparing', sub: 'Cooking on stove & grill', icon: 'meal' },
    { key: 'Ready', label: 'Ready to Serve', sub: 'At service counter', icon: 'bell' },
    { key: 'Completed', label: 'Completed', sub: 'Served & finalized', icon: 'check' },
  ]

  const getStageIndex = (statusStr: string): number => {
    const s = (statusStr || '').toLowerCase()
    if (s.includes('cancel')) return -1
    if (s.includes('complete') || s.includes('served')) return 4
    if (s.includes('ready')) return 3
    if (s.includes('prep') || s.includes('kitchen') || s.includes('cook')) return 2
    if (s.includes('accept')) return 1
    return 0 // Submitted / pending
  }

  const activeIndex = getStageIndex(liveStatus)

  // Poll live order status every 4 seconds
  useEffect(() => {
    let isMounted = true
    const poll = async () => {
      if (!order.orderNumber) return
      try {
        const res = await api.getOrder(order.orderNumber)
        if (res.success && res.order && isMounted) {
          const apiStatus = res.order.status
          if (['completed', 'cancelled'].includes(apiStatus)) {
            localStorage.removeItem('ilillii_active_order_id')
            localStorage.removeItem('ilillii_active_order_time')
            window.dispatchEvent(new CustomEvent('ilillii-order-completed'))
          }
          const normalized =
            apiStatus === 'pending'
              ? 'Submitted'
              : apiStatus === 'accepted'
              ? 'Accepted'
              : apiStatus === 'preparing'
              ? 'Preparing'
              : apiStatus === 'ready'
              ? 'Ready to Serve'
              : apiStatus === 'completed'
              ? 'Completed'
              : apiStatus
          setLiveStatus(normalized)
          setCurrentOrder(prev => ({
            ...prev,
            status: normalized,
            total: res.order.total || prev.total,
            items: res.order.items?.length
              ? res.order.items.map((it: any) => ({
                  name: it.name,
                  quantity: it.quantity,
                  price: it.price,
                }))
              : prev.items,
          }))

          // Update localStorage order history with latest status
          try {
            const saved = localStorage.getItem('ilillii_order_history')
            if (saved) {
              const parsed = JSON.parse(saved)
              if (Array.isArray(parsed)) {
                const updated = parsed.map((o: any) =>
                  String(o.orderNumber).replace(/^IL-/, '') === String(order.orderNumber).replace(/^IL-/, '')
                    ? { ...o, status: normalized, total: res.order.total || o.total }
                    : o
                )
                localStorage.setItem('ilillii_order_history', JSON.stringify(updated))
              }
            }
          } catch (e) {}
        }
      } catch (e) {}
    }

    poll()
    const timer = setInterval(poll, 2500)
    return () => {
      isMounted = false
      clearInterval(timer)
    }
  }, [order.orderNumber])

  const cleanOrderNum = String(currentOrder.orderNumber || order.orderNumber).replace(/^IL-/, '')

  return (
    <Modal title="Order Status" close={close}>
      <div style={{ maxHeight: '72vh', overflowY: 'auto', paddingRight: '4px' }}>
        {/* Order Header Summary */}
        <div
          style={{
            background: 'linear-gradient(135deg, #fffaf5 0%, #fdf5ed 100%)',
            border: '1.5px solid #fed7aa',
            borderRadius: '14px',
            padding: '16px',
            marginBottom: '18px',
            textAlign: 'center',
          }}
        >
          <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#9a3412', fontWeight: 700 }}>
            Active Order
          </span>
          <div style={{ fontSize: '30px', fontWeight: 800, color: '#b82032', letterSpacing: '0.5px', margin: '4px 0' }}>
            #{cleanOrderNum}
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <span style={{ background: '#fff', border: '1px solid #ebdcd0', padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, color: '#44403c' }}>
              {currentOrder.table ? `Table ${currentOrder.table}` : 'Direct Order'}
            </span>
            <span style={{ background: '#dcfce7', border: '1px solid #bbf7d0', padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, color: '#15803d' }}>
              ● {liveStatus}
            </span>
          </div>
        </div>

        {/* 5-Step Visual Stepper */}
        <div style={{ marginBottom: '22px', padding: '0 8px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {stages.map((stg, idx) => {
              const isCompletedOrder = activeIndex === 4
              const isPast = activeIndex > idx
              const isCurrent = activeIndex === idx
              const isDone = isPast || (idx === 4 && isCompletedOrder)

              return (
                <div key={stg.key} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', position: 'relative' }}>
                  {/* Left Circle & Connecting Line */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '28px' }}>
                    <div
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        display: 'grid',
                        placeItems: 'center',
                        fontSize: '12px',
                        fontWeight: 750,
                        background: isDone ? '#15803d' : isCurrent ? '#b82032' : '#f5f5f4',
                        color: isDone || isCurrent ? '#ffffff' : '#a8a29e',
                        border: isDone ? '2px solid #16a34a' : isCurrent ? '2px solid #981827' : '2px solid #e7e5e4',
                        boxShadow: isCurrent && !isCompletedOrder ? '0 0 0 4px rgba(184, 32, 50, 0.15)' : 'none',
                        transition: 'all 0.3s ease',
                      }}
                    >
                      {isDone ? '✓' : idx + 1}
                    </div>
                    {idx < stages.length - 1 && (
                      <div
                        style={{
                          width: '2px',
                          height: '24px',
                          background: isDone ? '#16a34a' : '#e7e5e4',
                          marginTop: '4px',
                        }}
                      />
                    )}
                  </div>

                  {/* Step Info */}
                  <div style={{ flex: 1, paddingTop: '3px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <strong
                        style={{
                          fontSize: '14px',
                          color: isDone ? '#15803d' : isCurrent ? '#b82032' : '#78716c',
                          fontWeight: isDone || isCurrent ? 750 : 500,
                        }}
                      >
                        {stg.label}
                      </strong>
                      {isDone && idx === 4 ? (
                        <span
                          style={{
                            fontSize: '10px',
                            background: '#dcfce7',
                            color: '#15803d',
                            padding: '1px 8px',
                            borderRadius: '4px',
                            fontWeight: 750,
                            letterSpacing: '0.4px',
                            textTransform: 'uppercase',
                          }}
                        >
                          Completed
                        </span>
                      ) : isCurrent ? (
                        <span
                          style={{
                            fontSize: '10px',
                            background: '#fee2e2',
                            color: '#b82032',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            fontWeight: 700,
                            letterSpacing: '0.4px',
                            textTransform: 'uppercase',
                          }}
                        >
                          In Progress
                        </span>
                      ) : null}
                    </div>
                    <small style={{ fontSize: '12px', color: isDone || isCurrent ? '#44403c' : '#a8a29e', display: 'block', marginTop: '1px' }}>
                      {stg.sub}
                    </small>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Ordered Dishes List */}
        <div style={{ background: '#fdfbf7', border: '1px solid #ebdcd0', borderRadius: '12px', padding: '14px', marginBottom: '16px' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#44403c', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
            <span>Ordered Dishes</span>
            <span>{currentOrder.items?.length || 0} items</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
            {currentOrder.items?.map((it, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', color: '#292524' }}>
                <span>{it.quantity} × {it.name}</span>
                <span style={{ fontWeight: 600 }}>{(it.price * it.quantity).toLocaleString()} ETB</span>
              </div>
            ))}
          </div>
          <div style={{ borderTop: '1px solid #ebdcd0', marginTop: '10px', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '15px' }}>
            <span>Total</span>
            <span style={{ color: '#b82032' }}>{currentOrder.total?.toLocaleString()} ETB</span>
          </div>
        </div>

    
      

        {/* Action Buttons */}
        {activeIndex === 4 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: '12px', padding: '14px', textAlign: 'center', color: '#166534' }}>
              <strong style={{ fontSize: '14px', display: 'block', marginBottom: '4px' }}>✓ Meal Completed & Served!</strong>
              <p style={{ margin: 0, fontSize: '12px', color: '#15803d' }}>
                Thank you for dining at Ilillii Hotel. Your receipt is saved in your past orders.
              </p>
            </div>
            <button
              type="button"
              className="button primary"
              style={{ background: '#b82032', borderColor: '#981827', color: '#fff', minHeight: '46px', fontWeight: 700, fontSize: '14px', justifyContent: 'center' }}
              onClick={() => {
                close()
                onViewHistory()
              }}
            >
              View in Past Orders
            </button>
            <button
              type="button"
              className="button secondary"
              style={{ minHeight: '42px', justifyContent: 'center', fontSize: '13px' }}
              onClick={() => {
                localStorage.removeItem('ilillii_active_order_id')
                localStorage.removeItem('ilillii_active_order_time')
                close()
              }}
            >
              Start Fresh Order
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              type="button"
              className="button primary"
              style={{
                background: '#b82032',
                color: '#ffffff',
                minHeight: '46px',
                fontWeight: 700,
                fontSize: '14px',
                justifyContent: 'center',
              }}
              onClick={onAddFood}
            >
              + Add More Food
            </button>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="button secondary"
                style={{ flex: 1, justifyContent: 'center', minHeight: '42px', fontSize: '13px' }}
                onClick={onViewHistory}
              >
                Past Orders History
              </button>
              <a
                href="tel:0938890645"
                className="button secondary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  textDecoration: 'none',
                  minHeight: '42px',
                  padding: '0 14px',
                  fontSize: '13px',
                }}
              >
                Call: 0938890645
              </a>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

function PastOrdersModal({ close }: { close: () => void }) {
  const [orders, setOrders] = useState<SavedPastOrder[]>([])
  const [confirmClear, setConfirmClear] = useState(false)
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
    close()
    window.location.hash = '#menu'
    window.dispatchEvent(new CustomEvent('ilillii-clear-cart'))
  }

  const clearHistory = () => {
    localStorage.removeItem('ilillii_order_history')
    setOrders([])
    setConfirmClear(false)
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
                  <strong style={{ fontSize: '15px', color: 'var(--color-brand)', fontWeight: 800 }}>#{String(ord.orderNumber).replace(/^IL-/, '')}</strong>
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="button primary"
              style={{ flex: 1, justifyContent: 'center', background: '#b82032', color: '#fff', minHeight: '44px', fontWeight: 700 }}
              onClick={startFresh}
            >
              + {t('order.addMoreDishes') || 'Add More Food'}
            </button>
            <a
              href="tel:0938890645"
              className="button secondary"
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', textDecoration: 'none', minHeight: '44px', padding: '0 14px' }}
            >
              <Icon name="phone" size={15} />
              0938890645
            </a>
          </div>
          {orders.length > 0 && (
            confirmClear ? (
              <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '8px', padding: '10px 14px', textAlign: 'center', marginTop: '6px' }}>
                <p style={{ margin: '0 0 8px', fontSize: '12px', color: '#9f1239', fontWeight: 600 }}>
                  {t('history.clearConfirm') || 'Clear all past orders from this device?'}
                </p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    style={{ background: '#e11d48', color: '#fff', border: 'none', padding: '4px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                    onClick={clearHistory}
                  >
                    Yes, Clear
                  </button>
                  <button
                    type="button"
                    style={{ background: '#f5f5f4', border: '1px solid #d6d3d1', padding: '4px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                    onClick={() => setConfirmClear(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className="button secondary"
                style={{ fontSize: '11px', padding: '4px 10px', alignSelf: 'center', background: 'transparent', border: 'none', color: 'var(--color-muted)', cursor: 'pointer', textDecoration: 'underline' }}
                onClick={() => setConfirmClear(true)}
              >
                {t('history.clear')}
              </button>
            )
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
            <a href="tel:0938890645" className="footer-phone">
              <Icon name="phone" size={13} />
              <span>0938890645</span>
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
