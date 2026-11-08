import { useLanguage, languageOptions } from './language'
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { Icon, Logo, Mark, Modal, useDialog } from './shared-ui'
import { SiteLink, sitePage } from './site-routing'
import { QuantityControl, StatePanel } from './ui-patterns'
import { categories, formatBirr, menuItems } from './menu-data'
import type { MenuItem } from './menu-data'
import { api, getImageUrl } from './api/client'
import './menu.css'
import { GlobalFooter, GlobalHeader } from './LocationComponents'
const FulfilmentFlow = lazy(() => import('./FulfilmentFlow'))
const OrderFlow = lazy(() => import('./OrderFlow'))
import { demoTables, tableFromUrl } from './order-prototype'

type Cart = Record<string, number>
function Quantity({ item, quantity, update }: { item: MenuItem; quantity: number; update: (id: string, delta: number) => void }) {
  return <QuantityControl label={item.name} quantity={quantity} onChange={delta => update(item.id, delta)} />
}
function ProductCard({ item, quantity, update, details }: { item: MenuItem; quantity: number; update: (id: string, delta: number) => void; details: () => void; language?: string }) {
  const { language, t } = useLanguage()
  const unavailable = item.availability === 'unavailable'
  const primaryName = language === 'am' && item.translations?.am
    ? item.translations.am
    : (language === 'om' && item.translations?.om ? item.translations.om : item.name)
  const secondaryName = language === 'am' && item.translations?.am !== item.name
    ? item.name
    : (language !== 'am' && item.translations?.am ? item.translations.am : '')

  const fallbackImage = item.category === 'drinks' ? '/images/menu/jaanboo.jpg' : '/images/ethiopian-sharing-platter.jpg'
  const imageUrl = item.confirmedImage ? getImageUrl(item.confirmedImage) : ((item as any).image ? getImageUrl((item as any).image) : '')

  return (
    <article className={`product-card ${quantity ? 'in-cart' : ''} ${unavailable ? 'is-unavailable' : ''}`}>
      <button className={`product-art art-${item.category}`} onClick={details} aria-label={`View details for ${primaryName}`}>
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={primaryName}
            loading="lazy"
            onError={(e) => {
              const target = e.currentTarget
              if (target.src !== fallbackImage) {
                target.src = fallbackImage
              }
            }}
          />
        ) : (
          <>
            <span className="art-orbit" />
            <span className="art-symbol"><Icon name={item.category === 'drinks' ? 'coffee' : 'meal'} size={34} /></span>
            <span className="photo-pending">{t('menu.photoPending')}</span>
          </>
        )}
        {item.houseSpecial && (
          <span className="house-special-pill">{t('menu.houseSpecial')}</span>
        )}
        {quantity > 0 && <span className="selected-label"><Icon name="check" size={12} />{t('menu.inCart')}</span>}
      </button>
      <div className="product-body">
        <button className="product-name" onClick={details} title={primaryName}>
          <h3>{primaryName}</h3>
          {secondaryName && <p style={{ fontSize: '11px', color: 'var(--color-muted)', margin: '2px 0 0' }}>{secondaryName}</p>}
        </button>
        {item.verifiedDescription && (
          <p className="product-card-desc">{item.verifiedDescription}</p>
        )}
        <div className="product-bottom">
          <span className="product-price">
            <small>ETB</small> {formatBirr(item.price)}
          </span>
          {unavailable ? (
            <button className="add-button" disabled>{t('menu.unavailable')}</button>
          ) : quantity ? (
            <Quantity item={item} quantity={quantity} update={update} />
          ) : (
            <button className="add-button" onClick={() => update(item.id, 1)} aria-label={`Add ${primaryName} to cart`}>
              <Icon name="plus" size={15} />{t('menu.addBtn')}
            </button>
          )}
        </div>
      </div>
    </article>
  )
}

export default function Menu() {
  const [items, setItems] = useState<MenuItem[]>(menuItems)
  const [category, setCategory] = useState('all')
  const [query, setQuery] = useState('')
  const [cart, setCart] = useState<Cart>({})
  const [panel, setPanel] = useState(false)
  const [modal, setModal] = useState<'language' | 'states' | null>(null)
  const { language, setLanguage, t } = useLanguage()
  const [details, setDetails] = useState<MenuItem | null>(null)
  const [notice, setNotice] = useState('')
  const [mode, setMode] = useState('Dine in')
  const [qr, setQr] = useState(() => tableFromUrl(window.location.search))
  const [qrOptions, setQrOptions] = useState(false)
  const [checkout, setCheckout] = useState(false)
  const [dineInCheckout, setDineInCheckout] = useState(false)
  const [initialPayment, setInitialPayment] = useState<'pay_after' | 'sheger'>('pay_after')
  const [checkoutEntry, setCheckoutEntry] = useState<'details'>('details')
  const [note, setNote] = useState('')
  const [tableHelp, setTableHelp] = useState(false)
  const [menuState, setMenuState] = useState('ready')
  const cartRef = useRef<HTMLDialogElement>(null)
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // Fetch real menu items from MongoDB backend
  const loadLiveMenu = useCallback(() => {
    api.getMenu().then(res => {
      if (res.success && res.items?.length) {
        const live: MenuItem[] = res.items.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          category: (item.category === 'beer-wine' || item.category === 'spirits' || item.category === 'cold-drinks' || item.category === 'hot-drinks')
            ? 'drinks'
            : (item.categoryLabel?.toLowerCase().includes('additional') || item.id.startsWith('additional-') ? 'additional' : 'main'),
          availability: item.available ? 'available' : 'unavailable',
          confirmedImage: getImageUrl(item.image),
          verifiedDescription: item.description,
          translations: {
            am: item.amharicName || item.translations?.am || '',
            om: item.translations?.or || item.name,
          },
          houseSpecial: Boolean(item.houseSpecial),
        }))
        setItems(live)
      }
    }).catch(err => {
      console.warn('Backend menu fetch notice; using fallback:', err.message)
    })
  }, [])

  useEffect(() => {
    loadLiveMenu()
    const handleUpdate = () => loadLiveMenu()
    window.addEventListener('ilillii-menu-updated', handleUpdate)
    const handleHash = () => {
      if (window.location.hash.startsWith('#menu') || window.location.hash === '') {
        loadLiveMenu()
      }
    }
    window.addEventListener('hashchange', handleHash)
    return () => {
      window.removeEventListener('ilillii-menu-updated', handleUpdate)
      window.removeEventListener('hashchange', handleHash)
    }
  }, [loadLiveMenu])

  const count = Object.values(cart).reduce((sum, quantity) => sum + quantity, 0)
  const selected = items.filter(item => cart[item.id] > 0)
  const subtotal = selected.reduce((sum, item) => sum + item.price * cart[item.id], 0)
  const results = items.filter(item => (category === 'all' || item.category === category) && item.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
  useDialog(cartRef, panel)
  useEffect(() => {
    const handleClear = () => setCart({})
    window.addEventListener('ilillii-clear-cart', handleClear)
    return () => window.removeEventListener('ilillii-clear-cart', handleClear)
  }, [])

  useEffect(() => {
    const checkTableUrl = () => {
      const parsed = tableFromUrl(window.location.search)
      const urlStr = window.location.href
      const isQr = urlStr.includes('source=qr') || window.location.search.includes('source=qr')

      if (parsed.table) {
        setQr({ table: parsed.table, invalid: false })
        setMode('Dine in')
        localStorage.setItem('ilillii_table', parsed.table)
        sessionStorage.setItem('ilillii_table', parsed.table)
        if (isQr) {
          localStorage.setItem('ilillii_table_source', 'qr')
          sessionStorage.setItem('ilillii_table_source', 'qr')
        } else {
          localStorage.setItem('ilillii_table_source', 'manual')
          sessionStorage.setItem('ilillii_table_source', 'manual')
        }
      } else {
        // Direct website visit without table in URL (e.g. from Google or home)
        setQr({ table: null, invalid: false })
        localStorage.removeItem('ilillii_table')
        sessionStorage.removeItem('ilillii_table')
        localStorage.removeItem('ilillii_table_source')
        sessionStorage.removeItem('ilillii_table_source')
      }
    }
    checkTableUrl()
    window.addEventListener('popstate', checkTableUrl)
    window.addEventListener('hashchange', checkTableUrl)
    return () => {
      window.removeEventListener('popstate', checkTableUrl)
      window.removeEventListener('hashchange', checkTableUrl)
    }
  }, [])

  useEffect(() => {
    const leaveMenu = () => {
      if (sitePage() !== 'menu') { setPanel(false); setCheckout(false); setDineInCheckout(false); setModal(null); setDetails(null); setTableHelp(false) }
      else if (window.location.search.includes('demoTable=') || window.location.search.includes('table=')) setQr(tableFromUrl(window.location.search))
    }
    window.addEventListener('popstate', leaveMenu)
    window.addEventListener('hashchange', leaveMenu)
    return () => { window.removeEventListener('popstate', leaveMenu); window.removeEventListener('hashchange', leaveMenu) }
  }, [])
  useEffect(() => () => clearTimeout(noticeTimer.current), [])
  useEffect(() => {
    const chooseDemoTable = (event: Event) => {
      const id = (event as CustomEvent<string>).detail
      if (demoTables.includes(id as typeof demoTables[number])) { setQr({ table: id, invalid: false }); setMode('Dine in') }
    }
    window.addEventListener('ilillii-demo-table', chooseDemoTable)
    return () => window.removeEventListener('ilillii-demo-table', chooseDemoTable)
  }, [])
  const update = (id: string, delta: number) => {
    setCart(current => {
      const next = { ...current }
      const quantity = Math.max(0, (current[id] || 0) + delta)
      if (quantity) next[id] = quantity
      else delete next[id]
      return next
    })
    const item = items.find(item => item.id === id) || menuItems.find(item => item.id === id)!
    setNotice(`${item.name} ${delta > 0 ? 'added to' : 'quantity reduced in'} your cart`)
    clearTimeout(noticeTimer.current)
    noticeTimer.current = setTimeout(() => setNotice(''), 3000)
  }
  const resetSearch = () => { setQuery(''); setCategory('all') }
  return <div className={`digital-menu ${count ? 'has-cart' : ''}`}>
    <GlobalHeader active="menu" cartCount={count} onOpenCart={() => setPanel(true)} />
    <main>
      <section className={`menu-container qr-entry ${qr.table || qr.invalid ? 'contextual-entry' : 'regular-entry'}`}>
        {(qr.table || qr.invalid) && (
          <div className="qr-context">
            <div className="qr-context-top-bar">
              <span className="qr-context-icon"><Icon name="meal" size={22} /></span>
              {qr.table && (
                <span className="table-badge qr-verified-pill" style={localStorage.getItem('ilillii_table_source') === 'qr' ? { background: '#dcfce7', color: '#15803d', borderColor: '#bbf7d0', fontWeight: 700 } : {}}>
                  <Icon name="meal" size={15} />{localStorage.getItem('ilillii_table_source') === 'qr' ? t('qr.scannedBadge', undefined, { table: qr.table }) : t('qr.manualBadge', undefined, { table: qr.table })}
                </span>
              )}
            </div>
            <div className="qr-context-details">
              <span className="eyebrow">{localStorage.getItem('ilillii_table_source') === 'qr' ? t('qr.scannedBannerEyebrow') : t('menu.yourTableYourTime')}</span>
              <h2>{qr.table ? (localStorage.getItem('ilillii_table_source') === 'qr' ? t('qr.scannedBannerTitle', undefined, { table: qr.table }) : t('menu.welcomeToIlillii')) : t('menu.checkTable')}</h2>
            </div>
          </div>
        )}
        <div className="qr-entry-actions">
          {(qr.table || qr.invalid) && <a href="#food-menu" className="button primary">{t('qr.exploreMenu')}<Icon name="arrow" size={16} /></a>}
          {count > 0 && <button className="button secondary" onClick={() => setPanel(true)}>{t('menu.viewCartWithCount', undefined, { count })}</button>}
          <button className="qr-demo-toggle" aria-expanded={qrOptions} onClick={() => setQrOptions(!qrOptions)}>{t('qr.selectTable')}<Icon name="down" size={14} /></button>
          {qr.invalid && <button className="qr-demo-toggle" onClick={() => setTableHelp(true)}>{t('order.requestHelp')}</button>}
        </div>
        {qrOptions && (
          <div className="qr-demo-options">
            <strong>{t('qr.selectTable')}</strong>
            <div>
              {demoTables.map(table => (
                <button key={table} className={qr.table === table ? 'chosen' : ''} onClick={() => { setQr({ table, invalid: false }); setMode('Dine in') }}>
                  {t('checkout.table')} {table}
                </button>
              ))}
              <button onClick={() => setQr({ table: null, invalid: true })}>Invalid QR</button>
              <button onClick={() => setQr({ table: null, invalid: false })}>{t('menu.all')}</button>
            </div>
          </div>
        )}
      </section>

      <section className="menu-welcome menu-container">
        <div className="menu-welcome-copy">
          <span className="eyebrow"><span />{t('menu.welcomeEyebrow')}</span>
          <h1>{t('menu.exploreTitle')} <span>{t('menu.exploreSpan')}</span></h1>
          <span className="currency-note"><span>ETB</span>{t('menu.currencyNote')}</span>
        </div>
        <div className="menu-editorial">
          <img src="/images/ethiopian-sharing-platter.jpg" alt="Ethiopian sharing platter" />
          <div className="editorial-shade" />
          <span className="editorial-caption">{t('hero.photoCaption')}</span>
          <div className="editorial-seal"><Mark /></div>
        </div>
      </section>

      <section id="food-menu" className="menu-container menu-explorer" aria-label="Food and drinks menu">
        <div className="menu-toolbar">
          <label className="menu-search">
            <Icon name="search" size={21} />
            <input aria-label="Search food or drink name" placeholder={t('menu.searchPlaceholder')} value={query} onChange={e => setQuery(e.target.value)} />
            {query && <button aria-label="Clear search" onClick={() => setQuery('')}><Icon name="close" size={18} /></button>}
            <span className="search-hint">{t('menu.searchHint')}</span>
          </label>
          <span className="browse-tip"><Icon name="bag" size={16} />{t('menu.browseFirst')}</span>
        </div>

        <div className="category-navigation" role="group" aria-label="Filter menu by category">
          <button className={`menu-category ${category === 'all' ? 'active' : ''}`} aria-pressed={category === 'all'} onClick={() => setCategory('all')}>
            <Icon name="menu" size={17} />
            <span>{t('menu.all')}</span>
            <small>{items.length}</small>
          </button>
          {categories.map(c => (
            <button key={c.id} className={`menu-category ${category === c.id ? 'active' : ''}`} aria-pressed={category === c.id} onClick={() => setCategory(c.id)}>
              <Icon name={c.icon} size={17} />
              <span>{c.id === 'main' ? t('menu.main') : c.id === 'additional' ? t('menu.additional') : t('menu.drinks')}</span>
              <small>{items.filter(item => item.category === c.id).length}</small>
            </button>
          ))}
        </div>

        <div className="results-heading">
          <div>
            <h2>{query.trim() ? t('menu.resultsFor') : category === 'all' ? t('menu.somethingForEveryone') : (category === 'main' ? t('menu.main') : category === 'additional' ? t('menu.additional') : t('menu.drinks'))}</h2>
            <span>{results.length} {results.length === 1 ? t('common.item') : t('common.items')}{query.trim() && <> {t('menu.matching', undefined, { query })}</>}</span>
          </div>
          <span className="price-reminder">{t('menu.pricesIn')}</span>
        </div>

        {menuState !== 'ready' ? (
          <StatePanel
            kind={menuState === 'loading' ? 'loading' : 'error'}
            title={menuState === 'loading' ? t('common.loading') : t('menu.noMatches')}
            action={<button className="button primary" onClick={() => setMenuState('ready')}>{menuState === 'loading' ? t('common.back') : t('menu.showAll')}</button>}
          />
        ) : results.length ? (
          query.trim() || category !== 'all' ? (
            <div className="product-grid">
              {results.map(item => (
                <ProductCard key={item.id} item={item} quantity={cart[item.id] || 0} update={update} details={() => setDetails(item)} language={language} />
              ))}
            </div>
          ) : (
            categories.map(c => (
              <section className="product-section" key={c.id}>
                <div className="product-section-heading">
                  <span className="section-icon"><Icon name={c.icon} size={20} /></span>
                  <div><h3>{c.id === 'main' ? t('menu.main') : c.id === 'additional' ? t('menu.additional') : t('menu.drinks')}</h3></div>
                  <span>{items.filter(item => item.category === c.id).length} {t('common.items')}</span>
                </div>
                <div className="product-grid">
                  {items.filter(item => item.category === c.id).map(item => (
                    <ProductCard key={item.id} item={item} quantity={cart[item.id] || 0} update={update} details={() => setDetails(item)} language={language} />
                  ))}
                </div>
              </section>
            ))
          )
        ) : (
          <div className="menu-empty">
            <span><Icon name="search" size={32} /></span>
            <h3>{t('menu.noMatches')}</h3>
            <p>{t('menu.noMatchesDesc')}</p>
            <button className="button primary" onClick={resetSearch}>{t('menu.showAll')}<Icon name="arrow" size={17} /></button>
          </div>
        )}

        <div className="menu-help">
          <Icon name="heart" size={20} />
          <div><strong>{t('menu.questions')}</strong></div>
          <SiteLink href="/contact" className="button secondary">{t('menu.contactHotel')}<Icon name="arrow" size={16} /></SiteLink>
        </div>
      </section>

      <section className="menu-service-strip">
        <div className="menu-container">
          {[
            { name: t('ways.dineIn'), icon: 'meal', text: t('ways.dineInDesc') },
            { name: t('ways.pickup'), icon: 'bag', text: t('ways.pickupDesc') }
          ].map(item => (
            <div key={item.name}>
              <Icon name={item.icon} size={24} />
              <span><strong>{item.name}</strong></span>
            </div>
          ))}
        </div>
      </section>
    </main>

    <GlobalFooter />

    {count > 0 && (
      <div className="bottom-cart">
        <div>
          <span>{count} {count === 1 ? t('common.item') : t('common.items')} · {t('common.subtotal')}</span>
          <strong>{formatBirr(subtotal)} <small>ETB</small></strong>
        </div>
        <button
          type="button"
          onClick={() => setPanel(true)}
          style={{
            background: '#ffffff',
            color: '#7D1825',
            fontWeight: 800,
            fontSize: '14px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '12px',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
            flexShrink: 0,
          }}
        >
          <span style={{ color: '#7D1825', fontWeight: 800 }}>{t('nav.yourCart') || 'View Cart'}</span>
          <Icon name="arrow" size={19} />
        </button>
      </div>
    )}

    <div className={`cart-toast ${notice ? 'visible' : ''}`} role="status" aria-live="polite">
      {notice && <><Icon name="check" size={17} /><span>{notice}</span></>}
    </div>

    <dialog className="cart-drawer" ref={cartRef} onCancel={() => setPanel(false)} onClick={e => { if (e.target === e.currentTarget) setPanel(false) }}>
      <div className="drawer-heading">
        <div>
          <span className="eyebrow">{t('featured.eyebrow')}</span>
          <h2>{t('cart.title')} <span>{count}</span></h2>
        </div>
        <button className="icon-button" onClick={() => setPanel(false)} aria-label="Close cart"><Icon name="close" /></button>
      </div>

      {qr.table && (
        <div className="cart-table-context">
          <Icon name="meal" size={19} />
          <span>{t('checkout.table')} {qr.table} · {t('cart.dineIn')} {localStorage.getItem('ilillii_table_source') === 'qr' ? '(QR Verified)' : ''}</span>
        </div>
      )}

      {count ? (
        <>
          <div className="cart-lines">
            {selected.map(item => {
              const displayName = language === 'am' && item.translations?.am
                ? item.translations.am
                : (language === 'om' && item.translations?.om ? item.translations.om : item.name)
              return (
                <div className="cart-line" key={item.id}>
                  <span className={`cart-item-symbol art-${item.category}`}>
                    {item.confirmedImage ? (
                      <img src={getImageUrl(item.confirmedImage)} alt={displayName} onError={(e) => { const target = e.currentTarget; target.onerror = null; target.src = '/images/ethiopian-sharing-platter.jpg' }} />
                    ) : (
                      <Icon name={item.category === 'drinks' ? 'coffee' : 'meal'} size={22} />
                    )}
                  </span>
                  <div className="cart-line-content">
                    <h3>{displayName}</h3>
                    {cart[item.id] > 1 && <p>{formatBirr(item.price)} ETB {t('cart.each')}</p>}
                    <Quantity item={item} quantity={cart[item.id]} update={update} />
                  </div>
                  <strong>{formatBirr(item.price * cart[item.id])}<small>ETB</small></strong>
                </div>
              )
            })}
          </div>

          <div className="cart-mode">
            <span className="eyebrow">{t('cart.orderService')}</span>
            <div>
              <button
                type="button"
                className={mode === 'Dine in' ? 'chosen' : ''}
                aria-pressed={mode === 'Dine in'}
                onClick={() => setMode('Dine in')}
              >
                <Icon name="meal" size={17} />
                <span>{qr.table ? `${t('checkout.table')} ${qr.table}` : t('cart.dineIn')}</span>
              </button>
              <button
                type="button"
                className={mode === 'Pickup' ? 'chosen' : ''}
                aria-pressed={mode === 'Pickup'}
                onClick={() => setMode('Pickup')}
              >
                <Icon name="bag" size={17} />
                <span>{t('cart.pickup')}</span>
              </button>
            </div>
            {qr.table && mode === 'Dine in' && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '6px 10px', marginTop: '8px' }}>
                <span style={{ fontSize: '11px', color: '#15803d', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Icon name="check" size={12} />
                  {localStorage.getItem('ilillii_table_source') === 'qr' ? `${t('checkout.table')} ${qr.table} · Scanned QR` : `${t('checkout.table')} ${qr.table}`}
                </span>
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', color: '#15803d', fontSize: '11px', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}
                  onClick={() => setQrOptions(true)}
                >
                  {t('common.edit')}
                </button>
              </div>
            )}
          </div>

          <label className="order-field cart-note-field">
            {t('cart.orderNote')} <span>{t('cart.optional')}</span>
            <textarea value={note} maxLength={500} onChange={e => setNote(e.target.value)} rows={2} placeholder={t('cart.notePlaceholder')} />
          </label>

          <div className="cart-summary">
            <div>
              <span>{t('common.total')}</span>
              <strong>{formatBirr(subtotal)} ETB</strong>
            </div>
            {mode === 'Dine in' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', marginTop: '6px' }}>
                <button
                  className="button primary cart-checkout-btn"
                  style={{
                    background: '#b82032',
                    borderColor: '#981827',
                    color: '#ffffff',
                    minHeight: '46px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                  onClick={() => {
                    setPanel(false)
                    setInitialPayment('pay_after')
                    setDineInCheckout(true)
                  }}
                >
                  <Icon name="meal" size={16} />
                  {t('checkout.orderPayAfterMeal')}
                </button>
                <button
                  className="button secondary cart-checkout-btn"
                  style={{
                    background: '#ffffff',
                    border: '1.5px solid #d6d3d1',
                    color: '#1c1917',
                    minHeight: '44px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                  onClick={() => {
                    setPanel(false)
                    setInitialPayment('chapa')
                    setDineInCheckout(true)
                  }}
                >
                  <Icon name="bank" size={16} />
                  {t('checkout.payNowSheger')}
                </button>
              </div>
            ) : (
              <button
                className="button primary cart-checkout-btn"
                onClick={() => {
                  setPanel(false)
                  setCheckoutEntry('details')
                  setCheckout(true)
                }}
              >
                {t('cart.continueToOrder')}
                <Icon name="arrow" size={18} />
              </button>
            )}
            <button className="continue-button" onClick={() => setPanel(false)}>
              {t('cart.continueBrowsing')}
            </button>
          </div>
        </>
      ) : (
        <div className="empty-cart">
          <span><Icon name="bag" size={42} /></span>
          <h3>{t('cart.emptyTitle')}</h3>
          <p>{t('cart.emptyDesc')}</p>
          <button className="button primary" onClick={() => setPanel(false)}>
            {t('cart.exploreMenu')}<Icon name="arrow" size={17} />
          </button>
        </div>
      )}
    </dialog>
    <Suspense fallback={checkout ? <p role="status">{t('common.loading')}</p> : null}><FulfilmentFlow open={checkout} entry={checkoutEntry} table={qr.table} lines={selected.map(item => ({ item, quantity: cart[item.id] }))} note={note} setNote={setNote} close={() => setCheckout(false)} language={language} setLanguage={setLanguage as any} /></Suspense>
    <Suspense fallback={dineInCheckout ? <p role="status">{t('common.loading')}</p> : null}><OrderFlow open={dineInCheckout} table={qr.table} initialPayment={initialPayment} lines={selected.map(item => ({ item, quantity: cart[item.id] }))} note={note} setNote={setNote} close={() => setDineInCheckout(false)} language={language} setLanguage={setLanguage as any} /></Suspense>
    {tableHelp && <Modal title={t('menu.checkTable')} close={() => setTableHelp(false)}><p className="modal-description">{t('history.desc')}</p><button className="button secondary" onClick={() => { setTableHelp(false); setQrOptions(true) }}>{t('qr.selectTable')}</button></Modal>}
    {modal && <Modal title={modal === 'language' ? 'Feel at home.' : 'A considered menu preview'} close={() => setModal(null)}>
      {modal === 'language' ? (
        <div className="language-options">
          {languageOptions.map(option => (
            <button
              key={option.id}
              className={`language-option ${language === option.id ? 'selected' : ''}`}
              onClick={() => {
                setLanguage(option.id)
                setModal(null)
              }}
            >
              <span>{option.native} — {option.label}</span>
              <Icon name={language === option.id ? 'check' : 'globe'} />
            </button>
          ))}
        </div>
      ) : <><p className="modal-description">Product photos are reserved until their matches are confirmed.</p><h3 className="state-preview-title">{t('menu.unavailable')}</h3></>}
    </Modal>}
    {details && <Modal title={language === 'am' && details.translations?.am ? details.translations.am : (language === 'om' && details.translations?.om ? details.translations.om : details.name)} close={() => setDetails(null)}>
      {details.confirmedImage && <div className="modal-item-photo"><img src={getImageUrl(details.confirmedImage)} alt={details.name} onError={(e) => { const target = e.currentTarget; target.onerror = null; target.src = details.category === 'drinks' ? '/images/menu/jaanboo.jpg' : '/images/ethiopian-sharing-platter.jpg' }} /></div>}
      {details.translations?.am && <div className="modal-item-translation">{details.name} {details.translations.am !== details.name && <>· <span lang="am">{details.translations.am}</span></>}</div>}
      <div className="item-details-price">{formatBirr(details.price)} <span>ETB</span></div>
      {details.verifiedDescription && <p className="modal-item-desc">{details.verifiedDescription}</p>}
      <p className="detail-warning"><Icon name="info" size={17} />{t('menu.askIngredients')}</p>
      {cart[details.id] ? <Quantity item={details} quantity={cart[details.id]} update={update} /> : <button className="button primary" onClick={() => update(details.id, 1)}><Icon name="plus" size={17} />{t('menu.addBtn')}</button>}
    </Modal>}
  </div>
}
