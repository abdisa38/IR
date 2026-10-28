import { useLanguage } from './language'
import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { Icon, Logo, Mark, Modal, useDialog } from './shared-ui'
import { SiteLink, sitePage } from './site-routing'
import { QuantityControl, StatePanel } from './ui-patterns'
import { categories, formatBirr, menuItems } from './menu-data'
import type { MenuItem } from './menu-data'
import './menu.css'
import { GlobalFooter } from './LocationComponents'
const FulfilmentFlow = lazy(() => import('./FulfilmentFlow'))
const PaymentExperience = lazy(() => import('./PaymentExperience'))
import { demoTables, tableFromUrl } from './order-prototype'

type Cart = Record<string, number>
function Quantity({ item, quantity, update }: { item: MenuItem; quantity: number; update: (id: string, delta: number) => void }) {
  return <QuantityControl label={item.name} quantity={quantity} onChange={delta => update(item.id, delta)} />
}
function ProductCard({ item, quantity, update, details }: { item: MenuItem; quantity: number; update: (id: string, delta: number) => void; details: () => void }) {
  const unavailable = item.availability === 'unavailable'
  return <article className={`product-card ${quantity ? 'in-cart' : ''} ${unavailable ? 'is-unavailable' : ''}`}>
    <button className={`product-art art-${item.category}`} onClick={details} aria-label={`View details for ${item.name}`}>
      {item.confirmedImage ? <img src={item.confirmedImage} alt={item.name} loading="lazy" /> : <><span className="art-orbit" /><span className="art-symbol"><Icon name={item.category === 'drinks' ? 'coffee' : 'meal'} size={34} /></span><span className="photo-pending">ITEM PHOTO AWAITING VERIFICATION</span></>}
      <span className="details-dot"><Icon name="info" size={17} /></span>
      {quantity > 0 && <span className="selected-label"><Icon name="check" size={12} />In your cart</span>}
    </button>
    <div className="product-body"><span className="product-category">{categories.find(c => c.id === item.category)?.label}</span><button className="product-name" onClick={details}><h3>{item.name}</h3></button><span className={`availability-label ${unavailable ? 'unavailable-label' : ''}`}><Icon name={unavailable ? 'close' : 'info'} size={12} />{unavailable ? 'Unavailable · state preview' : 'Availability to confirm'}</span><div className="product-bottom"><span className="product-price">{formatBirr(item.price)}<small>ETB</small></span>{unavailable ? <button className="add-button" disabled>Unavailable</button> : quantity ? <Quantity item={item} quantity={quantity} update={update} /> : <button className="add-button" onClick={() => update(item.id, 1)} aria-label={`Add ${item.name} to preview cart`}><Icon name="plus" size={16} />Add</button>}</div></div>
  </article>
}

export default function Menu() {
  const [category, setCategory] = useState('all')
  const [query, setQuery] = useState('')
  const [cart, setCart] = useState<Cart>({})
  const [panel, setPanel] = useState(false)
  const [modal, setModal] = useState<'language' | 'states' | null>(null)
  const { language, setLanguage } = useLanguage()
  const [details, setDetails] = useState<MenuItem | null>(null)
  const [notice, setNotice] = useState('')
  const [mode, setMode] = useState('')
  const [qr, setQr] = useState(() => tableFromUrl(window.location.search))
  const [qrOptions, setQrOptions] = useState(false)
  const [checkout, setCheckout] = useState(false)
  const [paymentPreview, setPaymentPreview] = useState(false)
  const [checkoutEntry, setCheckoutEntry] = useState<'method' | 'lookup'>('method')
  const [note, setNote] = useState('')
  const [tableHelp, setTableHelp] = useState(false)
  const [menuState, setMenuState] = useState('ready')
  const cartRef = useRef<HTMLDialogElement>(null)
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const count = Object.values(cart).reduce((sum, quantity) => sum + quantity, 0)
  const selected = menuItems.filter(item => cart[item.id] > 0)
  const subtotal = selected.reduce((sum, item) => sum + item.price * cart[item.id], 0)
  const results = menuItems.filter(item => (category === 'all' || item.category === category) && item.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
  useDialog(cartRef, panel)
  useEffect(() => {
    const leaveMenu = () => {
      if (sitePage() !== 'menu') { setPanel(false); setCheckout(false); setPaymentPreview(false); setModal(null); setDetails(null); setTableHelp(false) }
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
    const item = menuItems.find(item => item.id === id)!
    setNotice(`${item.name} ${delta > 0 ? 'added to' : 'quantity reduced in'} your preview cart`)
    clearTimeout(noticeTimer.current)
    noticeTimer.current = setTimeout(() => setNotice(''), 3000)
  }
  const resetSearch = () => { setQuery(''); setCategory('all') }
  return <div className={`digital-menu ${count ? 'has-cart' : ''}`}>
    <div className="menu-topline"><span>A place to gather. A meal to remember.</span><span><Icon name="pin" size={12} />Bale Robe, Oromia</span></div>
    <header className="menu-header"><div className="menu-container compact-nav"><Logo /><SiteLink className="home-link" href="/#home"><Icon name="arrow" size={15} />Home</SiteLink><SiteLink className="menu-contact-link" href="/contact">Contact</SiteLink><div className="menu-header-actions"><button className="menu-language" onClick={() => setModal('language')} aria-label="Choose Afaan Oromo or Amharic"><Icon name="globe" size={17} /><span>{language === 'am' ? 'አማርኛ' : 'Afaan Oromo'}<small> / {language === 'am' ? 'Afaan Oromo' : 'አማርኛ'}</small></span><Icon name="down" size={13} /></button><button className="cart-trigger" onClick={() => setPanel(true)} aria-label={`Open cart, ${count} items`}><Icon name="bag" size={19} /><span>Your cart</span><strong>{count}</strong></button></div></div></header>
    <main>
      <section className={`menu-container qr-entry ${qr.table || qr.invalid ? 'contextual-entry' : 'regular-entry'}`}>
        {(qr.table || qr.invalid) && <div className="qr-context"><span className="qr-context-icon"><Icon name="meal" size={25} /></span><div><span className="eyebrow">YOUR TABLE. YOUR TIME.</span><h2>{qr.table ? 'Welcome to Ilillii.' : 'Let’s check your table.'}</h2></div>{qr.table && <span className="table-badge"><Icon name="meal" size={16} />Table {qr.table}<small>DEMO</small></span>}</div>}
        <div className="qr-entry-actions">{(qr.table || qr.invalid) && <a href="#food-menu" className="button primary">Explore Menu<Icon name="arrow" size={16} /></a>}{count > 0 && <button className="button secondary" onClick={() => setPanel(true)}>View Cart · {count}</button>}<button className="qr-demo-toggle" onClick={() => { setCheckoutEntry('lookup'); setCheckout(true) }}><Icon name="search" size={16} />Find my order</button><button className="qr-demo-toggle" aria-expanded={qrOptions} onClick={() => setQrOptions(!qrOptions)}>Try table QR preview<Icon name="down" size={14} /></button>{qr.invalid && <button className="qr-demo-toggle" onClick={() => setTableHelp(true)}>Ask staff for assistance</button>}</div>
        {qrOptions && <div className="qr-demo-options"><strong>Demo table context — not verified hotel tables</strong><div>{demoTables.map(table => <button key={table} className={qr.table === table ? 'chosen' : ''} onClick={() => { setQr({ table, invalid: false }); setMode('Dine in') }}>Table {table}</button>)}<button onClick={() => setQr({ table: null, invalid: true })}>Invalid QR</button><button onClick={() => setQr({ table: null, invalid: false })}>Regular menu</button></div></div>}
      </section>
      <section className="menu-welcome menu-container"><div className="menu-welcome-copy"><span className="eyebrow"><span />GOOD FOOD, GREAT COMPANY</span><h1>Explore our <span>menu.</span></h1><span className="currency-note"><span>ETB</span>All prices in Ethiopian birr</span></div><div className="menu-editorial"><img src="/images/ethiopian-sharing-platter.jpg" alt="Illustrative Ethiopian sharing platter, not a confirmed Ilillii menu item" /><div className="editorial-shade" /><span className="editorial-caption">A SHARED TABLE. A SHARED MOMENT.</span><span className="editorial-credit">Illustrative photography</span><div className="editorial-seal"><Mark /></div></div></section>
      <div className="menu-container"><div className="verification-banner"><Icon name="info" size={19} /><span className="draft-tag">DRAFT MENU</span></div></div>
      <section id="food-menu" className="menu-container menu-explorer" aria-label="Food and drinks menu">
        <div className="menu-toolbar"><label className="menu-search"><Icon name="search" size={21} /><input aria-label="Search food or drink name" placeholder="What are you in the mood for?" value={query} onChange={e => setQuery(e.target.value)} />{query && <button aria-label="Clear search" onClick={() => setQuery('')}><Icon name="close" size={18} /></button>}<span className="search-hint">Search food & drinks</span></label><span className="browse-tip"><Icon name="bag" size={16} />Browse first. Choose your way later.</span></div>
        <div className="category-navigation" role="group" aria-label="Filter menu by category"><button className={`menu-category ${category === 'all' ? 'active' : ''}`} aria-pressed={category === 'all'} onClick={() => setCategory('all')}><Icon name="menu" size={17} /><span>All items</span><small>{menuItems.length}</small></button>{categories.map(c => <button key={c.id} className={`menu-category ${category === c.id ? 'active' : ''}`} aria-pressed={category === c.id} onClick={() => setCategory(c.id)}><Icon name={c.icon} size={17} /><span>{c.label}</span><small>{menuItems.filter(item => item.category === c.id).length}</small></button>)}</div>
        <div className="results-heading"><div><h2>{query.trim() ? 'Search results' : category === 'all' ? 'Something for everyone.' : categories.find(c => c.id === category)?.label}</h2><span>{results.length} {results.length === 1 ? 'item' : 'items'}{query.trim() && <> matching “{query}”</>}</span></div><span className="price-reminder">PRICES IN <strong>ETB</strong></span></div>
        {language === 'am' && null}
        {menuState !== 'ready' ? <StatePanel kind={menuState === 'loading' ? 'loading' : 'error'} title={menuState === 'loading' ? 'Getting the menu ready…' : 'We couldn’t load the menu.'} action={<button className="button primary" onClick={() => setMenuState('ready')}>{menuState === 'loading' ? 'Return to menu preview' : 'Try again'}</button>}></StatePanel> : results.length ? (query.trim() || category !== 'all' ? <div className="product-grid">{results.map(item => <ProductCard key={item.id} item={item} quantity={cart[item.id] || 0} update={update} details={() => setDetails(item)} />)}</div> : categories.map(c => <section className="product-section" key={c.id}><div className="product-section-heading"><span className="section-icon"><Icon name={c.icon} size={20} /></span><div><h3>{c.label}</h3></div><span>{menuItems.filter(item => item.category === c.id).length} items</span></div><div className="product-grid">{menuItems.filter(item => item.category === c.id).map(item => <ProductCard key={item.id} item={item} quantity={cart[item.id] || 0} update={update} details={() => setDetails(item)} />)}</div></section>)) : <div className="menu-empty"><span><Icon name="search" size={32} /></span><h3>No matches just yet.</h3><p>Try a shorter name, check the spelling, or browse all food and drinks.</p><button className="button primary" onClick={resetSearch}>Show all items<Icon name="arrow" size={17} /></button></div>}
        <div className="menu-help"><Icon name="heart" size={20} /><div><strong>A little help is always welcome.</strong></div><button onClick={() => setModal('states')}>About this preview<Icon name="info" size={16} /></button></div>
        <details className="prototype-tools menu-state-controls"><summary>Menu & payment prototype states</summary><div>{['ready', 'loading', 'unavailable'].map(state => <button key={state} aria-pressed={menuState === state} onClick={() => setMenuState(state)}>{state === 'ready' ? 'Menu ready' : state === 'loading' ? 'Menu loading' : 'Menu unavailable'}</button>)}<button onClick={() => setPaymentPreview(true)}><Icon name="shield" size={16} />Explore payment prototype</button></div></details>
      </section>
      <section className="menu-service-strip"><div className="menu-container">{[{ name: 'Dine in', icon: 'meal', text: 'Good company, around our table.' }, { name: 'Pickup', icon: 'bag', text: 'A future way to take your meal with you.' }, { name: 'Delivery', icon: 'delivery', text: 'Subject to confirmed service availability.' }].map(item => <div key={item.name}><Icon name={item.icon} size={24} /><span><strong>{item.name}</strong></span></div>)}</div></section>
    </main>
    <GlobalFooter />
    {count > 0 && <div className="bottom-cart"><div><span>{count} {count === 1 ? 'item' : 'items'} · provisional subtotal</span><strong>{formatBirr(subtotal)} <small>ETB</small></strong></div><button onClick={() => setPanel(true)}>View cart<Icon name="arrow" size={19} /></button></div>}
    <div className={`cart-toast ${notice ? 'visible' : ''}`} role="status" aria-live="polite">{notice && <><Icon name="check" size={17} /><span>{notice}</span></>}</div>
    <dialog className="cart-drawer" ref={cartRef} onCancel={() => setPanel(false)} onClick={e => { if (e.target === e.currentTarget) setPanel(false) }}>
      <div className="drawer-heading"><div><span className="eyebrow">A LITTLE GOOD FOOD</span><h2>Your cart <span>{count}</span></h2></div><button className="icon-button" onClick={() => setPanel(false)} aria-label="Close cart"><Icon name="close" /></button></div>
      <div className="cart-table-context"><Icon name="meal" size={19} /><span>{qr.table ? `Table ${qr.table} · dine-in demo` : 'No verified table identified'}</span></div>
      {count > 0 && <label className="order-field cart-note-field">Order note <span>Optional</span><textarea value={note} maxLength={500} onChange={e => setNote(e.target.value)} rows={2} placeholder="Anything the team should know?" /></label>}
      {count ? <><p className="cart-draft-note"><Icon name="info" size={17} />Preview only. Prices and availability need confirmation.</p><div className="cart-lines">{selected.map(item => <div className="cart-line" key={item.id}><span className={`cart-item-symbol art-${item.category}`}><Icon name={item.category === 'drinks' ? 'coffee' : 'meal'} size={22} /></span><div className="cart-line-content"><h3>{item.name}</h3><p>{formatBirr(item.price)} ETB each</p><Quantity item={item} quantity={cart[item.id]} update={update} /></div><strong>{formatBirr(item.price * cart[item.id])}<small>ETB</small></strong></div>)}</div><div className="cart-mode"><span className="eyebrow">YOUR WAY · OPTIONAL PREVIEW</span><div>{['Dine in', 'Pickup', 'Delivery'].map(value => <button className={mode === value ? 'chosen' : ''} aria-pressed={mode === value} onClick={() => setMode(mode === value ? '' : value)} key={value}>{value}</button>)}</div></div><div className="cart-summary"><div><span>Subtotal</span><strong>{formatBirr(subtotal)} ETB</strong></div><button className="button primary" onClick={() => { setPanel(false); setCheckoutEntry('method'); setCheckout(true) }}>Continue to Checkout<Icon name="arrow" size={18} /></button><button className="continue-button" onClick={() => setPanel(false)}>Continue browsing</button></div></> : <div className="empty-cart"><span><Icon name="bag" size={42} /></span><h3>A good meal starts here.</h3><p>Your cart is empty. Browse the menu and tap “Add” to try building your meal.</p><button className="button primary" onClick={() => setPanel(false)}>Explore the menu<Icon name="arrow" size={17} /></button><small>Preview only — no order will be placed.</small></div>}
    </dialog>
    <Suspense fallback={checkout ? <p role="status">Loading checkout preview…</p> : null}><FulfilmentFlow open={checkout} entry={checkoutEntry} table={qr.table} lines={selected.map(item => ({ item, quantity: cart[item.id] }))} note={note} setNote={setNote} close={() => setCheckout(false)} language={language} setLanguage={setLanguage} /></Suspense>
    <Suspense fallback={null}><PaymentExperience open={paymentPreview} close={() => setPaymentPreview(false)} mode={qr.table ? 'dine' : mode === 'Delivery' ? 'delivery' : 'pickup'} lines={selected.length ? selected.map(item => ({ item, quantity: cart[item.id] })) : [{ item: menuItems[0], quantity: 1 }]} language={language} setLanguage={setLanguage} /></Suspense>
    {tableHelp && <Modal title="Let’s check your table." close={() => setTableHelp(false)}><p className="modal-description">Ask staff to confirm your table and provide its correct QR code. You can keep browsing; your cart is unchanged. This prototype cannot notify staff or validate real hotel tables. Dine-in requires a table reference. Pickup and delivery demonstrations are available from checkout without a table.</p><button className="button secondary" onClick={() => { setTableHelp(false); setQrOptions(true) }}>Open demo table options</button></Modal>}
    {modal && <Modal title={modal === 'language' ? 'Feel at home.' : 'A considered menu preview'} close={() => setModal(null)}>
      {modal === 'language' ? <><div className="language-options">{[{ id: 'om', name: 'Afaan Oromo' }, { id: 'am', name: 'አማርኛ — Amharic' }].map(item => <button key={item.id} className={`language-option ${language === item.id ? 'selected' : ''}`} onClick={() => setLanguage(item.id)}><span>{item.name}<small>Copy awaiting local review</small></span><Icon name={language === item.id ? 'check' : 'globe'} /></button>)}</div></> : <><p className="modal-description">Product photos are reserved until their matches are confirmed. URL table numbers are not treated as valid without a verified table registry. There is no database, real order submission or payment integration.</p><h3 className="state-preview-title">Unavailable component state</h3><ProductCard item={{ id: 'state-preview', name: 'Item name · component preview', price: 0, category: 'main', availability: 'unavailable' }} quantity={0} update={() => {}} details={() => {}} /></>}
    </Modal>}
    {details && <Modal title={details.name} close={() => setDetails(null)}><div className="item-details-price">{formatBirr(details.price)} <span>ETB · provisional price</span></div><p className="detail-warning"><Icon name="info" size={17} />Please ask the hotel about ingredients and allergens.</p>{cart[details.id] ? <Quantity item={details} quantity={cart[details.id]} update={update} /> : <button className="button primary" onClick={() => update(details.id, 1)}><Icon name="plus" size={17} />Add to preview cart</button>}</Modal>}
  </div>
}
