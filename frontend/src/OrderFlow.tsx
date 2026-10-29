import { useEffect, useRef, useState } from 'react'
import { Icon, Logo, Modal, useDialog } from './shared-ui'
import { formatBirr } from './menu-data'
import type { MenuItem } from './menu-data'
import { orderStages, validateGuest } from './order-prototype'
import { api } from './api/client'
import { languageOptions } from './language'
import './order.css'
import { CompactCheckoutAmount, StatusBadge } from './ui-patterns'

type Line = { item: MenuItem; quantity: number }
type Step = 'details' | 'review' | 'confirmation' | 'tracking'
type Snapshot = { reference: string; table: string; name: string; phone: string; note: string; lines: Line[]; total: number }

export default function OrderFlow({ open, table, lines, note, setNote, close, language, setLanguage }: {
  open: boolean; table: string | null; lines: Line[]; note: string; setNote: (value: string) => void; close: () => void; language: string; setLanguage: (value: string) => void
}) {
  const [step, setStep] = useState<Step>('details')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null)
  const [stage, setStage] = useState(0)
  const [modal, setModal] = useState<'language' | 'help' | null>(null)
  const [refreshed, setRefreshed] = useState('')
  const [activeOrderId, setActiveOrderId] = useState<string | null>(() => localStorage.getItem('ilillii_active_order_id'))
  const [appendToExisting, setAppendToExisting] = useState(true)
  const submitting = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const heading = useRef<HTMLHeadingElement>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const total = lines.reduce((sum, line) => sum + line.item.price * line.quantity, 0)
  const locked = busy || Boolean(snapshot)
  const shownLines = snapshot ? snapshot.lines : lines
  const shownTotal = snapshot ? snapshot.total : total
  const confirmedView = step === 'confirmation' || step === 'tracking'

  useEffect(() => {
    if (open && !snapshot) {
      setStep('details')
      setError('')
      const storedActive = localStorage.getItem('ilillii_active_order_id')
      setActiveOrderId(storedActive)
      // Pre-fill customer details if previously saved
      try {
        const saved = localStorage.getItem('ilillii_customer')
        if (saved) {
          const parsed = JSON.parse(saved)
          if (parsed.name && !name) setName(parsed.name)
          if (parsed.phone && !phone) setPhone(parsed.phone)
        }
      } catch (e) {}
    }
  }, [open, snapshot])

  useEffect(() => () => clearTimeout(timer.current), [])
  useEffect(() => { if (!open) { setModal(null) } }, [open])
  useDialog(dialog, open)
  useEffect(() => { if (open) { heading.current?.focus(); dialog.current?.scrollTo(0, 0) } }, [open, step])
  useEffect(() => { if (error && open) dialog.current?.querySelector('[role="alert"]')?.scrollIntoView({ block: 'center' }) }, [error, open])
  const go = (next: Step) => { setError(''); setStep(next) }

  const submit = async () => {
    if (submitting.current || snapshot) return
    const validation = validateGuest(name, phone)
    if (validation || !lines.length) { setError(validation || 'At least one menu item is needed. Return to the menu to check your order.'); return }
    submitting.current = true
    setBusy(true)
    setError('')
    try {
      const isQr = localStorage.getItem('ilillii_table_source') === 'qr' || window.location.search.includes('source=qr')
      const source = isQr ? 'table_qr' : 'web_direct'
      const linePayload = lines.map(l => ({
        menuItemId: l.item.id,
        name: l.item.name,
        price: l.item.price,
        quantity: l.quantity,
        image: l.item.confirmedImage || '',
      }))

      let orderRes
      if (activeOrderId && appendToExisting) {
        orderRes = await api.addItemsToOrder(activeOrderId, linePayload, note)
      } else {
        orderRes = await api.createOrder({
          items: linePayload,
          type: 'Dine in',
          table: table || '1',
          customerName: name.trim(),
          customerPhone: phone.trim(),
          note,
          paymentTiming: 'post_pay',
          paymentMethod: 'Pay after eating',
          source,
        })
      }

      setBusy(false)
      submitting.current = false
      if (orderRes.success && orderRes.order) {
        localStorage.setItem('ilillii_active_order_id', orderRes.order.orderNumber)
        try {
          localStorage.setItem(
            'ilillii_customer',
            JSON.stringify({
              name: name.trim(),
              phone: phone.trim(),
              lastOrder: orderRes.order.orderNumber,
              table: orderRes.order.table || table,
              updatedAt: new Date().toISOString(),
            })
          )
          window.dispatchEvent(new CustomEvent('ilillii-auth-changed'))
        } catch (e) {}

        setSnapshot({
          reference: orderRes.order.orderNumber,
          table: orderRes.order.table || table || 'Table',
          name: orderRes.order.customerName || name.trim(),
          phone: orderRes.order.customerPhone || phone.trim(),
          note,
          lines: lines.map(line => ({ ...line })),
          total: orderRes.order.total,
        })
        setStep('confirmation')
      }
    } catch (err: any) {
      setBusy(false)
      submitting.current = false
      setError(err.message || 'Failed to place order with kitchen. Please try again.')
    }
  }

  const handleAddMoreDishes = () => {
    window.dispatchEvent(new CustomEvent('ilillii-clear-cart'))
    setSnapshot(null)
    setStep('details')
    close()
  }

  const currentIndex = step === 'details' ? 0 : 1
  return (
    <dialog ref={dialog} className="order-flow" aria-labelledby="order-page-title" onCancel={event => { event.preventDefault(); if (!busy) close() }}>
      <header className="order-nav">
        <div className="order-shell">
          <Logo />
          <div>
            <button className="order-lang" onClick={() => setModal('language')}>
              <Icon name="globe" size={17} />
              {language === 'om' ? 'Afaan Oromoo' : language === 'am' ? 'አማርኛ' : 'English'}
              <Icon name="down" size={13} />
            </button>
            <span className="table-badge">
              <Icon name="meal" size={15} />
              {snapshot?.table ? `Table ${snapshot.table}` : table ? `Table ${table}` : 'Dine In'}
            </span>
          </div>
        </div>
      </header>

      <div className="order-shell order-content">
        <button
          className="order-back"
          onClick={() => { if (busy) return; if (step === 'details' || confirmedView) close(); else go('details') }}
          disabled={busy}
        >
          <Icon name="arrow" size={16} />
          {confirmedView ? 'Back to menu' : step === 'details' ? 'Back to cart' : 'Back'}
        </button>

        {!confirmedView && (
          <ol className="checkout-progress" aria-label="Order progress">
            {['Your details', 'Review order'].map((label, index) => (
              <li
                key={label}
                className={index === currentIndex ? 'current' : index < currentIndex ? 'complete' : ''}
                aria-current={index === currentIndex ? 'step' : undefined}
              >
                <span>{index < currentIndex ? <Icon name="check" size={14} /> : index + 1}</span>
                {label}
              </li>
            ))}
          </ol>
        )}

        <div className="order-page-heading">
          <span className="eyebrow">{confirmedView ? 'GOOD FOOD. GREAT RESTAURANT.' : 'DINE IN · TABLE ORDER'}</span>
          <h1 id="order-page-title" ref={heading} tabIndex={-1}>
            {step === 'details' ? (
              <>A little about <span>you.</span></>
            ) : step === 'review' ? (
              <>One last <span>look.</span></>
            ) : step === 'confirmation' ? (
              <>Your order,<br /><span>all together.</span></>
            ) : (
              <>From our kitchen<br />to <span>your table.</span></>
            )}
          </h1>
        </div>

        <CompactCheckoutAmount subtotal={shownTotal} />

        <div className="order-layout">
          <div className="order-main-card">
            {confirmedView && snapshot && (
              <div className="checkout-status-pair">
                <StatusBadge type="Order" label={orderStages[stage]} />
              </div>
            )}

            {error && (
              <div className="order-error" role="alert" id="dine-form-error">
                <Icon name="info" size={20} />
                <div>
                  <strong>Let’s check before continuing.</strong>
                  <p>{error}</p>
                  <button onClick={() => setModal('help')}>Ask staff for help</button>
                </div>
              </div>
            )}

            {step === 'details' && (
              <form onSubmit={event => { event.preventDefault(); const validation = validateGuest(name, phone); setError(validation); if (!validation) go('review') }} noValidate>
                <div className="order-card-heading">
                  <span className="order-card-icon"><Icon name="heart" size={22} /></span>
                  <div><h2>Who’s joining us?</h2></div>
                </div>

                <label className="order-field">
                  Your name <span>Required</span>
                  <input
                    autoComplete="given-name"
                    maxLength={80}
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="The name staff can call you"
                    aria-invalid={Boolean(error && !name.trim())}
                    aria-describedby={error ? 'dine-form-error name-help' : 'name-help'}
                    required
                  />
                  <small id="name-help">So we know who this meal is for.</small>
                </label>

                <label className="order-field">
                  Phone number <span>Optional</span>
                  <input
                    type="tel"
                    aria-invalid={Boolean(error && error.toLowerCase().includes('phone'))}
                    aria-describedby={error ? 'dine-form-error' : undefined}
                    autoComplete="tel"
                    inputMode="tel"
                    value={phone}
                    maxLength={24}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="0909511588"
                  />
                  <small>For order coordination, if needed.</small>
                </label>

                <label className="order-field">
                  Anything we should know? <span>Optional</span>
                  <textarea
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    maxLength={500}
                    placeholder="Add a note for the kitchen"
                    rows={3}
                  />
                  <small>Let us know if you have any dietary preferences.</small>
                </label>

                <div className="order-buttons-group">
                  <button className="button primary order-full" type="submit">
                    Review your order<Icon name="arrow" size={18} />
                  </button>
                  <p className="order-privacy">
                    <Icon name="check" size={13} />Your order is sent directly to the kitchen staff.
                  </p>
                </div>
              </form>
            )}

            {step === 'review' && (
              <>
                <h2>Review order details</h2>
                <dl className="review-details">
                  <div><dt>Customer</dt><dd>{name}</dd></div>
                  <div><dt>Table</dt><dd>{table ? `Table ${table}` : 'Table Service'}</dd></div>
                  {phone && <div><dt>Phone</dt><dd>{phone}</dd></div>}
                  {activeOrderId && appendToExisting && (
                    <div><dt>Add to Active Order</dt><dd>#{activeOrderId}</dd></div>
                  )}
                  {note && <div><dt>Order note</dt><dd>{note}</dd></div>}
                </dl>

                <div className="order-buttons-group">
                  <button
                    className="button primary order-full"
                    onClick={submit}
                    disabled={busy || Boolean(snapshot)}
                    aria-busy={busy}
                  >
                    {busy ? <><span className="order-spinner" />Placing order…</> : 'Place Order'}
                    {!busy && <Icon name="arrow" size={18} />}
                  </button>
                  <p className="order-privacy"><Icon name="check" size={13} />Sent directly to kitchen.</p>
                  {error && <button className="continue-button" onClick={close}>Edit order without losing your cart</button>}
                </div>
              </>
            )}

            {confirmedView && snapshot && (
              <>
                <div className="order-success-icon"><Icon name="check" size={32} /></div>
                <div className="confirmation-intro">
                  <h2>{step === 'tracking' ? orderStages[stage] : 'Order Received!'}</h2>
                  <p>Your table order has been sent to the Ilillii Hotel kitchen.</p>
                  <strong className="order-reference">{snapshot.reference}</strong>
                  <span>{snapshot.table ? `Table ${snapshot.table}` : 'Dine In'} · {snapshot.name}</span>
                </div>

                <div className="order-buttons-group">
                  {step === 'tracking' ? (
                    <>
                      <ol className="order-timeline">
                        {orderStages.map((label, index) => (
                          <li key={label} className={index < stage ? 'done' : index === stage ? 'active' : ''} aria-current={index === stage ? 'step' : undefined}>
                            <span>{index < stage ? <Icon name="check" size={14} /> : index + 1}</span>
                            <div><strong>{label}</strong></div>
                          </li>
                        ))}
                      </ol>
                      <div className="status-refresh">
                        <p>{refreshed || 'Kitchen status updated.'}</p>
                        <button className="button secondary" onClick={() => setRefreshed(`Checked at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`)}>
                          Refresh status
                        </button>
                      </div>
                    </>
                  ) : (
                    <button className="button secondary order-full" onClick={() => go('tracking')}>
                      View order status<Icon name="arrow" size={18} />
                    </button>
                  )}

                  <button
                    className="button primary order-full"
                    style={{ background: '#b82032', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    onClick={handleAddMoreDishes}
                  >
                    <Icon name="plus" size={17} />
                    Add More Food / Order Additional Dishes
                  </button>

                  <a
                    href="tel:0909511588"
                    className="button secondary order-full"
                    style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', textDecoration: 'none' }}
                  >
                    <Icon name="phone" size={16} />Call Manager (0909511588)
                  </a>
                  <button className="continue-button" onClick={() => setModal('help')}>
                    Request staff assistance<Icon name="heart" size={16} />
                  </button>
                </div>
              </>
            )}
          </div>

          {!confirmedView && (
            <aside className="order-summary-card">
              <div className="summary-heading">
                <Icon name="bag" size={20} />
                <h2>Your meal</h2>
                {!locked && <button onClick={close}>Edit</button>}
              </div>
              <div className="summary-table">
                <span>{table ? `Table ${table}` : 'Table Service'}</span>
                <small>DINE IN</small>
              </div>
              <div className="summary-lines">
                {shownLines.map(line => (
                  <div key={line.item.id}>
                    <span>{line.quantity} ×</span>
                    <div>
                      <strong>{line.item.name}</strong>
                      <small>{formatBirr(line.item.price)} ETB each</small>
                    </div>
                    <b>{formatBirr(line.item.price * line.quantity)}</b>
                  </div>
                ))}
              </div>
              <div className="summary-subtotal">
                <span>Subtotal</span>
                <strong>{formatBirr(shownTotal)} ETB</strong>
              </div>
              <div className="summary-total">
                <span>Total</span>
                <strong>{formatBirr(shownTotal)} <small>ETB</small></strong>
              </div>
              {snapshot?.note && (
                <div className="summary-order-note">
                  <strong>Order note</strong>
                  <p>{snapshot.note}</p>
                </div>
              )}
              <div className="summary-assurance">
                <Icon name="heart" size={17} />
                <span>Your table. Your meal.<br />Enjoy your time at Ilillii.</span>
              </div>
            </aside>
          )}
        </div>

        <div className="order-bottom-help">
          <Icon name="info" size={16} />
          <span>Need a hand? Our team is available right at your table.</span>
          <button onClick={() => setModal('help')}>Ask for help</button>
        </div>
      </div>

      {open && modal && (
        <Modal title={modal === 'language' ? 'Feel at home.' : 'A little help, close by.'} close={() => setModal(null)}>
          {modal === 'language' ? (
            <div className="language-options">
              {languageOptions.map(option => (
                <button
                  className={`language-option ${language === option.id ? 'selected' : ''}`}
                  key={option.id}
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
          ) : (
            <p className="modal-description">
              Please ask a member of the team at your table for assistance. If a table number looks wrong, do not place the order until staff confirm it.
            </p>
          )}
        </Modal>
      )}
    </dialog>
  )
}
