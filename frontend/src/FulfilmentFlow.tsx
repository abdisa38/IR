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
type Page = 'details' | 'review' | 'confirmation' | 'tracking'

export default function FulfilmentFlow({ open, entry = 'details', table, lines, note, setNote, close, language, setLanguage }: {
  open: boolean; entry?: 'method' | 'details'; table: string | null; lines: Line[]; note: string; setNote: (value: string) => void; close: () => void; language: string; setLanguage: (value: string) => void
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
  const [code, setCode] = useState('')
  const [lastUpdated, setLastUpdated] = useState('No live updates connected.')
  const [cancellation, setCancellation] = useState(false)
  const dialog = useRef<HTMLDialogElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const lock = useRef(false)
  const previousOpen = useRef(false)

  useEffect(() => {
    if (open && !previousOpen.current) {
      setPage(receipt ? 'tracking' : 'details')
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
            items: lines.map(l => ({ name: l.item.name, quantity: l.quantity, price: l.item.price })),
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

        window.dispatchEvent(new CustomEvent('ilillii-clear-cart'))
        setNote('')
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
  const { t } = useLanguage()
  const title = page === 'details' ? <>{t('order.stepAboutYou')}</> : page === 'review' ? <>{t('order.stepOneLastLook')}</> : page === 'confirmation' ? <>{t('order.stepAllTogether')}</> : <>{t('order.stepKitchenToTable')}</>
  return <dialog ref={dialog} className="order-flow" aria-labelledby="fulfilment-title" onCancel={event => { event.preventDefault(); if (!busy) close() }}>
    <header className="order-nav">
      <div className="order-shell">
        <Logo />
        <div>
          <button type="button" className="order-lang" onClick={() => setModal('language')}>
            <Icon name="globe" size={16} />
            <span className="lang-code-pill">{language === 'om' ? 'Oro' : language === 'am' ? 'Amh' : 'Eng'}</span>
            <Icon name="down" size={11} />
          </button>
          <span className="table-badge"><Icon name="bag" size={15} />{t('ways.pickup')}</span>
        </div>
      </div>
    </header>
    <div className="order-shell order-content">
      <div className="fulfilment-utility">
        <button className="order-back" disabled={busy} onClick={() => { if (isReceipt) { close(); } else if (page === 'details') { close(); window.dispatchEvent(new CustomEvent('ilillii-open-cart')); } else { go('details'); } }}>
          <Icon name="arrow" size={16} />{isReceipt ? t('order.backToMenu') : page === 'details' ? t('order.backToCart') : t('order.back')}
        </button>
        
      </div>
      <div className="order-page-heading">
        <span className="eyebrow">{t('brand.hotel')} · {t('announcement.location')}</span>
        <h1 ref={heading} tabIndex={-1} id="fulfilment-title">{title}</h1>
      </div>
      <div className="order-layout wide-main single-card">
        <div className="order-main-card">
          {error && <div className="order-error" role="alert" id="guest-form-error"><Icon name="info" size={20} /><div><strong>{t('order.letsCheck')}</strong><p>{error}</p></div></div>}
          {page === 'details' && (
            <form noValidate onSubmit={event => { event.preventDefault(); submit() }}>
              <div className="order-card-heading">
                <span className="order-card-icon"><Icon name="bag" size={23} /></span>
                <div><h2>{t('pickup.title')}</h2></div>
              </div>
              <div className="pickup-location">
                <Icon name="pin" size={22} />
                <div>
                  <strong>{t('pickup.locationTitle')}</strong>
                  <span>{t('pickup.locationSubtitle')}</span>
                  <small>{t('location.phoneTitle')}: 09511588</small>
                </div>
              </div>
              <label className="order-field">
                {t('checkout.nameLabel')} <span style={{ color: '#b82032', fontWeight: 700 }}>{t('checkout.nameReq')}</span>
                <input required aria-invalid={Boolean(error && !name.trim())} aria-describedby={error ? 'guest-form-error' : undefined} autoComplete="name" value={name} maxLength={80} onChange={event => setName(event.target.value)} placeholder={t('checkout.namePlaceholder')} />
              </label>
              <label className="order-field">
                {t('checkout.phoneLabel')} <span>{t('optional')}</span>
                <input aria-invalid={Boolean(error && error.toLowerCase().includes('phone'))} aria-describedby={error ? 'guest-form-error' : undefined} type="tel" inputMode="tel" autoComplete="tel" value={phone} maxLength={24} onChange={event => setPhone(event.target.value)} placeholder="09511588" />
                <small>{t('checkout.phoneHelp')}</small>
              </label>
              <label className="order-field">
                {t('cart.orderNote')} <span>{t('cart.optional')}</span>
                <textarea value={note} maxLength={500} onChange={event => setNote(event.target.value)} rows={3} placeholder={t('cart.notePlaceholder')} />
                <small>{t('checkout.noteHelp')}</small>
              </label>
              <button className="button primary order-full" type="submit" disabled={busy} aria-busy={busy}>
                {busy ? t('checkout.placingOrder') : t('checkout.placeOrder')}<Icon name="arrow" size={18} />
              </button>
            </form>
          )}
          {isReceipt && receipt && (
            <>
              <div className="order-success-icon"><Icon name="check" size={31} /></div>
              <div className="confirmation-intro">
                <h2>{t('order.receivedHeading')}</h2>
            
                <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-ink)', display: 'block', marginTop: '8px' }}>
                  {t('ways.pickup')} · {name || 'Guest'}
                </span>
              </div>
              <div className="order-buttons-group" style={{ marginTop: '24px', gap: '10px' }}>
                <button
                  className="button primary order-full"
                  style={{
                    background: '#b82032',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    minHeight: '48px',
                  }}
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('ilillii-clear-cart'))
                    setReceipt(null)
                    setPage('details')
                    close()
                  }}
                >
                  <Icon name="plus" size={17} />
                  {t('order.addMoreDishes')}
                </button>
                <button
                  type="button"
                  className="button secondary order-full"
                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', minHeight: '44px' }}
                  onClick={() => {
                    close()
                    window.dispatchEvent(new CustomEvent('ilillii-open-history'))
                  }}
                >
                  <Icon name="clock" size={16} />{t('order.viewPastOrders')}
                </button>
                <a href="tel:09511588" className="button secondary order-full" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', textDecoration: 'none', minHeight: '44px' }}>
                  <Icon name="phone" size={16} />{t('order.callPhone')}
                </a>
              </div>
            </>
          )}
          
        </div>
      </div>
    </div>
    {open && modal && <Modal title={modal === 'language' ? 'Choose Language / Qooqa Filadhaa' : modal === 'cancel' ? 'Order Cancellation' : 'Contact Ilillii Hotel'} close={() => setModal(null)}>{modal === 'language' ? <div className="language-options">{languageOptions.map(option => <button className={`language-option ${language === option.id ? 'selected' : ''}`} key={option.id} onClick={() => { setLanguage(option.id); setModal(null) }}><span>{option.native} — {option.label}</span><Icon name={language === option.id ? 'check' : 'globe'} /></button>)}</div> : modal === 'cancel' ? <><p className="modal-description">If you need to change or cancel your order, please call our team directly before kitchen preparation finishes.</p><a href="tel:09511588" className="button primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'none' }}><Icon name="phone" size={17} />Call 09511588</a></> : <><p className="modal-description">Ilillii Hotel is located around Awraris,Bale Robe. If you have any questions or need assistance, please call our team directly.</p><a href="tel:09511588" className="button primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'none' }}><Icon name="phone" size={17} />Call 09511588</a></>}</Modal>}
  </dialog>
}
