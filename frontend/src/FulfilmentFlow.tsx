import { useEffect, useRef, useState } from 'react'
import { Icon, Logo, Modal, useDialog } from './shared-ui'
import type { MenuItem } from './menu-data'
import { formatBirr } from './menu-data'
import { fulfilmentStages, validateOffsite } from './fulfilment-model'
import type { Fulfilment } from './fulfilment-model'
import { api } from './api/client'
import { useLanguage, languageOptions } from './language'
import './fulfilment.css'
import { CompactCheckoutAmount, StatusBadge } from './ui-patterns'

type Line = { item: MenuItem; quantity: number }
type Receipt = { reference: string; accessCode: string; mode: Fulfilment; lines: Line[]; subtotal: number; created: string }
type Page = 'details' | 'review' | 'confirmation' | 'tracking' | 'lookup'

export default function FulfilmentFlow({ open, entry = 'details', table, lines, note, setNote, close, language, setLanguage }: {
  open: boolean; entry?: 'method' | 'lookup' | 'details'; table: string | null; lines: Line[]; note: string; setNote: (value: string) => void; close: () => void; language: string; setLanguage: (value: string) => void
}) {
  const [page, setPage] = useState<Page>('details')
  const [mode, setMode] = useState<Fulfilment>('pickup')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [receipt, setReceipt] = useState<Receipt | null>(null)
  const [stage, setStage] = useState(0)
  const [error, setError] = useState('')
  const [scenario, setScenario] = useState('normal')
  const [busy, setBusy] = useState(false)
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
    if (open && !previousOpen.current) {
      setPage(entry === 'lookup' ? 'lookup' : receipt ? 'tracking' : 'details')
      setError('')
      try {
        const saved = localStorage.getItem('ilillii_customer')
        if (saved) {
          const parsed = JSON.parse(saved)
          if (parsed.name && !name) setName(parsed.name)
          if (parsed.phone && !phone) setPhone(parsed.phone)
        }
      } catch (e) {}
    }
    previousOpen.current = open
  }, [open, entry, receipt])
  useDialog(dialog, open)
  useEffect(() => { if (open) { heading.current?.focus(); dialog.current?.scrollTo(0, 0) } }, [open, page])
  useEffect(() => { if (error && open) dialog.current?.querySelector('[role="alert"]')?.scrollIntoView({ block: 'center' }) }, [error, open])
  useEffect(() => () => clearTimeout(timer.current), [])
  useEffect(() => { if (!open) { setModal(null) } }, [open])
  const subtotal = lines.reduce((sum, line) => sum + line.item.price * line.quantity, 0)
  const isReceipt = page === 'confirmation' || page === 'tracking'
  const activeMode = isReceipt && receipt ? receipt.mode : mode
  const total = isReceipt && receipt ? receipt.subtotal : subtotal
  const shownLines = isReceipt && receipt ? receipt.lines : lines
  const go = (next: Page) => { setError(''); setPage(next) }
  const stages = fulfilmentStages(activeMode)

  const submit = async () => {
    if (lock.current || receipt) return
    const invalid = validateOffsite(name, phone)
    if (invalid || !lines.length) { setError(invalid || 'Check your cart before continuing.'); return }
    lock.current = true; setBusy(true); setError('')
    try {
      const res = await api.createOrder({
        items: lines.map(l => ({
          menuItemId: l.item.id,
          name: l.item.name,
          price: l.item.price,
          quantity: l.quantity,
          image: l.item.confirmedImage || '',
        })),
        type: 'Pickup',
        customerName: name.trim(),
        customerPhone: phone.trim(),
        note,
        paymentTiming: 'post_pay',
        paymentMethod: 'Pay at Counter / Pickup',
      })
      lock.current = false; setBusy(false)
      if (res.success && res.order) {
        try {
          const historyItem = {
            orderNumber: res.order.orderNumber,
            date: new Date().toISOString(),
            total: res.order.total || res.order.subtotal,
            table: '',
            type: 'Pickup / Takeaway',
            items: linePayload.map(lp => ({ name: lp.name, quantity: lp.quantity, price: lp.price })),
            status: 'Submitted',
          }
          const prevHistory = JSON.parse(localStorage.getItem('ilillii_order_history') || '[]')
          const filtered = Array.isArray(prevHistory) ? prevHistory.filter((h: any) => h.orderNumber !== res.order.orderNumber) : []
          localStorage.setItem('ilillii_order_history', JSON.stringify([historyItem, ...filtered].slice(0, 30)))
        } catch (e) {}

        try {
          localStorage.setItem(
            'ilillii_customer',
            JSON.stringify({
              name: name.trim(),
              phone: phone.trim(),
              lastOrder: res.order.orderNumber,
              mode: 'Pickup',
              updatedAt: new Date().toISOString(),
            })
          )
          window.dispatchEvent(new CustomEvent('ilillii-auth-changed'))
        } catch (e) {}

        setReceipt({
          reference: res.order.orderNumber,
          accessCode: res.order.id.slice(-6).toUpperCase(),
          mode,
          lines: lines.map(line => ({ ...line })),
          subtotal: res.order.subtotal,
          created: res.order.createdAt,
        })
        setStage(0); setPage('confirmation')
      }
    } catch (err: any) {
      lock.current = false; setBusy(false)
      setError(err.message || 'Failed to submit order. Please try again.')
    }
  }
  const lookup = async () => {
    if (!lookupRef.trim()) { setLookupState('incorrect'); return }
    try {
      const res = await api.getOrder(lookupRef.trim())
      if (res.success && res.order) {
        setReceipt({
          reference: res.order.orderNumber,
          accessCode: res.order.id.slice(-6).toUpperCase(),
          mode: res.order.type === 'Pickup' ? 'pickup' : 'dine',
          lines: res.order.items.map(i => ({
            item: {
              id: i.menuItemId,
              name: i.name,
              price: i.price,
              category: 'main',
              availability: 'available',
            },
            quantity: i.quantity,
          })),
          subtotal: res.order.subtotal,
          created: res.order.createdAt,
        })
        setLookupState('found')
      } else {
        setLookupState('not-found')
      }
    } catch (e) {
      setLookupState('not-found')
    }
  }
  const title = page === 'details' ? <>A little about <span>you.</span></> : page === 'review' ? <>One last <span>look.</span></> : page === 'lookup' ? <>Your order,<br /><span>close at hand.</span></> : page === 'confirmation' ? <>We’ve kept it<br /><span>all together.</span></> : <>Every step,<br /><span>made clear.</span></>
  return <dialog ref={dialog} className="order-flow" aria-labelledby="fulfilment-title" onCancel={event => { event.preventDefault(); if (!busy) close() }}>
    <header className="order-nav"><div className="order-shell"><Logo /><div><button type="button" className="order-lang" onClick={() => setModal('language')}><Icon name="globe" size={16} /><span className="lang-code-pill">{language === 'om' ? 'Oro' : language === 'am' ? 'Amh' : 'Eng'}</span><Icon name="down" size={11} /></button><span className="table-badge"><Icon name="bag" size={15} />{page === 'lookup' ? 'Order' : 'Pickup / Takeaway'}</span></div></div></header>
    <div className="order-shell order-content"><div className="fulfilment-utility"><button className="order-back" disabled={busy} onClick={() => { if (isReceipt || page === 'details' || page === 'lookup') close(); else go('details') }}><Icon name="arrow" size={16} />{isReceipt || page === 'details' || page === 'lookup' ? 'Back to menu' : 'Back'}</button>{page !== 'lookup' && <button disabled={busy} onClick={() => { setLookupState('initial'); go('lookup') }}><Icon name="user" size={15} />Sign In / Track Order</button>}</div>
      <div className="order-page-heading"><span className="eyebrow">ILILLII HOTEL · BALE ROBE</span><h1 ref={heading} tabIndex={-1} id="fulfilment-title">{title}</h1></div>
      {!isReceipt && page !== 'lookup' && <ol className="checkout-progress fulfilment-progress">{['Details', 'Review'].map((label, index) => <li key={label} className={label === ({ details: 'Details', review: 'Review' } as Record<string, string>)[page] ? 'current' : ''}><span>{index + 1}</span>{label}</li>)}</ol>}
      <div className={`order-layout ${page === 'lookup' || page === 'details' || isReceipt ? 'wide-main single-card' : ''}`}><div className="order-main-card">
        {isReceipt && receipt && <div className="checkout-status-pair"><StatusBadge type="Order" label={stages[stage]} /></div>}
        {error && <div className="order-error" role="alert" id="guest-form-error"><Icon name="info" size={20} /><div><strong>Let’s check before continuing.</strong><p>{error}</p></div></div>}
        {page === 'details' && <form noValidate onSubmit={event => { event.preventDefault(); const invalid = validateOffsite(name, phone); setError(invalid); if (!invalid) go('review') }}><div className="order-card-heading"><span className="order-card-icon"><Icon name="bag" size={23} /></span><div><h2>Pick Up My Order (Takeaway)</h2></div></div><div className="pickup-location"><Icon name="pin" size={22} /><div><strong>Ilillii Hotel · Bale Robe</strong><span>Around Awraris, near General Wako Gutu Square</span><small>Phone: 0909511588</small></div></div><label className="order-field">Your name<span>Required</span><input required aria-invalid={Boolean(error && !name.trim())} aria-describedby={error ? 'guest-form-error' : undefined} autoComplete="name" value={name} maxLength={80} onChange={event => setName(event.target.value)} placeholder="Your name" /></label><label className="order-field">Phone number<span>Required</span><input required aria-invalid={Boolean(error && error.toLowerCase().includes('phone'))} aria-describedby={error ? 'guest-form-error' : undefined} type="tel" inputMode="tel" autoComplete="tel" value={phone} maxLength={24} onChange={event => setPhone(event.target.value)} placeholder="0909511588" /><small>Used by our team for order coordination.</small></label><label className="order-field">Order instructions<span>Optional</span><textarea value={note} maxLength={500} onChange={event => setNote(event.target.value)} rows={3} placeholder="Anything the team should know?" /><small>Let us know if you have any dietary preferences.</small></label><button className="button primary order-full" type="submit">Review order<Icon name="arrow" size={18} /></button></form>}
        {page === 'review' && (
          <>
            <h2>Check your meal details</h2>
            <dl className="review-details">
              <div><dt>Service</dt><dd>Pickup / Takeaway at Ilillii Hotel</dd></div>
              <div><dt>Pickup location</dt><dd>Around Awraris, near General Wako Gutu Square, Bale Robe</dd></div>
              <div><dt>Name</dt><dd>{name}</dd></div>
              <div><dt>Phone</dt><dd>{phone}</dd></div>
              {note && <div><dt>Note</dt><dd>{note}</dd></div>}
            </dl>

            <div className="order-buttons-group">
              <button className="button primary order-full" onClick={submit} disabled={busy || Boolean(receipt)} aria-busy={busy}>
                {busy ? 'Submitting order…' : 'Place Order'}
                <Icon name="arrow" size={18} />
              </button>
              {error && <button className="continue-button" onClick={close}>Edit my cart</button>}
              <p className="order-privacy"><Icon name="check" size={13} />Your order is sent directly to the Ilillii Hotel kitchen team.</p>
            </div>
          </>
        )}
        {isReceipt && receipt && (
          <>
            <div className="order-success-icon"><Icon name="check" size={31} /></div>
            <div className="confirmation-intro">
              <h2>{page === 'tracking' ? stages[stage] : 'Order Received!'}</h2>
              <p>Your pickup order has been placed with Ilillii Hotel. Preparation will begin shortly.</p>
              <strong className="order-reference">{receipt.reference}</strong>
              <span>Pickup at Ilillii Hotel · Around Awraris, near General Wako Gutu Square</span>
              <span>{new Date(receipt.created).toLocaleString()}</span>
            </div>
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
            {page === 'confirmation' ? null : (
              <>
                <ol className="order-timeline">
                  {stages.map((label, index) => (
                    <li key={label} className={index === stage ? 'active' : index < stage ? 'done' : ''} aria-current={index === stage ? 'step' : undefined}>
                      <span>{index < stage ? <Icon name="check" size={14} /> : index + 1}</span>
                      <div><strong>{label}</strong></div>
                    </li>
                  ))}
                </ol>
                {stage === 3 && (
                  <div className="ready-instructions">
                    <Icon name="bag" size={24} />
                    <div>
                      <strong>Ready for Pickup</strong>
                      <p>Please come to Ilillii Hotel (around Awraris, near General Wako Gutu Square) and present your order reference.</p>
                    </div>
                  </div>
                )}
                <div className="status-refresh">
                  <p role="status">{lastUpdated}</p>
                  <button className="button secondary" onClick={() => setLastUpdated(`Status checked at ${new Date().toLocaleTimeString()}.`)}>Refresh status</button>
                </div>
              </>
            )}
            <div className="order-buttons-group">
              {page === 'confirmation' && (
                <button className="button primary order-full" onClick={() => go('tracking')}>
                  Track order progress<Icon name="arrow" size={18} />
                </button>
              )}
              <button
                type="button"
                className="button secondary order-full"
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                onClick={() => {
                  close()
                  window.dispatchEvent(new CustomEvent('ilillii-open-history'))
                }}
              >
                <Icon name="clock" size={16} />View My Past Orders
              </button>
              <a href="tel:0909511588" className="button secondary order-full" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', textDecoration: 'none' }}>
                <Icon name="phone" size={16} />Call 0909511588
              </a>
              <button className="continue-button" onClick={() => setModal('cancel')}>Request cancellation</button>
              {cancellation && <p className="cancellation-note" role="status">Cancellation request received. Our team will verify and contact you.</p>}
            </div>
          </>
        )}
        {page === 'lookup' && (
          <div className="lookup-box" style={{ padding: '16px 0' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 750, margin: '0 0 6px', color: 'var(--color-ink)' }}>Track your order</h2>
            <p style={{ fontSize: '13px', color: 'var(--color-muted)', margin: '0 0 16px' }}>Enter your order reference code (e.g. IL-1004) to view live preparation status.</p>
            {lookupState === 'not-found' && <div className="auth-alert-error" role="alert" style={{ marginBottom: '14px' }}><Icon name="info" size={16} /><span>Order reference not found. Please verify the code.</span></div>}
            <form onSubmit={(e) => { e.preventDefault(); lookup() }} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <label className="auth-field" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600 }}>Order reference code</span>
                <input
                  type="text"
                  placeholder="e.g. IL-1004"
                  value={lookupRef}
                  onChange={(e) => setLookupRef(e.target.value)}
                  required
                  style={{ height: '46px', paddingInline: '14px', border: '1px solid var(--color-line)', borderRadius: '8px', fontSize: '14px' }}
                />
              </label>
              <button type="submit" className="button primary order-full" disabled={busy} style={{ width: '100%', height: '48px', justifyContent: 'center' }}>
                <Icon name="search" size={16} />Find My Order
              </button>
            </form>
          </div>
        )}
      </div>{page === 'review' && <aside className="order-summary-card"><div className="summary-heading"><Icon name="bag" size={20} /><h2>Your meal</h2>{!isReceipt && <button disabled={busy} onClick={close}>Edit</button>}</div><div className="summary-table"><span>Pickup at Ilillii Hotel</span></div><div className="summary-lines">{shownLines.map(line => <div key={line.item.id}><span>{line.quantity} ×</span><div><strong>{line.item.name}</strong></div>{shownLines.length > 1 && <b>{formatBirr(line.item.price * line.quantity)} ETB</b>}</div>)}</div><div className="summary-total"><span>Total</span><strong>{formatBirr(total)} <small>ETB</small></strong></div><div className="summary-assurance"><Icon name="heart" size={17} /><span>Good food, your way.<br />Freshly prepared at Ilillii.</span></div></aside>}</div>
    </div>
    {open && modal && <Modal title={modal === 'language' ? 'Choose Language / Qooqa Filadhaa' : modal === 'cancel' ? 'Order Cancellation' : 'Contact Ilillii Hotel'} close={() => setModal(null)}>{modal === 'language' ? <div className="language-options">{languageOptions.map(option => <button className={`language-option ${language === option.id ? 'selected' : ''}`} key={option.id} onClick={() => { setLanguage(option.id); setModal(null) }}><span>{option.native} — {option.label}</span><Icon name={language === option.id ? 'check' : 'globe'} /></button>)}</div> : modal === 'cancel' ? <><p className="modal-description">If you need to change or cancel your order, please call our team directly before kitchen preparation finishes.</p><a href="tel:0909511588" className="button primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'none' }}><Icon name="phone" size={17} />Call 0909511588</a></> : <><p className="modal-description">Ilillii Hotel is located around Awraris, near General Wako Gutu Square, Bale Robe. If you have any questions or need assistance, please call our team directly.</p><a href="tel:0909511588" className="button primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'none' }}><Icon name="phone" size={17} />Call 0909511588</a></>}</Modal>}
  </dialog>
}
