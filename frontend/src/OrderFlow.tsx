import { useEffect, useRef, useState } from 'react'
import { ChapaLogo, Icon, Logo, Modal, useDialog } from './shared-ui'
import { formatBirr } from './menu-data'
import type { MenuItem } from './menu-data'
import { validateGuest } from './order-prototype'
import { api } from './api/client'
import { useLanguage, languageOptions } from './language'
import './order.css'

type Line = { item: MenuItem; quantity: number }
type Step = 'details' | 'confirmation'
type Snapshot = {
  reference: string
  table: string
  name: string
  phone: string
  note: string
  lines: Line[]
  total: number
  paymentMethod: string
  transactionId?: string
  verified?: boolean
}

export default function OrderFlow({
  open,
  table,
  initialPayment = 'pay_after',
  lines,
  note,
  setNote,
  close,
  language,
  setLanguage,
}: {
  open: boolean
  table: string | null
  initialPayment?: 'pay_after' | 'sheger' | 'chapa'
  lines: Line[]
  note: string
  setNote: (value: string) => void
  close: () => void
  language: string
  setLanguage: (value: string) => void
}) {
  const [step, setStep] = useState<Step>('details')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null)
  const [modal, setModal] = useState<'language' | 'help' | 'table' | null>(null)
  // Chapa Gateway loading state
  const [loadingChapa, setLoadingChapa] = useState(false)

  // Table resolution - do not force Table 1 if not scanned/selected
  const resolvedTable = table || ''
  const [tableNum, setTableNum] = useState<string>(resolvedTable)
  const [isTableScanned, setIsTableScanned] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return Boolean(
      table &&
      (localStorage.getItem('ilillii_table_source') === 'qr' ||
        sessionStorage.getItem('ilillii_table_source') === 'qr' ||
        window.location.search.includes('source=qr'))
    )
  })

  const [activeOrderId, setActiveOrderId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null
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

  const submitting = useRef(false)
  const heading = useRef<HTMLHeadingElement>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)

  const total = lines.reduce((sum, line) => sum + line.item.price * line.quantity, 0)
  const locked = busy || loadingChapa || Boolean(snapshot)
  const confirmedView = step === 'confirmation'

  // When dialog opens or closes, manage clean state
  useEffect(() => {
    if (open) {
      // If customer has items in cart, start fresh in details/sheger
      if (lines.length > 0) {
        setSnapshot(null)
      }
      setStep('details')
      setError('')
      const storedActive = localStorage.getItem('ilillii_active_order_id')
      const storedTime = localStorage.getItem('ilillii_active_order_time')
      if (storedActive && storedTime) {
        const ageMs = Date.now() - Number(storedTime)
        if (ageMs <= 2 * 60 * 60 * 1000) {
          setActiveOrderId(storedActive)
        } else {
          setActiveOrderId(null)
        }
      } else {
        setActiveOrderId(null)
      }
      const curTable = table || ''
      setTableNum(curTable)
      setIsTableScanned(
        Boolean(
          curTable &&
          (localStorage.getItem('ilillii_table_source') === 'qr' ||
            sessionStorage.getItem('ilillii_table_source') === 'qr' ||
            window.location.search.includes('source=qr'))
        )
      )

      // Pre-fill customer details if previously saved
      try {
        const saved = localStorage.getItem('ilillii_customer')
        if (saved) {
          const parsed = JSON.parse(saved)
          if (parsed.name && !name) setName(parsed.name)
          if (parsed.phone && parsed.phone !== '09511588' && !phone) {
            setPhone(parsed.phone)
          }
        }
      } catch (e) { }
    } else {
      // Once closed, reset snapshot so next time customer orders it starts completely fresh
      setSnapshot(null)
      setStep('details')
      setModal(null)
    }
  }, [open, table, initialPayment])

  useDialog(dialog, open)

  useEffect(() => {
    if (open) {
      heading.current?.focus()
      dialog.current?.scrollTo(0, 0)
    }
  }, [open, step])

  useEffect(() => {
    if (error && open) {
      dialog.current?.querySelector('[role="alert"]')?.scrollIntoView({ block: 'center' })
    }
  }, [error, open])



  const checkGuestValidation = () => {
    if (!name || !name.trim()) {
      const msg = t('checkout.nameRequiredError') || 'Please enter your name so the kitchen staff know who this meal is for.'
      setError(msg)
      nameInputRef.current?.focus()
      return false
    }
    const val = validateGuest(name, phone)
    if (val) {
      setError(val)
      return false
    }
    return true
  }



  const handleOrderSuccess = (
    order: any,
    paymentMethod: string,
    transactionId?: string,
    verified?: boolean
  ) => {
    // 1. Clear cart immediately so the menu page subtotal floating bar is removed
    window.dispatchEvent(new CustomEvent('ilillii-clear-cart'))
    setNote('')

    const cleanNum = String(order.orderNumber).replace(/^IL-/, '')
    localStorage.setItem('ilillii_active_order_id', cleanNum)
    localStorage.setItem('ilillii_active_order_time', Date.now().toString())

    try {
      const allDishes = order.items && order.items.length > 0
        ? order.items.map((it: any) => ({ name: it.name, quantity: it.quantity, price: it.price }))
        : lines.map(l => ({ name: l.item.name, quantity: l.quantity, price: l.item.price }))

      const prevHistory = JSON.parse(localStorage.getItem('ilillii_order_history') || '[]')
      const existingIdx = Array.isArray(prevHistory)
        ? prevHistory.findIndex((h: any) => String(h.orderNumber).replace(/^IL-/, '') === cleanNum)
        : -1

      const historyItem = {
        orderNumber: cleanNum,
        date: order.createdAt || new Date().toISOString(),
        total: order.total,
        table: order.table || tableNum || '',
        type: order.type || 'Dine in',
        paymentMethod,
        transactionId,
        items: allDishes,
        status: order.status === 'completed' ? 'Completed' : 'Submitted',
      }

      let updatedHistory: any[]
      if (existingIdx !== -1) {
        updatedHistory = [...prevHistory]
        updatedHistory[existingIdx] = {
          ...updatedHistory[existingIdx],
          items: allDishes,
          total: order.total,
          status: order.status === 'completed' ? 'Completed' : updatedHistory[existingIdx].status || 'Submitted',
        }
      } else {
        const filtered = Array.isArray(prevHistory)
          ? prevHistory.filter((h: any) => String(h.orderNumber).replace(/^IL-/, '') !== cleanNum)
          : []
        updatedHistory = [historyItem, ...filtered]
      }

      localStorage.setItem('ilillii_order_history', JSON.stringify(updatedHistory.slice(0, 30)))
      window.dispatchEvent(new CustomEvent('ilillii-order-placed', { detail: historyItem }))
    } catch (e) { }

    try {
      localStorage.setItem(
        'ilillii_customer',
        JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          lastOrder: cleanNum,
          table: order.table || tableNum || '',
          updatedAt: new Date().toISOString(),
        })
      )
      window.dispatchEvent(new CustomEvent('ilillii-auth-changed'))
    } catch (e) { }

    setSnapshot({
      reference: cleanNum,
      table: order.table || tableNum || '',
      name: order.customerName || name.trim(),
      phone: order.customerPhone || phone.trim(),
      note,
      lines: lines.map(line => ({ ...line })),
      total: order.total,
      paymentMethod,
      transactionId,
      verified,
    })

    setStep('confirmation')
  }

  // Option 1: Order Now (Pay After Meal)
  const handlePlacePayAfterOrder = async () => {
    if (!checkGuestValidation() || submitting.current || snapshot) return
    if (!lines.length) {
      setError('At least one menu item is needed. Return to the menu to check your order.')
      return
    }

    submitting.current = true
    setBusy(true)
    setError('')

    try {
      const isQr = isTableScanned
      const source = isQr ? 'table_qr' : (tableNum ? 'manual_table' : 'web_direct')
      const linePayload = lines.map(l => ({
        menuItemId: l.item.id,
        name: l.item.name,
        price: l.item.price,
        quantity: l.quantity,
        image: l.item.confirmedImage || '',
      }))

      let orderRes
      if (activeOrderId) {
        try {
          const check = await api.getOrder(activeOrderId)
          if (check.success && check.order && !['completed', 'cancelled'].includes(check.order.status)) {
            // Still active! Add additional food to existing order
            orderRes = await api.addItemsToOrder(activeOrderId, linePayload, note)
          } else {
            // Finished or cancelled, clear activeOrderId
            localStorage.removeItem('ilillii_active_order_id')
            localStorage.removeItem('ilillii_active_order_time')
            setActiveOrderId(null)
          }
        } catch (e) {
          // If order not found, fallback to fresh order
        }
      }

      if (!orderRes) {
        orderRes = await api.createOrder({
          items: linePayload,
          type: 'Dine in',
          table: tableNum ? tableNum : undefined,
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
        handleOrderSuccess(orderRes.order, 'Pay after eating')
      }
    } catch (err: any) {
      setBusy(false)
      submitting.current = false
      setError(err.message || 'Failed to place order with kitchen. Please try again.')
    }
  }

  const handleNameChange = (val: string) => {
    setName(val)
    if (error && val.trim()) setError('')
    try {
      const existing = JSON.parse(localStorage.getItem('ilillii_customer') || '{}')
      const updated = {
        ...existing,
        name: val.trim(),
        id: existing.id || 'guest_' + Math.random().toString(36).substring(2, 10),
        updatedAt: new Date().toISOString(),
      }
      localStorage.setItem('ilillii_customer', JSON.stringify(updated))
      window.dispatchEvent(new CustomEvent('ilillii-auth-changed'))
    } catch (e) {}
  }

  const handlePhoneChange = (val: string) => {
    setPhone(val)
    try {
      const existing = JSON.parse(localStorage.getItem('ilillii_customer') || '{}')
      const updated = {
        ...existing,
        phone: val.trim(),
        id: existing.id || 'guest_' + Math.random().toString(36).substring(2, 10),
        updatedAt: new Date().toISOString(),
      }
      localStorage.setItem('ilillii_customer', JSON.stringify(updated))
      window.dispatchEvent(new CustomEvent('ilillii-auth-changed'))
    } catch (e) {}
  }

  // Option 2: Pay Now with Chapa - Direct Hosted Checkout
  const handleStartChapa = async () => {
    if (!checkGuestValidation()) return
    setError('')
    setLoadingChapa(true)

    try {
      const isQr = isTableScanned
      const source = isQr ? 'table_qr' : (tableNum ? 'manual_table' : 'web_direct')
      const linePayload = lines.map(l => ({
        menuItemId: l.item.id,
        name: l.item.name,
        price: l.item.price,
        quantity: l.quantity,
        image: l.item.confirmedImage || '',
      }))

      let ourOrder
      if (activeOrderId) {
        try {
          const check = await api.getOrder(activeOrderId)
          if (check.success && check.order && !['completed', 'cancelled'].includes(check.order.status)) {
            const addRes = await api.addItemsToOrder(activeOrderId, linePayload, note)
            if (addRes.success && addRes.order) ourOrder = addRes.order
          }
        } catch (e) {}
      }

      if (!ourOrder) {
        const createRes = await api.createOrder({
          items: linePayload,
          type: 'Dine in',
          table: tableNum ? tableNum : undefined,
          customerName: name.trim(),
          customerPhone: phone.trim(),
          note,
          paymentTiming: 'pre_pay',
          paymentMethod: 'Chapa',
          source,
        })
        if (createRes.success && createRes.order) ourOrder = createRes.order
      }

      const cleanNum = ourOrder ? String(ourOrder.orderNumber).replace(/^IL-/, '') : activeOrderId || undefined

      // Persist customer details and active order
      try {
        localStorage.setItem('ilillii_customer', JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          lastOrder: cleanNum,
          table: tableNum || '',
          updatedAt: new Date().toISOString(),
        }))
        if (cleanNum) {
          localStorage.setItem('ilillii_active_order_id', cleanNum)
          localStorage.setItem('ilillii_active_order_time', Date.now().toString())
        }
        window.dispatchEvent(new CustomEvent('ilillii-clear-cart'))
        window.dispatchEvent(new CustomEvent('ilillii-auth-changed'))
      } catch (e) {}

      // Call Chapa initialize
      const returnUrl = `${window.location.origin}/#profile`
      const res = await api.createChapaOrder({
        amount: total,
        email: 'guest@ilillii.com',
        firstName: name.trim() || 'Guest',
        lastName: 'Customer',
        phone: phone.trim() || '09511588',
        orderId: cleanNum,
        returnUrl,
      })

      if (res && res.success && res.checkoutUrl) {
        // Direct browser redirect to Chapa's official hosted checkout
        window.location.href = res.checkoutUrl
        return
      } else {
        throw new Error('Unable to start Chapa checkout session.')
      }
    } catch (err: any) {
      setLoadingChapa(false)
      setError(err.message || 'Chapa connection failed. Please choose Pay after meal.')
    }
  }

  const handleAddMoreDishes = () => {
    window.dispatchEvent(new CustomEvent('ilillii-clear-cart'))
    setSnapshot(null)
    setStep('details')
    close()
  }

  const handleClose = () => {
    if (busy || loadingChapa) return
    const wasConfirmed = step === 'confirmation' || Boolean(snapshot)
    setSnapshot(null)
    setStep('details')
    close()
    if (!wasConfirmed) {
      window.dispatchEvent(new CustomEvent('ilillii-open-cart'))
    }
  }

  const { t } = useLanguage()

  return (
    <dialog
      ref={dialog}
      className="order-flow"
      aria-labelledby="order-page-title"
      onCancel={event => {
        event.preventDefault()
        handleClose()
      }}
    >
      <header className="order-nav">
        <div className="order-shell">
          <Logo />
          <div>
            <button type="button" className="order-lang" onClick={() => setModal('language')}>
              <Icon name="globe" size={16} />
              <span className="lang-code-pill">
                {language === 'om' ? 'Oro' : language === 'am' ? 'Amh' : 'Eng'}
              </span>
              <Icon name="down" size={11} />
            </button>
            <span
              className="table-badge"
              style={
                isTableScanned
                  ? { background: '#dcfce7', color: '#15803d', borderColor: '#bbf7d0', fontWeight: 700 }
                  : {}
              }
            >
              <Icon name="meal" size={15} />
              {snapshot?.table
                ? `${t('checkout.table')} ${snapshot.table}`
                : tableNum
                  ? `${t('checkout.table')} ${tableNum}`
                  : 'Direct Order'}
              {isTableScanned && <small style={{ color: '#16a34a' }}>· QR</small>}
            </span>
          </div>
        </div>
      </header>

      <div className="order-shell order-content">
        <button
          className="order-back"
          onClick={() => {
            if (busy) return
            handleClose()
          }}
          disabled={busy}
        >
          <Icon name="arrow" size={16} />
          {confirmedView
            ? t('order.backToMenu')
            : t('order.backToCart')}
        </button>

        <div className="order-page-heading">
          <span className="eyebrow">
            {confirmedView ? t('order.goodFoodGreat') : t('order.dineInTableOrder')}
          </span>
          <h1 id="order-page-title" ref={heading} tabIndex={-1}>
            {step === 'details' ? (
              <>{t('checkout.whoJoining')}</>
            ) : (
              <>{t('order.stepAllTogether')}</>
            )}
          </h1>
        </div>

        {/* Clean, spacious centered card without compacted side cards */}
        <div className="order-layout single-card">
          <div className="order-main-card">
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

            {/* Step 1: Details & Instant Payment Choice */}
            {step === 'details' && (
              <form
                onSubmit={event => {
                  event.preventDefault()
                  if (initialPayment === 'chapa' || initialPayment === 'sheger') {
                    handleStartChapa()
                  } else {
                    handlePlacePayAfterOrder()
                  }
                }}
              >
                {/* Real Table Display */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: isTableScanned ? '#f0fdf4' : tableNum ? '#fffaf5' : '#f8fafc',
                    border: isTableScanned ? '1.5px solid #bbf7d0' : tableNum ? '1.5px solid #ebdcd3' : '1.5px solid #cbd5e1',
                    borderRadius: '10px',
                    padding: '12px 16px',
                    marginBottom: '20px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: isTableScanned ? '#dcfce7' : tableNum ? '#fcedea' : '#e2e8f0',
                        color: isTableScanned ? '#15803d' : tableNum ? 'var(--color-brand)' : '#475569',
                        display: 'grid',
                        placeItems: 'center',
                      }}
                    >
                      <Icon name="meal" size={18} />
                    </div>
                    <div>
                      <strong style={{ fontSize: '14px', color: 'var(--color-ink)' }}>
                        {tableNum ? `${t('checkout.table')} ${tableNum}` : 'choose table number'}
                      </strong>
                      <small
                        style={{
                          display: 'block',
                          fontSize: '11px',
                          color: isTableScanned ? '#15803d' : tableNum ? '#78716c' : '#64748b',
                          fontWeight: isTableScanned ? 600 : 400,
                        }}
                      >
                        {isTableScanned
                          ? `${t('checkout.table')} ${tableNum} · ${t('qr.scannedBadge', undefined, { table: tableNum })}`
                          : tableNum
                            ? `${t('checkout.table')} ${tableNum} · Dine-in Table`
                            : ''}
                      </small>
                    </div>
                  </div>
                  <button
                    type="button"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--color-brand)',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textDecoration: 'underline',
                    }}
                    onClick={() => setModal('table')}
                  >
                    {tableNum ? t('common.edit') : 'Select Table'}
                  </button>
                </div>

                {/* Name Field (REQUIRED) */}
                <label className="order-field">
                  {t('checkout.nameLabel')} <span style={{ color: '#b82032', fontWeight: 700 }}>{t('checkout.nameReq')}</span>
                  <input
                    ref={nameInputRef}
                    name="customerName"
                    autoComplete="given-name"
                    maxLength={80}
                    value={name}
                    onChange={e => handleNameChange(e.target.value)}
                    placeholder="Your name"
                    aria-invalid={Boolean(error && !name.trim())}
                    aria-describedby={error ? 'dine-form-error name-help' : 'name-help'}
                    required
                    style={error && !name.trim() ? { borderColor: '#b82032', backgroundColor: '#fff5f5' } : {}}
                  />
                  <small id="name-help">{t('checkout.nameHelp')}</small>
                </label>

                {/* Phone Field (Optional) */}
                <label className="order-field">
                  {t('checkout.phoneLabel')} <span>({t('optional') || 'Optional'})</span>
                  <input
                    type="tel"
                    aria-invalid={Boolean(error && error.toLowerCase().includes('phone'))}
                    aria-describedby={error ? 'dine-form-error' : undefined}
                    autoComplete="tel"
                    inputMode="tel"
                    value={phone}
                    maxLength={24}
                    onChange={e => handlePhoneChange(e.target.value)}
                    placeholder="09511588"
                  />
                  <small>{t('checkout.phoneHelp')}</small>
                </label>

                {/* Kitchen Note Field (Optional) */}
                <label className="order-field">
                  {t('checkout.noteLabel')} <span>({t('optional') || 'Optional'})</span>
                  <textarea
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    maxLength={500}
                    placeholder="Note for kitchen (optional)"
                    rows={2}
                  />
                </label>

                {/* Single Payment Action Button (based on selection in cart) */}
                <div className="order-buttons-group" style={{ gap: '12px', marginTop: '22px' }}>
                  {(initialPayment === 'chapa' || initialPayment === 'sheger') ? (
                    <button
                      className="button primary order-full chapa-pay-btn"
                      type="submit"
                      disabled={locked}
                      aria-busy={loadingChapa || busy}
                      style={{
                        background: '#b82032',
                        borderColor: '#981827',
                        color: '#ffffff',
                        boxShadow: '0 4px 14px rgba(184,32,50,0.25)',
                        minHeight: '48px',
                        fontWeight: 750,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                      }}
                    >
                      {loadingChapa || busy ? (
                        <>
                          <span className="order-spinner" />
                          Connecting...
                        </>
                      ) : (
                        <>
                          <ChapaLogo size={19} />
                          Pay with Chapa ({formatBirr(total)} ETB)
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      className="button primary order-full pay-after-btn"
                      type="submit"
                      disabled={locked}
                      aria-busy={busy}
                      style={{
                        background: '#b82032',
                        borderColor: '#981827',
                        color: '#ffffff',
                        boxShadow: '0 4px 14px rgba(184,32,50,0.25)',
                        minHeight: '48px',
                        fontWeight: 750,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                      }}
                    >
                      {busy ? (
                        <>
                          <span className="order-spinner" />
                          {t('checkout.placingOrder')}
                        </>
                      ) : (
                        <>
                          {activeOrderId ? `+ Add to Order #${String(activeOrderId).replace(/^IL-/, '')}` : t('checkout.orderPayAfterMeal')}
                        </>
                      )}
                    </button>
                  )}
                </div>
              </form>
            )}



            {/* Step 3: Order Received Confirmation View (Clean layout) */}
            {confirmedView && snapshot && (
              <>
                <div className="order-success-icon">
                  <Icon name="check" size={32} />
                </div>

                <div className="confirmation-intro">
                  <h2>{t('order.receivedHeading')}</h2>
                  <p>{t('')}</p>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-ink)', display: 'block', marginTop: '4px' }}>
                    {snapshot.table ? `${t('checkout.table')} ${snapshot.table}` : 'Direct Order'} · {snapshot.name}
                  </span>
                  {snapshot.paymentMethod && (
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: snapshot.transactionId ? '#dcfce7' : '#fef3c7',
                        color: snapshot.transactionId ? '#15803d' : '#92400e',
                        padding: '5px 12px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 700,
                        marginTop: '12px',
                      }}
                    >
                      <Icon name="check" size={13} />
                      {snapshot.transactionId
                        ? `${t('checkout.paidViaSheger')} · ${snapshot.transactionId}`
                        : snapshot.paymentMethod}
                    </div>
                  )}
                </div>

                <div className="order-buttons-group" style={{ marginTop: '26px', gap: '10px' }}>
                  <button
                    className="button primary order-full"
                    style={{
                      background: '#b82032',
                      borderColor: '#981827',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      minHeight: '46px',
                      fontWeight: 700,
                    }}
                    onClick={handleAddMoreDishes}
                  >
                    <Icon name="plus" size={17} />
                    {t('order.addMoreDishes')}
                  </button>

                  <button
                    type="button"
                    className="button secondary order-full"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      minHeight: '44px',
                    }}
                    onClick={() => {
                      handleClose()
                      window.dispatchEvent(new CustomEvent('ilillii-open-history'))
                    }}
                  >
                    <Icon name="clock" size={16} />
                    {t('order.viewPastOrders')}
                  </button>

                  <a
                    href="tel:09511588"
                    className="button secondary order-full"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      textDecoration: 'none',
                      minHeight: '44px',
                    }}
                  >
                    <Icon name="phone" size={16} />
                    {t('order.callPhone')}
                  </a>

                  <button className="continue-button" onClick={() => setModal('help')}>
                    {t('order.requestHelp')}
                    <Icon name="heart" size={16} />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="order-bottom-help">
          <Icon name="info" size={16} />
          <span>{t('order.needHand')}</span>
          <button onClick={() => setModal('help')}>{t('order.askForHelp')}</button>
        </div>
      </div>

      {/* Table Change Modal */}
      {open && modal === 'table' && (
        <Modal title={t('qr.selectTable')} close={() => setModal(null)}>
          <p className="modal-description" style={{ marginBottom: '16px' }}>
            Choose your table number:
          </p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              gap: '8px',
              marginBottom: '16px',
              maxHeight: '280px',
              overflowY: 'auto',
              padding: '2px',
            }}
          >
            {Array.from({ length: 30 }, (_, i) => String(i + 1)).map(num => (
              <button
                key={num}
                type="button"
                className={`button ${tableNum === num ? 'primary' : 'secondary'}`}
                style={{ minHeight: '44px', fontWeight: 750, fontSize: '14px', padding: '4px' }}
                onClick={() => {
                  setTableNum(num)
                  setIsTableScanned(false)
                  localStorage.setItem('ilillii_table', num)
                  sessionStorage.setItem('ilillii_table', num)
                  setModal(null)
                }}
              >
                {num}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="button secondary order-full"
            style={{ minHeight: '42px', width: '100%' }}
            onClick={() => {
              setTableNum('')
              setIsTableScanned(false)
              localStorage.removeItem('ilillii_table')
              sessionStorage.removeItem('ilillii_table')
              setModal(null)
            }}
          >
            No Table (Direct Order)
          </button>
        </Modal>
      )}

      {/* Language / Help Modal */}
      {open && modal && modal !== 'table' && (
        <Modal
          title={modal === 'language' ? 'Feel at home.' : 'A little help, close by.'}
          close={() => setModal(null)}
        >
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
                  <span>
                    {option.native} — {option.label}
                  </span>
                  <Icon name={language === option.id ? 'check' : 'globe'} />
                </button>
              ))}
            </div>
          ) : (
            <p className="modal-description">
              Please ask a member of the team at your table for assistance. If a table number looks
              wrong, staff will assist you right away. Phone: 09511588.
            </p>
          )}
        </Modal>
      )}
    </dialog>
  )
}
