import { useEffect, useRef, useState } from 'react'
import { Icon, Logo, Modal, useDialog } from './shared-ui'
import { formatBirr } from './menu-data'
import type { MenuItem } from './menu-data'
import { orderStages, validateGuest } from './order-prototype'
import './order.css'
import PaymentExperience from './PaymentExperience'
import { CompactCheckoutAmount, StatusBadge } from './ui-patterns'

type Line = { item: MenuItem; quantity: number }
type Step = 'details' | 'payment' | 'review' | 'confirmation' | 'tracking'
type Payment = 'cash' | 'telebirr-demo' | 'cbe-demo'
type Snapshot = { reference: string; table: string; name: string; phone: string; note: string; payment: Payment; lines: Line[]; total: number }
const paymentLabel = (payment: Payment) => payment === 'cash' ? 'Cash at the hotel' : payment === 'telebirr-demo' ? 'Telebirr · demonstration' : 'CBE transfer · demonstration'

export default function OrderFlow({ open, table, lines, note, setNote, close, language, setLanguage }: {
  open: boolean; table: string | null; lines: Line[]; note: string; setNote: (value: string) => void; close: () => void; language: string; setLanguage: (value: string) => void
}) {
  const [step, setStep] = useState<Step>('details')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [payment, setPayment] = useState<Payment>('cash')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [paymentPreview, setPaymentPreview] = useState(false)
  const [scenario, setScenario] = useState('normal')
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null)
  const [stage, setStage] = useState(0)
  const [paymentState, setPaymentState] = useState('pending')
  const [modal, setModal] = useState<'language' | 'help' | null>(null)
  const [refreshed, setRefreshed] = useState('')
  const submitting = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const heading = useRef<HTMLHeadingElement>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const total = lines.reduce((sum, line) => sum + line.item.price * line.quantity, 0)
  const locked = busy || Boolean(snapshot)
  const shownLines = snapshot ? snapshot.lines : lines
  const shownTotal = snapshot ? snapshot.total : total
  const confirmedView = step === 'confirmation' || step === 'tracking'
  useEffect(() => () => clearTimeout(timer.current), [])
  useEffect(() => { if (!open) { setModal(null); setPaymentPreview(false) } }, [open])
  useDialog(dialog, open)
  useEffect(() => { if (open) { heading.current?.focus(); dialog.current?.scrollTo(0, 0) } }, [open, step])
  useEffect(() => { if (error && open) dialog.current?.querySelector('[role="alert"]')?.scrollIntoView({ block: 'center' }) }, [error, open])
  const go = (next: Step) => { setError(''); setStep(next) }
  const submit = () => {
    if (submitting.current || snapshot) return
    const validation = validateGuest(name, phone)
    if (validation || !table || !lines.length) { setError(validation || 'A demo table and at least one menu item are needed. Return to the menu to check your order.'); return }
    submitting.current = true
    setBusy(true)
    setError('')
    // Local prototype transition only; never sends an order or contacts a payment provider.
    timer.current = setTimeout(() => {
      setBusy(false)
      submitting.current = false
      if (scenario !== 'normal') {
        const messages: Record<string, string> = {
          network: 'Connection interrupted · demonstration. Your cart and details are safe in this open session. Reconnect, then retry.',
          failure: 'Order could not be sent · demonstration. Nothing has been charged. Your cart is unchanged; try again or ask staff.',
          unavailable: 'An item needs an availability check · demonstration. No order was sent. Edit your order and ask staff before trying again.',
          duplicate: 'A matching order may already exist · demonstration. Do not submit again until staff check. Your cart has been kept.',
        }
        setError(messages[scenario])
        return
      }
      setSnapshot({ reference: `DEMO-ILL-${crypto.randomUUID().slice(0, 8).toUpperCase()}`, table, name: name.trim(), phone: phone.trim(), note, payment, lines: lines.map(line => ({ ...line })), total })
      setStep('confirmation')
    }, 900)
  }
  const currentIndex = step === 'details' ? 0 : step === 'payment' ? 1 : 2
  return <dialog ref={dialog} className="order-flow" aria-labelledby="order-page-title" onCancel={event => { event.preventDefault(); if (!busy) close() }}>
    <div className="order-prototype-strip">INTERACTIVE PROTOTYPE <span>· No real order or payment is sent</span></div>
    <header className="order-nav"><div className="order-shell"><Logo /><div><button className="order-lang" onClick={() => setModal('language')}><Icon name="globe" size={17} />{language === 'am' ? 'አማርኛ' : 'Afaan Oromo'}<Icon name="down" size={13} /></button><span className="table-badge"><Icon name="meal" size={15} />Table {snapshot?.table || table || '—'}<small>DEMO</small></span></div></div></header>
    <div className="order-shell order-content">
      <button className="order-back" onClick={() => { if (busy) return; if (step === 'details' || confirmedView) close(); else go(step === 'review' ? 'payment' : 'details') }} disabled={busy}><Icon name="arrow" size={16} />{confirmedView ? 'Back to menu' : step === 'details' ? 'Edit your order' : 'Back'}</button>
      {!confirmedView && <ol className="checkout-progress" aria-label="Checkout progress">{['Your details', 'Payment', 'Review'].map((label, index) => <li key={label} className={index === currentIndex ? 'current' : index < currentIndex ? 'complete' : ''} aria-current={index === currentIndex ? 'step' : undefined}><span>{index < currentIndex ? <Icon name="check" size={14} /> : index + 1}</span>{label}</li>)}</ol>}
      <div className="order-page-heading"><span className="eyebrow">{confirmedView ? 'GOOD FOOD. GREAT COMPANY.' : 'DINE IN · NO ACCOUNT NEEDED'}</span><h1 id="order-page-title" ref={heading} tabIndex={-1}>{step === 'details' ? <>A little about <span>you.</span></> : step === 'payment' ? <>How would you like<br />to <span>pay?</span></> : step === 'review' ? <>One last <span>look.</span></> : step === 'confirmation' ? <>Your order,<br /><span>all together.</span></> : <>From our kitchen<br />to <span>your table.</span></>}</h1></div>
      <CompactCheckoutAmount subtotal={shownTotal} />
      <div className="order-layout"><div className="order-main-card">
        {confirmedView && snapshot && <div className="checkout-status-pair"><StatusBadge type="Payment" label={snapshot.payment === 'cash' ? 'Unpaid · cash at hotel' : paymentState === 'failed' ? 'Failed' : 'Verification Pending'} tone={paymentState === 'failed' ? 'error' : 'warning'} demo /><StatusBadge type="Order" label={orderStages[stage]} demo /></div>}
        {step === 'payment' && <button className="button secondary order-full" onClick={() => setPaymentPreview(true)}><Icon name="shield" size={17} />Explore payment & bank transfer screens</button>}
        {error && <div className="order-error" role="alert" id="dine-form-error"><Icon name="info" size={20} /><div><strong>Let’s check before continuing.</strong><p>{error}</p><button onClick={() => setModal('help')}>Ask staff for help</button></div></div>}
        {step === 'details' && <form onSubmit={event => { event.preventDefault(); const validation = validateGuest(name, phone); setError(validation); if (!validation) go('payment') }} noValidate>
          <div className="order-card-heading"><span className="order-card-icon"><Icon name="heart" size={22} /></span><div><h2>Who’s joining us?</h2></div></div>
          <div className="table-check"><Icon name="meal" size={22} /><div><strong>Table {table || 'not identified'}</strong><span>Demo table · please check before you continue</span></div><span>DINE IN</span></div>
          <label className="order-field">Your name <span>Required</span><input autoComplete="given-name" maxLength={80} value={name} onChange={e => setName(e.target.value)} placeholder="The name staff can call you" aria-invalid={Boolean(error && !name.trim())} aria-describedby={error ? 'dine-form-error name-help' : 'name-help'} required /><small id="name-help">So we know who this meal is for.</small></label>
          <label className="order-field">Phone number <span>Optional</span><input type="tel" aria-invalid={Boolean(error && error.toLowerCase().includes('phone'))} aria-describedby={error ? 'dine-form-error' : undefined} autoComplete="tel" inputMode="tel" value={phone} maxLength={24} onChange={e => setPhone(e.target.value)} placeholder="For follow-up, if needed" /><small>No phone number is required to try this flow.</small></label>
          <label className="order-field">Anything we should know? <span>Optional</span><textarea value={note} onChange={e => setNote(e.target.value)} maxLength={500} placeholder="Add a note for the team" rows={3} /><small>Notes are requests, not guarantees. Ask staff about allergies.</small></label>
          <button className="button primary order-full" type="submit">Continue to payment<Icon name="arrow" size={18} /></button><p className="order-privacy"><Icon name="check" size={13} />Your details stay in this prototype session only.</p>
        </form>}
        {step === 'payment' && <><h2>Keep it simple.</h2><button className={`payment-choice ${payment === 'cash' ? 'selected' : ''}`} onClick={() => setPayment('cash')} aria-pressed={payment === 'cash'}><span className="payment-monogram">ETB</span><span><strong>Pay cash at the hotel</strong><small>In the live flow, your order goes to the restaurant for preparation. Pay staff after eating.</small></span><span className="choice-radio">{payment === 'cash' && <Icon name="check" size={14} />}</span></button>
          <div className="online-heading"><h3>Pay online</h3><span>NOT CONFIGURED</span></div>
          {['Telebirr', 'CBE Bank transfer'].map(provider => <div className="unconfigured-provider" key={provider}><span className="payment-monogram">{provider === 'Telebirr' ? 'T' : 'CBE'}</span><div><strong>{provider}</strong><small>{provider === 'Telebirr' ? 'Awaiting approved provider configuration' : 'Verified account details will appear here'}</small></div><Icon name="info" size={17} /></div>)}
          <details className="online-demo"><summary>Preview online payment states</summary><div>{(['telebirr-demo', 'cbe-demo'] as Payment[]).map(value => <button key={value} className={payment === value ? 'chosen' : ''} onClick={() => setPayment(value)} aria-pressed={payment === value}>{value === 'telebirr-demo' ? 'Telebirr demo' : 'CBE demo'}{payment === value && <Icon name="check" size={14} />}</button>)}</div></details>
          <p className="payment-explanation"><Icon name="info" size={17} />{payment === 'cash' ? 'Cash payment selected — not yet paid.' : 'Online demonstration selected. Payment remains unverified. A screenshot alone is not proof of payment.'}</p><button className="button primary order-full" onClick={() => go('review')}>Review your order<Icon name="arrow" size={18} /></button></>}
        {step === 'review' && <><h2>Ready when you are.</h2><dl className="review-details"><div><dt>Customer</dt><dd>{name}</dd></div><div><dt>Table</dt><dd>Table {table} · demo</dd></div>{phone && <div><dt>Phone</dt><dd>{phone}</dd></div>}<div><dt>Payment</dt><dd>{paymentLabel(payment)}</dd></div>{note && <div><dt>Order note</dt><dd>{note}</dd></div>}</dl><p className="payment-explanation"><Icon name="info" size={18} />{payment === 'cash' ? 'Cash payment selected — not yet paid. In the live service, staff receive the order after system acceptance.' : 'Payment is not confirmed. This demo will show a pending-payment state, not a successful payment.'}</p>
          <details className="scenario-select"><summary>Prototype: try an error or recovery state</summary><label className="order-field">Submission scenario<select value={scenario} onChange={e => { setScenario(e.target.value); setError('') }} disabled={busy}><option value="normal">Normal demonstration</option><option value="network">Network interruption</option><option value="failure">Submission failure</option><option value="unavailable">Item availability changed</option><option value="duplicate">Possible duplicate order</option></select></label></details>
          <button className="button primary order-full" onClick={submit} disabled={busy || Boolean(snapshot) || scenario === 'duplicate' && Boolean(error)} aria-busy={busy}>{busy ? <><span className="order-spinner" />Placing demo order…</> : 'Place Order'}{!busy && <Icon name="arrow" size={18} />}</button><p className="order-privacy">Prototype only — no real order or charge.</p>{error && <button className="continue-button" onClick={close}>Edit order without losing your cart</button>}
        </>}
        {confirmedView && snapshot && <><div className={`order-success-icon ${snapshot.payment !== 'cash' ? 'pending' : ''}`}><Icon name={snapshot.payment === 'cash' ? 'check' : 'info'} size={32} /></div><div className="confirmation-intro"><span className="prototype-pill">DEMO CONFIRMATION</span><h2>{step === 'tracking' ? orderStages[stage] : snapshot.payment === 'cash' ? 'Your demo order is received.' : 'Waiting for payment verification.'}</h2><p>No order has been sent to Ilillii. This is a local prototype state.</p><strong className="order-reference">{snapshot.reference}</strong><span>Table {snapshot.table} · {snapshot.name}</span></div>
          <div className="payment-status-card"><Icon name="info" size={20} /><div><strong>{snapshot.payment === 'cash' ? 'Cash selected · not yet paid' : paymentState === 'failed' ? 'Payment failed · demonstration' : paymentState === 'returned' ? 'Returned without confirmation' : 'Payment pending · unverified'}</strong><p>{snapshot.payment === 'cash' ? 'Cash payment selected. Please settle your bill with our staff in the live service.' : paymentState === 'failed' ? 'No verified payment has been recorded. Check with the provider and staff before retrying; do not pay twice.' : 'Payment must be verified by the provider or authorized backend. No verified result is available in this demo.'}</p></div></div>
          {step === 'tracking' ? <><ol className="order-timeline">{orderStages.map((label, index) => <li key={label} className={index < stage ? 'done' : index === stage ? 'active' : ''} aria-current={index === stage ? 'step' : undefined}><span>{index < stage ? <Icon name="check" size={14} /> : index + 1}</span><div><strong>{label}</strong>{index === stage && <small>Current stage · demonstration only</small>}</div></li>)}</ol><div className="status-refresh"><p>{refreshed || 'No live updates connected.'}</p><button className="button secondary" onClick={() => setRefreshed(`Preview refreshed at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. No live status available.`)}>Refresh status</button></div><details className="scenario-select"><summary>Prototype: preview preparation stages</summary><div className="stage-preview-buttons">{orderStages.map((label, index) => <button key={label} className={stage === index ? 'chosen' : ''} onClick={() => setStage(index)}>{label}</button>)}</div></details></> : <button className="button primary order-full" onClick={() => go('tracking')}>View order status<Icon name="arrow" size={18} /></button>}
          {snapshot.payment !== 'cash' && <details className="scenario-select"><summary>Prototype: payment recovery states</summary><div className="stage-preview-buttons">{[{ id: 'pending', label: 'Pending' }, { id: 'failed', label: 'Failed' }, { id: 'returned', label: 'Returned from provider' }].map(state => <button key={state.id} className={paymentState === state.id ? 'chosen' : ''} onClick={() => setPaymentState(state.id)}>{state.label}</button>)}</div></details>}
          <button className="continue-button" onClick={() => setModal('help')}>Request staff assistance<Icon name="heart" size={16} /></button>
        </>}
      </div><aside className="order-summary-card"><div className="summary-heading"><Icon name="bag" size={20} /><h2>{confirmedView ? 'Your demo order' : 'Your meal'}</h2>{!locked && <button onClick={close}>Edit</button>}</div><div className="summary-table"><span>Table {snapshot?.table || table || '—'}</span><small>DINE IN · DEMO</small></div><div className="summary-lines">{shownLines.map(line => <div key={line.item.id}><span>{line.quantity} ×</span><div><strong>{line.item.name}</strong><small>{formatBirr(line.item.price)} ETB each</small></div><b>{formatBirr(line.item.price * line.quantity)}</b></div>)}</div><div className="summary-subtotal"><span>Subtotal</span><strong>{formatBirr(shownTotal)} ETB</strong></div><div className="summary-total"><span>Total</span><strong>{formatBirr(shownTotal)} <small>ETB</small></strong></div>{snapshot?.note && <div className="summary-order-note"><strong>Order note</strong><p>{snapshot.note}</p></div>}<div className="summary-assurance"><Icon name="heart" size={17} /><span>Your table. Your meal.<br />A little time together.</span></div></aside></div>
      <div className="order-bottom-help"><Icon name="info" size={16} /><span>Need a hand? Our team can help you at the table.</span><button onClick={() => setModal('help')}>Ask for help</button></div>
    </div>
    {open && modal && <Modal title={modal === 'language' ? 'Feel at home.' : 'A little help, close by.'} close={() => setModal(null)}>{modal === 'language' ? <><div className="language-options">{[{ id: 'om', label: 'Afaan Oromo' }, { id: 'am', label: 'አማርኛ — Amharic' }].map(value => <button className={`language-option ${language === value.id ? 'selected' : ''}`} key={value.id} onClick={() => setLanguage(value.id)}><span>{value.label}<small>Translation awaiting review</small></span><Icon name={language === value.id ? 'check' : 'globe'} /></button>)}</div></> : <><p className="modal-description">Please ask a member of the team at your table for assistance. If a table number looks wrong, do not place the order until staff confirm it.</p></>}</Modal>}
    <PaymentExperience open={open && paymentPreview} close={() => setPaymentPreview(false)} mode="dine" lines={lines} customer={name} orderReference={snapshot?.reference} language={language} setLanguage={setLanguage} />
  </dialog>
}
