import { useEffect, useRef, useState } from 'react'
import { Icon, Logo, Modal, useDialog } from './shared-ui'
import OrderFlow from './OrderFlow'
import type { MenuItem } from './menu-data'
import { formatBirr } from './menu-data'
import { fulfilmentStages, validateAddress, validateOffsite } from './fulfilment-model'
import type { Fulfilment, GuestAddress } from './fulfilment-model'
import './fulfilment.css'
import PaymentExperience from './PaymentExperience'
import CoverageChecker from './CoverageChecker'
import { CompactCheckoutAmount, StatusBadge } from './ui-patterns'
import { AuthCard } from './Auth'

type Line = { item: MenuItem; quantity: number }
type Receipt = { reference: string; accessCode: string; mode: Fulfilment; lines: Line[]; subtotal: number; created: string; provider: string }
type Page = 'method' | 'details' | 'address' | 'payment' | 'review' | 'confirmation' | 'tracking' | 'lookup'
export default function FulfilmentFlow({ open, entry, table, lines, note, setNote, close, language, setLanguage }: {
  open: boolean; entry: 'method' | 'lookup'; table: string | null; lines: Line[]; note: string; setNote: (value: string) => void; close: () => void; language: string; setLanguage: (value: string) => void
}) {
  const [page, setPage] = useState<Page>('method')
  const [mode, setMode] = useState<Fulfilment>('pickup')
  const [dineIn, setDineIn] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState<GuestAddress>({ area: '', landmark: '', directions: '' })
  const [coverage, setCoverage] = useState('awaiting')
  const [provider, setProvider] = useState('Telebirr checkout')
  const [paymentStatus, setPaymentStatus] = useState('pending')
  const [receipt, setReceipt] = useState<Receipt | null>(null)
  const [stage, setStage] = useState(0)
  const [error, setError] = useState('')
  const [scenario, setScenario] = useState('normal')
  const [busy, setBusy] = useState(false)
  const [paymentPreview, setPaymentPreview] = useState(false)
  const [modal, setModal] = useState<'help' | 'language' | 'cancel' | null>(null)
  const [lookupRef, setLookupRef] = useState('')
  const [code, setCode] = useState('')
  const [lookupState, setLookupState] = useState('initial')
  const [lastUpdated, setLastUpdated] = useState('No live updates connected.')
  const [cancellation, setCancellation] = useState(false)
  const dialog = useRef<HTMLDialogElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const lock = useRef(false)
  const previousOpen = useRef(false)
  useEffect(() => {
    if (open && !previousOpen.current) { setPage(entry === 'lookup' ? 'lookup' : receipt ? 'tracking' : 'method'); setError(''); setDineIn(false) }
    previousOpen.current = open
  }, [open, entry, receipt])
  useDialog(dialog, open && !dineIn)
  useEffect(() => { if (open && !dineIn) { heading.current?.focus(); dialog.current?.scrollTo(0, 0) } }, [open, dineIn, page])
  useEffect(() => { if (error && open) dialog.current?.querySelector('[role="alert"]')?.scrollIntoView({ block: 'center' }) }, [error, open])
  useEffect(() => () => clearTimeout(timer.current), [])
  useEffect(() => { if (!open) { setModal(null); setPaymentPreview(false) } }, [open])
  const subtotal = lines.reduce((sum, line) => sum + line.item.price * line.quantity, 0)
  const isReceipt = page === 'confirmation' || page === 'tracking'
  const activeMode = isReceipt && receipt ? receipt.mode : mode
  const total = isReceipt && receipt ? receipt.subtotal : subtotal
  const shownLines = isReceipt && receipt ? receipt.lines : lines
  const go = (next: Page) => { setError(''); setPage(next) }
  const stages = fulfilmentStages(activeMode)
  const submit = () => {
    if (lock.current || receipt) return
    const invalid = validateOffsite(name, phone) || (mode === 'delivery' ? validateAddress(address) : '')
    if (invalid || !lines.length || mode === 'delivery' && coverage !== 'available') { setError(invalid || 'Check your cart and delivery availability before continuing.'); return }
    lock.current = true; setBusy(true); setError('')
    timer.current = setTimeout(() => {
      lock.current = false; setBusy(false)
      if (scenario !== 'normal') { setError(scenario === 'network' ? 'Connection interrupted · demo. No order was sent. Your cart and details are kept in this session.' : scenario === 'unavailable' ? 'An item needs checking · demo. No order was accepted. Edit your cart or ask staff.' : 'Submission failed · demo. Your order was not sent and nothing has been charged. Try again.'); return }
      setReceipt({ reference: `DEMO-ILL-${crypto.randomUUID().slice(0, 8).toUpperCase()}`, accessCode: crypto.randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase(), mode, lines: lines.map(line => ({ ...line })), subtotal, provider, created: new Date().toISOString() })
      setPaymentStatus('pending'); setStage(0); setPage('confirmation')
    }, 850)
  }
  const lookup = () => {
    if (!lookupRef.trim()) { setLookupState('incorrect'); return }
    // Session-only fixture; no server lookup or real authentication is implemented.
    if (!receipt || lookupRef.trim().toUpperCase() !== receipt.reference) { setLookupState('not-found'); return }
    if (!code.trim()) { setLookupState('verification'); return }
    if (code.trim().toUpperCase() !== receipt.accessCode) { setLookupState('incorrect'); return }
    setLookupState('found')
  }
  const title = page === 'method' ? <>Your meal.<br /><span>Your way.</span></> : page === 'details' ? <>A little about <span>you.</span></> : page === 'address' ? <>Where should<br />we <span>find you?</span></> : page === 'payment' ? <>A clear way<br />to <span>pay.</span></> : page === 'review' ? <>One last <span>look.</span></> : page === 'lookup' ? <>Your order,<br /><span>close at hand.</span></> : page === 'confirmation' ? <>We’ve kept it<br /><span>all together.</span></> : <>Every step,<br /><span>made clear.</span></>
  return <><OrderFlow open={open && dineIn} table={table} lines={lines} note={note} setNote={setNote} close={() => { setDineIn(false); close() }} language={language} setLanguage={setLanguage} /><dialog ref={dialog} className="order-flow" aria-labelledby="fulfilment-title" onCancel={event => { event.preventDefault(); if (!busy) close() }}>
    <header className="order-nav"><div className="order-shell"><Logo /><div><button className="order-lang" onClick={() => setModal('language')}><Icon name="globe" size={16} />{language === 'am' ? 'አማርኛ' : 'Afaan Oromo'}<Icon name="down" size={13} /></button><span className="table-badge"><Icon name={page === 'method' || page === 'lookup' ? 'bag' : activeMode === 'pickup' ? 'bag' : 'delivery'} size={15} />{page === 'method' || page === 'lookup' ? 'Order' : activeMode === 'pickup' ? 'Pickup' : 'Delivery'}</span></div></div></header>
    <div className="order-shell order-content"><div className="fulfilment-utility"><button className="order-back" disabled={busy} onClick={() => { if (isReceipt || page === 'method' || page === 'lookup') close(); else go(page === 'details' ? 'method' : page === 'address' ? 'details' : page === 'payment' ? mode === 'delivery' ? 'address' : 'details' : 'payment') }}><Icon name="arrow" size={16} />{isReceipt || page === 'method' || page === 'lookup' ? 'Back to menu' : 'Back'}</button>{page !== 'lookup' && <button disabled={busy} onClick={() => { setLookupState('initial'); go('lookup') }}><Icon name="user" size={15} />Sign In / Track Order</button>}</div>
      <div className="order-page-heading"><span className="eyebrow">ILILLII HOTEL · BALE ROBE</span><h1 ref={heading} tabIndex={-1} id="fulfilment-title">{title}</h1></div>
      {!isReceipt && page !== 'method' && page !== 'lookup' && <ol className="checkout-progress fulfilment-progress">{['Details', ...(mode === 'delivery' ? ['Location'] : []), 'Payment', 'Review'].map((label, index) => <li key={label} className={label === ({ details: 'Details', address: 'Location', payment: 'Payment', review: 'Review' } as Record<string, string>)[page] ? 'current' : ''}><span>{index + 1}</span>{label}</li>)}</ol>}
      {page !== 'method' && page !== 'lookup' && <CompactCheckoutAmount subtotal={total} delivery={activeMode === 'delivery'} />}
      <div className={`order-layout ${page === 'method' || page === 'lookup' ? 'wide-main' : ''}`}><div className="order-main-card">
        {isReceipt && receipt && <div className="checkout-status-pair"><StatusBadge type="Payment" label={paymentStatus === 'verified-illustration' ? 'Paid' : 'Verification Pending'} tone={paymentStatus === 'verified-illustration' ? 'success' : 'warning'} /><StatusBadge type="Order" label={stages[stage]} /></div>}
        {page === 'payment' && <button className="button secondary order-full" onClick={() => setPaymentPreview(true)}><Icon name="shield" size={17} />Payment details & bank transfer</button>}
        {error && <div className="order-error" role="alert" id="guest-form-error"><Icon name="info" size={20} /><div><strong>Let’s check before continuing.</strong><p>{error}</p></div></div>}
        {page === 'method' && <><div className="order-card-heading"><span className="order-card-icon"><Icon name="meal" size={23} /></span><div><h2>How will you join us?</h2></div></div><div className="fulfilment-methods">{[{ id: 'dine', icon: 'meal', label: 'Eat at the Hotel', text: 'Settle in at your table and enjoy your meal.' }, { id: 'pickup', icon: 'bag', label: 'Pick Up My Order', text: 'Collect your prepared order at Ilillii Hotel.' }, { id: 'delivery', icon: 'delivery', label: 'Deliver to My Location', text: 'We’ll prepare and deliver to your address in Bale Robe.' }].map(item => <button className="fulfilment-method" key={item.id} onClick={() => { if (item.id === 'dine') { if (!table) setError('Please select a table to dine in, or choose Pickup or Delivery.'); else setDineIn(true) } else { setMode(item.id as Fulfilment); go('details') } }}><span><Icon name={item.icon} size={26} /></span><div><strong>{item.label}</strong></div><Icon name="arrow" size={18} /></button>)}</div><p className="offsite-policy"><Icon name="info" size={18} />Pickup and delivery orders are prepared fresh by our kitchen team.</p></>}
        {page === 'details' && <form noValidate onSubmit={event => { event.preventDefault(); const invalid = validateOffsite(name, phone); setError(invalid); if (!invalid) go(mode === 'delivery' ? 'address' : 'payment') }}><div className="order-card-heading"><span className="order-card-icon"><Icon name={mode === 'pickup' ? 'bag' : 'delivery'} size={23} /></span><div><h2>{mode === 'pickup' ? 'Pick Up My Order' : 'Deliver to My Location'}</h2></div></div>{mode === 'pickup' && <div className="pickup-location"><Icon name="pin" size={22} /><div><strong>Ilillii Hotel · Bale Robe</strong><span>Around Awraris, near General Wako Gutu Square</span><small>Manager: 0909511588</small></div></div>}<label className="order-field">Your name<span>Required</span><input required aria-invalid={Boolean(error && !name.trim())} aria-describedby={error ? 'guest-form-error' : undefined} autoComplete="name" value={name} maxLength={80} onChange={event => setName(event.target.value)} placeholder="Your name" /></label><label className="order-field">Phone number<span>Required</span><input required aria-invalid={Boolean(error && error.toLowerCase().includes('phone'))} aria-describedby={error ? 'guest-form-error' : undefined} type="tel" inputMode="tel" autoComplete="tel" value={phone} maxLength={24} onChange={event => setPhone(event.target.value)} placeholder="0909511588" /><small>Used by our team for order coordination.</small></label><label className="order-field">Order instructions<span>Optional</span><textarea value={note} maxLength={500} onChange={event => setNote(event.target.value)} rows={3} placeholder="Anything the team should know?" /><small>Let us know if you have any dietary preferences.</small></label><button className="button primary order-full" type="submit">{mode === 'delivery' ? 'Add delivery location' : 'Continue to payment'}<Icon name="arrow" size={18} /></button></form>}
        {page === 'address' && <form noValidate onSubmit={event => { event.preventDefault(); const invalid = validateAddress(address); setError(invalid || (coverage !== 'available' ? 'Delivery is not yet confirmed for this location. Keep your details, edit your area, or switch to pickup.' : '')); if (!invalid && coverage === 'available') go('payment') }}><h2>A place we can find.</h2><div className="address-options"><span><Icon name="pin" size={17} />Bale Robe delivery destination</span></div>{[{ key: 'area', label: 'Area or neighborhood', placeholder: 'e.g. Around Awraris / General Wako Gutu Square' }, { key: 'landmark', label: 'Nearby landmark', placeholder: 'A familiar place close to you' }, { key: 'directions', label: 'House, building or directions', placeholder: 'How the team can find your entrance' }].map(field => <label className="order-field" key={field.key}>{field.label}<span>Required</span><input aria-invalid={Boolean(error && !address[field.key as keyof GuestAddress].trim())} aria-describedby={error ? 'guest-form-error' : undefined} value={address[field.key as keyof GuestAddress]} maxLength={200} required onChange={event => { setAddress({ ...address, [field.key]: event.target.value }); setCoverage('awaiting') }} placeholder={field.placeholder} /></label>)}<CoverageChecker resetKey={`${address.landmark}|${address.directions}`} area={address.area} setArea={value => setAddress({ ...address, area: value })} onResult={setCoverage} onPickup={() => { setMode('pickup'); go('details') }} onDineIn={() => go('method')} /><button className="button primary order-full" type="submit">Continue to payment<Icon name="arrow" size={18} /></button><button className="continue-button" type="button" onClick={() => { setMode('pickup'); go('details') }}>Pick up my order instead</button></form>}
        {page === 'payment' && <><h2>Choose your payment method.</h2><div className="payment-amount"><span>Subtotal</span><strong>{formatBirr(total)} ETB</strong></div><div className="online-heading"><h3>Payment options</h3></div>{[{ name: 'Telebirr checkout', text: 'Fast & direct mobile payment via Telebirr' }, { name: 'CBE integrated gateway', text: 'Commercial Bank of Ethiopia direct payment' }, { name: 'CBE manual bank transfer', text: 'Transfer to Ilillii Hotel CBE account' }].map(method => <div className={`unconfigured-provider ${provider === method.name ? 'selected-provider' : ''}`} key={method.name} onClick={() => setProvider(method.name)} style={{ cursor: 'pointer' }}><span className="payment-monogram">{method.name.startsWith('CBE') ? 'CBE' : 'T'}</span><div><strong>{method.name}</strong><small>{method.text}</small></div>{provider === method.name && <Icon name="check" size={18} />}</div>)}<button className="button primary order-full" onClick={() => go('review')}>Review order<Icon name="arrow" size={18} /></button></>}
        {page === 'review' && <><h2>Check your meal details.</h2><dl className="review-details"><div><dt>Method</dt><dd>{mode === 'pickup' ? 'Pickup at Ilillii Hotel' : 'Delivery in Bale Robe'}</dd></div><div><dt>Name</dt><dd>{name}</dd></div><div><dt>Phone</dt><dd>{phone}</dd></div>{mode === 'delivery' && <div><dt>Destination</dt><dd>{address.area}<br />{address.landmark}<br />{address.directions}</dd></div>}<div><dt>Payment</dt><dd>{provider}</dd></div>{note && <div><dt>Note</dt><dd>{note}</dd></div>}</dl><button className="button primary order-full" onClick={submit} disabled={busy || Boolean(receipt)} aria-busy={busy}>{busy ? 'Submitting order…' : 'Place Order'}<Icon name="arrow" size={18} /></button>{error && <button className="continue-button" onClick={close}>Edit my cart</button>}<p className="order-privacy"><Icon name="check" size={13} />Your order is delivered directly to the kitchen team.</p></>}
        {isReceipt && receipt && <><div className="order-success-icon"><Icon name="check" size={31} /></div><div className="confirmation-intro"><h2>{page === 'tracking' ? stages[stage] : 'Order Received!'}</h2><p>Your order has been placed with Ilillii Hotel. Preparation will begin shortly.</p><strong className="order-reference">{receipt.reference}</strong><span>{receipt.mode === 'pickup' ? 'Pickup at Ilillii Hotel · Around Awraris, near General Wako Gutu Square' : 'Delivery destination confirmed in Bale Robe'}</span><span>{new Date(receipt.created).toLocaleString()}</span></div>
          <div className="private-receipt" style={{ background: 'var(--color-cream, #FFF8F3)', border: '1px solid var(--color-sand, #E8DCCF)', borderRadius: '12px', padding: '16px', margin: '14px 0', textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-ink, #292524)' }}>Order Reference</span>
              <strong style={{ fontFamily: 'monospace', fontSize: '15px', color: 'var(--color-brand, #B82032)' }}>{receipt.reference}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
              <span style={{ fontSize: '13px', color: 'var(--color-muted, #78716C)' }}>Access Code</span>
              <strong style={{ fontFamily: 'monospace', fontSize: '14px', color: 'var(--color-ink, #292524)' }}>{receipt.accessCode}</strong>
            </div>
            <p style={{ margin: '8px 0 0', fontSize: '12px', color: 'var(--color-muted, #78716C)' }}>Save these codes to track your order anytime.</p>
          </div>
          <div className="payment-status-card">
            <Icon name="check" size={20} />
            <div>
              <strong>Payment: {receipt.provider}</strong>
              <p>Please show payment confirmation or settle at the hotel counter or with delivery staff.</p>
            </div>
          </div>
          {page === 'confirmation' ? <button className="button primary order-full" onClick={() => go('tracking')}>Track order progress<Icon name="arrow" size={18} /></button> : <><ol className="order-timeline">{stages.map((label, index) => <li key={label} className={index === stage ? 'active' : index < stage ? 'done' : ''} aria-current={index === stage ? 'step' : undefined}><span>{index < stage ? <Icon name="check" size={14} /> : index + 1}</span><div><strong>{label}</strong></div></li>)}</ol>{stage === 3 && <div className="ready-instructions"><Icon name={receipt.mode === 'pickup' ? 'bag' : 'delivery'} size={24} /><div><strong>{receipt.mode === 'pickup' ? 'Ready for Pickup' : 'Dispatched'}</strong><p>{receipt.mode === 'pickup' ? 'Please come to Ilillii Hotel (around Awraris, near General Wako Gutu Square) and present your order reference.' : 'Your meal is out for delivery in Bale Robe.'}</p></div></div>}<div className="status-refresh"><p role="status">{lastUpdated}</p><button className="button secondary" onClick={() => setLastUpdated(`Status checked at ${new Date().toLocaleTimeString()}.`)}>Refresh status</button></div></>}
          <a href="tel:0909511588" className="button secondary order-full" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', textDecoration: 'none', margin: '8px 0' }}><Icon name="phone" size={16} />Call Manager (0909511588)</a>
          <button className="continue-button" onClick={() => setModal('cancel')}>Request cancellation</button>{cancellation && <p className="cancellation-note" role="status">Cancellation request received. Our team will verify and contact you.</p>}
        </>}
        {page === 'lookup' && (
          <AuthCard
            initialTab="login"
            onLookup={(ref, codeVal) => {
              setLookupRef(ref)
              setCode(codeVal)
              lookup()
              if (receipt && ref.trim().toUpperCase() === receipt.reference) {
                go('tracking')
              }
            }}
          />
        )}
      </div>{page !== 'method' && page !== 'lookup' && <aside className="order-summary-card"><div className="summary-heading"><Icon name="bag" size={20} /><h2>Your meal</h2>{!isReceipt && <button disabled={busy} onClick={close}>Edit</button>}</div><div className="summary-table"><span>{activeMode === 'pickup' ? 'Pickup at Ilillii' : 'Delivery'}</span></div><div className="summary-lines">{shownLines.map(line => <div key={line.item.id}><span>{line.quantity} ×</span><div><strong>{line.item.name}</strong><small>{formatBirr(line.item.price)} ETB each</small></div><b>{formatBirr(line.item.price * line.quantity)}</b></div>)}</div><div className="summary-subtotal"><span>Subtotal</span><strong>{formatBirr(total)} ETB</strong></div>{activeMode === 'delivery' && <div className="summary-subtotal delivery-fee-line"><span>Delivery fee</span><strong>Free / Included</strong></div>}<div className="summary-total"><span>{activeMode === 'delivery' ? 'Final amount' : 'Total'}</span><strong>{formatBirr(total)} <small>ETB</small></strong></div><div className="summary-assurance"><Icon name="heart" size={17} /><span>Good food, your way.<br />Freshly prepared at Ilillii.</span></div></aside>}</div>
    </div>
    <PaymentExperience open={open && paymentPreview} close={() => setPaymentPreview(false)} mode={mode} lines={lines} customer={name} orderReference={receipt?.reference} language={language} setLanguage={setLanguage} />
    {open && modal && <Modal title={modal === 'language' ? 'Feel at home.' : modal === 'cancel' ? 'Order Cancellation' : 'Contact Ilillii Hotel'} close={() => setModal(null)}>{modal === 'language' ? <><div className="language-options">{[{ id: 'om', label: 'Afaan Oromo' }, { id: 'am', label: 'አማርኛ — Amharic' }].map(value => <button className={`language-option ${language === value.id ? 'selected' : ''}`} key={value.id} onClick={() => setLanguage(value.id)}><span>{value.label}<small>Awaiting local review</small></span><Icon name={language === value.id ? 'check' : 'globe'} /></button>)}</div></> : modal === 'cancel' ? <><p className="modal-description">If you need to change or cancel your order, please call our manager directly before kitchen preparation finishes.</p><a href="tel:0909511588" className="button primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'none' }}><Icon name="phone" size={17} />Call Manager (0909511588)</a></> : <><p className="modal-description">Ilillii Hotel is located around Awraris, near General Wako Gutu Square, Bale Robe. If you have any questions or need assistance, please call our manager directly.</p><a href="tel:0909511588" className="button primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'none' }}><Icon name="phone" size={17} />Call Manager (0909511588)</a></>}</Modal>}
  </dialog></>
}
