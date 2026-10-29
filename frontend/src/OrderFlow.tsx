import { useEffect, useRef, useState } from 'react'
import { Icon, Logo, Modal, useDialog } from './shared-ui'
import { formatBirr } from './menu-data'
import type { MenuItem } from './menu-data'
import { orderStages, validateGuest } from './order-prototype'
import { api } from './api/client'
import { useLanguage, languageOptions } from './language'
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
  const [activeOrderId, setActiveOrderId] = useState<string | null>(() => {
    const storedActive = localStorage.getItem('ilillii_active_order_id')
    const storedTime = localStorage.getItem('ilillii_active_order_time')
    if (storedActive && storedTime) {
      const ageMs = Date.now() - Number(storedTime)
      const isExpired = ageMs > 2 * 60 * 60 * 1000 // 2 hours
      const isDifferentDay = new Date(Number(storedTime)).toDateString() !== new Date().toDateString()
      if (isExpired || isDifferentDay) {
        localStorage.removeItem('ilillii_active_order_id')
        localStorage.removeItem('ilillii_active_order_time')
        return null
      }
      return storedActive
    }
    if (storedActive && !storedTime) {
      localStorage.removeItem('ilillii_active_order_id')
      return null
    }
    return null
  })
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
      const storedTime = localStorage.getItem('ilillii_active_order_time')
      if (storedActive && storedTime) {
        const ageMs = Date.now() - Number(storedTime)
        if (ageMs > 2 * 60 * 60 * 1000 || new Date(Number(storedTime)).toDateString() !== new Date().toDateString()) {
          localStorage.removeItem('ilillii_active_order_id')
          localStorage.removeItem('ilillii_active_order_time')
          setActiveOrderId(null)
        } else {
          setActiveOrderId(storedActive)
        }
      } else {
        localStorage.removeItem('ilillii_active_order_id')
        setActiveOrderId(null)
      }
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
        localStorage.setItem('ilillii_active_order_time', Date.now().toString())
        try {
          const historyItem = {
            orderNumber: orderRes.order.orderNumber,
            date: new Date().toISOString(),
            total: orderRes.order.total,
            table: orderRes.order.table || table || '1',
            type: 'Dine in',
            items: linePayload.map(lp => ({ name: lp.name, quantity: lp.quantity, price: lp.price })),
            status: 'Submitted',
          }
          const prevHistory = JSON.parse(localStorage.getItem('ilillii_order_history') || '[]')
          const filtered = Array.isArray(prevHistory) ? prevHistory.filter((h: any) => h.orderNumber !== orderRes.order.orderNumber) : []
          localStorage.setItem('ilillii_order_history', JSON.stringify([historyItem, ...filtered].slice(0, 30)))
        } catch (e) {}

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

  const { t } = useLanguage()
  const currentIndex = step === 'details' ? 0 : 1
  return (
    <dialog ref={dialog} className="order-flow" aria-labelledby="order-page-title" onCancel={event => { event.preventDefault(); if (!busy) close() }}>
      <header className="order-nav">
        <div className="order-shell">
          <Logo />
          <div>
            <button type="button" className="order-lang" onClick={() => setModal('language')}>
              <Icon name="globe" size={16} />
              <span className="lang-code-pill">{language === 'om' ? 'Oro' : language === 'am' ? 'Amh' : 'Eng'}</span>
              <Icon name="down" size={11} />
            </button>
            <span className="table-badge">
              <Icon name="meal" size={15} />
              {snapshot?.table ? `${t('checkout.table')} ${snapshot.table}` : table ? `${t('checkout.table')} ${table}` : t('ways.dineIn')}
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
          {confirmedView ? t('order.backToMenu') : step === 'details' ? t('order.backToCart') : t('order.back')}
        </button>

        {!confirmedView && (
          <ol className="checkout-progress" aria-label="Order progress">
            {[t('checkout.detailsStep'), t('checkout.reviewStep')].map((label, index) => (
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
          <span className="eyebrow">{confirmedView ? t('order.goodFoodGreat') : t('order.dineInTableOrder')}</span>
          <h1 id="order-page-title" ref={heading} tabIndex={-1}>
            {step === 'details' ? (
              <>{t('order.stepAboutYou')}</>
            ) : step === 'review' ? (
              <>{t('order.stepOneLastLook')}</>
            ) : step === 'confirmation' ? (
              <>{t('order.stepAllTogether')}</>
            ) : (
              <>{t('order.stepKitchenToTable')}</>
            )}
          </h1>
        </div>

        <div className={`order-layout ${step === 'details' || confirmedView ? 'single-card' : ''}`}>
          <div className="order-main-card">
            {confirmedView && snapshot && (
              <div className="checkout-status-pair">
                <StatusBadge type="Order" label={t(`stage.${orderStages[stage]?.toLowerCase()}`, orderStages[stage])} />
              </div>
            )}

            {error && (
              <div className="order-error" role="alert" id="dine-form-error">
                <Icon name="info" size={20} />
                <div>
                  <strong>{t('order.letsCheck')}</strong>
                  <p>{error}</p>
                  <button onClick={() => setModal('help')}>{t('order.askForHelp')}</button>
                </div>
              </div>
            )}

            {step === 'details' && (
              <form onSubmit={event => { event.preventDefault(); const validation = validateGuest(name, phone); setError(validation); if (!validation) go('review') }} noValidate>
                <div className="order-card-heading">
                  <span className="order-card-icon"><Icon name="heart" size={22} /></span>
                  <div><h2>{t('checkout.whoJoining')}</h2></div>
                </div>

                <label className="order-field">
                  {t('checkout.nameLabel')} <span>{t('checkout.nameReq')}</span>
                  <input
                    autoComplete="given-name"
                    maxLength={80}
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder={t('checkout.namePlaceholder')}
                    aria-invalid={Boolean(error && !name.trim())}
                    aria-describedby={error ? 'dine-form-error name-help' : 'name-help'}
                    required
                  />
                  <small id="name-help">{t('checkout.nameHelp')}</small>
                </label>

                <label className="order-field">
                  {t('checkout.phoneLabel')} <span>{t('checkout.optional')}</span>
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
                  <small>{t('checkout.phoneHelp')}</small>
                </label>

                <label className="order-field">
                  {t('checkout.noteLabel')} <span>{t('checkout.optional')}</span>
                  <textarea
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    maxLength={500}
                    placeholder={t('checkout.notePlaceholder')}
                    rows={3}
                  />
                  <small>{t('checkout.noteHelp')}</small>
                </label>

                <div className="order-buttons-group">
                  <button className="button primary order-full" type="submit">
                    {t('checkout.reviewBtn')}<Icon name="arrow" size={18} />
                  </button>
                  <p className="order-privacy">
                    <Icon name="check" size={13} />{t('checkout.privacyNote')}
                  </p>
                </div>
              </form>
            )}

            {step === 'review' && (
              <>
                <h2>{t('checkout.reviewDetailsHeading')}</h2>
                <dl className="review-details">
                  <div><dt>{t('checkout.customer')}</dt><dd>{name}</dd></div>
                  <div><dt>{t('checkout.table')}</dt><dd>{table ? `${t('checkout.table')} ${table}` : t('checkout.tableService')}</dd></div>
                  {phone && <div><dt>{t('checkout.phone')}</dt><dd>{phone}</dd></div>}
                  {activeOrderId && (
                    <div style={{ gridColumn: '1 / -1', background: '#fdfbf7', border: '1px solid #ebdcd0', borderRadius: '10px', padding: '10px 12px', marginTop: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--color-brand)' }}>
                          {appendToExisting ? `${t('checkout.activeOrderNotice', undefined, { id: activeOrderId })}` : t('checkout.startSeparateBtn')}
                        </span>
                        <button
                          type="button"
                          style={{ background: 'none', border: 'none', color: '#b82032', fontSize: '12px', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
                          onClick={() => {
                            if (appendToExisting) {
                              setAppendToExisting(false)
                              setActiveOrderId(null)
                              localStorage.removeItem('ilillii_active_order_id')
                              localStorage.removeItem('ilillii_active_order_time')
                            } else {
                              setAppendToExisting(true)
                            }
                          }}
                        >
                          {appendToExisting ? t('checkout.startSeparateBtn') : t('checkout.appendToActiveBtn')}
                        </button>
                      </div>
                      <small style={{ color: '#78716c', fontSize: '11px', display: 'block' }}>
                        {appendToExisting ? t('checkout.appendExpl') : t('checkout.separateExpl')}
                      </small>
                    </div>
                  )}
                  {note && <div><dt>{t('cart.orderNote')}</dt><dd>{note}</dd></div>}
                </dl>

                <div className="order-buttons-group">
                  <button
                    className="button primary order-full"
                    onClick={submit}
                    disabled={busy || Boolean(snapshot)}
                    aria-busy={busy}
                  >
                    {busy ? <><span className="order-spinner" />{t('checkout.placingOrder')}</> : t('checkout.placeOrder')}
                    {!busy && <Icon name="arrow" size={18} />}
                  </button>
                  <p className="order-privacy"><Icon name="check" size={13} />{t('checkout.privacyNote')}</p>
                  {error && <button className="continue-button" onClick={close}>{t('order.editWithoutLosingCart')}</button>}
                </div>
              </>
            )}

            {confirmedView && snapshot && (
              <>
                <div className="order-success-icon"><Icon name="check" size={32} /></div>
                <div className="confirmation-intro">
                  <h2>{step === 'tracking' ? (orderStages[stage] ? t(`stage.${orderStages[stage].toLowerCase()}`, orderStages[stage]) : orderStages[stage]) : t('order.receivedHeading')}</h2>
                  <p>{t('order.receivedDesc')}</p>
                  <strong className="order-reference">{snapshot.reference}</strong>
                  <span>{snapshot.table ? `${t('checkout.table')} ${snapshot.table}` : t('ways.dineIn')} · {snapshot.name}</span>
                </div>

                <div className="order-buttons-group">
                  {step === 'tracking' ? (
                    <>
                      <ol className="order-timeline">
                        {orderStages.map((label, index) => (
                          <li key={label} className={index < stage ? 'done' : index === stage ? 'active' : ''} aria-current={index === stage ? 'step' : undefined}>
                            <span>{index < stage ? <Icon name="check" size={14} /> : index + 1}</span>
                            <div><strong>{t(`stage.${label.toLowerCase()}`, label)}</strong></div>
                          </li>
                        ))}
                      </ol>
                      <div className="status-refresh">
                        <p>{refreshed || t('order.statusUpdated')}</p>
                        <button className="button secondary" onClick={() => setRefreshed(t('order.checkedAt', undefined, { time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }))}>
                          {t('order.refreshStatus')}
                        </button>
                      </div>
                    </>
                  ) : (
                    <button className="button secondary order-full" onClick={() => go('tracking')}>
                      {t('order.viewStatus')}<Icon name="arrow" size={18} />
                    </button>
                  )}

                  <button
                    className="button primary order-full"
                    style={{ background: '#b82032', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    onClick={handleAddMoreDishes}
                  >
                    <Icon name="plus" size={17} />
                    {t('order.addMoreDishes')}
                  </button>

                  <button
                    type="button"
                    className="button secondary order-full"
                    style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                    onClick={() => {
                      close()
                      window.dispatchEvent(new CustomEvent('ilillii-open-history'))
                    }}
                  >
                    <Icon name="clock" size={16} />{t('order.viewPastOrders')}
                  </button>

                  <a
                    href="tel:0909511588"
                    className="button secondary order-full"
                    style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', textDecoration: 'none' }}
                  >
                    <Icon name="phone" size={16} />{t('order.callPhone')}
                  </a>
                  <button className="continue-button" onClick={() => setModal('help')}>
                    {t('order.requestHelp')}<Icon name="heart" size={16} />
                  </button>
                </div>
              </>
            )}
          </div>

          {step === 'review' && (
            <aside className="order-summary-card">
              <div className="summary-heading">
                <Icon name="bag" size={20} />
                <h2>{t('checkout.yourMeal')}</h2>
                {!locked && <button onClick={close}>{t('common.edit')}</button>}
              </div>
              <div className="summary-table">
                <span>{table ? `${t('checkout.table')} ${table}` : t('checkout.tableService')}</span>
                <small>{t('checkout.dineInBadge')}</small>
              </div>
              <div className="summary-lines">
                {shownLines.map(line => {
                  const displayName = language === 'am' && line.item.translations?.am
                    ? line.item.translations.am
                    : (language === 'om' && line.item.translations?.om ? line.item.translations.om : line.item.name)
                  return (
                    <div key={line.item.id}>
                      <span>{line.quantity} ×</span>
                      <div>
                        <strong>{displayName}</strong>
                      </div>
                      {shownLines.length > 1 && <b>{formatBirr(line.item.price * line.quantity)} ETB</b>}
                    </div>
                  )
                })}
              </div>
              <div className="summary-total">
                <span>{t('common.total')}</span>
                <strong>{formatBirr(shownTotal)} <small>ETB</small></strong>
              </div>
              {snapshot?.note && (
                <div className="summary-order-note">
                  <strong>{t('cart.orderNote')}</strong>
                  <p>{snapshot.note}</p>
                </div>
              )}
              <div className="summary-assurance">
                <Icon name="heart" size={17} />
                <span>{t('order.enjoyMeal')}</span>
              </div>
            </aside>
          )}
        </div>

        <div className="order-bottom-help">
          <Icon name="info" size={16} />
          <span>{t('order.needHand')}</span>
          <button onClick={() => setModal('help')}>{t('order.askForHelp')}</button>
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
