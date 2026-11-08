import { useEffect, useRef, useState } from 'react'
import { Icon, Logo, Modal, useDialog } from './shared-ui'
import { formatBirr } from './menu-data'
import type { MenuItem } from './menu-data'
import { validateGuest } from './order-prototype'
import { api } from './api/client'
import { useLanguage, languageOptions } from './language'
import './order.css'

type Line = { item: MenuItem; quantity: number }
type Step = 'details' | 'sheger' | 'confirmation'
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
  initialPayment?: 'pay_after' | 'sheger'
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
  const [copiedAccount, setCopiedAccount] = useState<string | null>(null)

  // Payo Gateway state
  const [payoTxnId, setPayoTxnId] = useState('')
  const [verifyingPayo, setVerifyingPayo] = useState(false)
  const [loadingPayoLink, setLoadingPayoLink] = useState(false)
  const [payoData, setPayoData] = useState<{ orderId: string; paymentUrl: string; expiresAt?: string } | null>(null)

  // Legacy fallback state
  const [shegerTxnId, setShegerTxnId] = useState('')
  const [verifyingSheger, setVerifyingSheger] = useState(false)

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
  const locked = busy || verifyingSheger || verifyingPayo || loadingPayoLink || Boolean(snapshot)
  const confirmedView = step === 'confirmation'

  // When dialog opens or closes, manage clean state
  useEffect(() => {
    if (open) {
      // If customer has items in cart, start fresh in details/sheger
      if (lines.length > 0) {
        setSnapshot(null)
      }
      setStep(initialPayment === 'sheger' ? 'sheger' : 'details')
      setError('')
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

      // Pre-fill customer details if previously saved (purge stale 0909511588)
      try {
        const saved = localStorage.getItem('ilillii_customer')
        if (saved) {
          const parsed = JSON.parse(saved)
          if (parsed.name && !name) setName(parsed.name)
          if (parsed.phone && parsed.phone !== '0909511588' && !phone) {
            setPhone(parsed.phone)
          } else if (parsed.phone === '0909511588') {
            parsed.phone = '0909511588'
            localStorage.setItem('ilillii_customer', JSON.stringify(parsed))
            setPhone('0909511588')
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

  const go = (next: Step) => {
    setError('')
    setStep(next)
  }

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

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedAccount(label)
      setTimeout(() => setCopiedAccount(null), 2500)
    } catch (e) { }
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

  // Option 2: Pay Now with Payo Ethiopian Gateway
  const handleStartPayo = async () => {
    if (!checkGuestValidation()) return
    setError('')
    go('sheger')
    setLoadingPayoLink(true)
    try {
      const desc = `Ilillii Order - ${name.trim() || 'Guest'} (${tableNum ? `Table ${tableNum}` : 'Direct'})`
      const res = await api.createPayoOrder(total, desc, activeOrderId || undefined)
      if (res && res.success && res.paymentUrl) {
        setPayoData({
          orderId: res.orderId,
          paymentUrl: res.paymentUrl,
          expiresAt: res.expiresAt,
        })
      }
    } catch (err: any) {
      console.warn('Payo order initialization notice:', err.message)
    } finally {
      setLoadingPayoLink(false)
    }
  }

  // Auto-polling for Payo payment completion
  useEffect(() => {
    if (step !== 'sheger' || !payoData?.orderId || Boolean(snapshot)) return
    let active = true

    const pollPayo = async () => {
      try {
        const res = await api.verifyPayoPayment(payoData.orderId, activeOrderId || undefined)
        if (!active) return
        if (res && (res.verified || ['paid', 'completed', 'approved'].includes((res.status || '').toLowerCase()))) {
          await handleCompleteWithVerifiedPayo(payoData.orderId)
        }
      } catch (e) {}
    }

    const timer = setInterval(pollPayo, 3500)
    return () => {
      active = false
      clearInterval(timer)
    }
  }, [step, payoData?.orderId, snapshot, lines, total, name, phone, tableNum, note])

  const handleCompleteWithVerifiedPayo = async (payoId: string) => {
    if (submitting.current) return
    submitting.current = true
    setBusy(true)

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

      const methodLabel = `Payo Verified (${payoId})`

      let orderRes
      if (activeOrderId) {
        try {
          const check = await api.getOrder(activeOrderId)
          if (check.success && check.order && !['completed', 'cancelled'].includes(check.order.status)) {
            orderRes = await api.addItemsToOrder(activeOrderId, linePayload, note)
          } else {
            localStorage.removeItem('ilillii_active_order_id')
            localStorage.removeItem('ilillii_active_order_time')
            setActiveOrderId(null)
          }
        } catch (e) {}
      }

      if (!orderRes) {
        orderRes = await api.createOrder({
          items: linePayload,
          type: 'Dine in',
          table: tableNum ? tableNum : undefined,
          customerName: name.trim(),
          customerPhone: phone.trim(),
          note,
          paymentTiming: 'pre_pay',
          paymentMethod: methodLabel,
          transactionId: payoId,
          source,
        })
      }

      setBusy(false)
      submitting.current = false
      if (orderRes.success && orderRes.order) {
        handleOrderSuccess(orderRes.order, methodLabel, payoId, true)
      }
    } catch (err: any) {
      setBusy(false)
      submitting.current = false
    }
  }

  const handleVerifyAndSubmitPayo = async () => {
    const cleanTxn = (payoTxnId || shegerTxnId).trim()
    if (!lines.length) {
      setError('At least one menu item is needed. Return to the menu to check your order.')
      return
    }

    setVerifyingPayo(true)
    setError('')

    try {
      let isVerified = false
      if (payoData?.orderId) {
        try {
          const verifyRes = await api.verifyPayoPayment(payoData.orderId, activeOrderId || undefined)
          if (verifyRes && (verifyRes.verified || ['paid', 'completed', 'approved'].includes((verifyRes.status || '').toLowerCase()))) {
            isVerified = true
          }
        } catch (e) {}
      }

      const isQr = isTableScanned
      const source = isQr ? 'table_qr' : (tableNum ? 'manual_table' : 'web_direct')
      const linePayload = lines.map(l => ({
        menuItemId: l.item.id,
        name: l.item.name,
        price: l.item.price,
        quantity: l.quantity,
        image: l.item.confirmedImage || '',
      }))

      const methodRef = cleanTxn || payoData?.orderId || 'Direct'
      const methodLabel = isVerified ? `Payo Verified (${methodRef})` : `Payo (${methodRef})`

      let orderRes
      if (activeOrderId) {
        try {
          const check = await api.getOrder(activeOrderId)
          if (check.success && check.order && !['completed', 'cancelled'].includes(check.order.status)) {
            orderRes = await api.addItemsToOrder(activeOrderId, linePayload, note)
          } else {
            localStorage.removeItem('ilillii_active_order_id')
            localStorage.removeItem('ilillii_active_order_time')
            setActiveOrderId(null)
          }
        } catch (e) {}
      }

      if (!orderRes) {
        orderRes = await api.createOrder({
          items: linePayload,
          type: 'Dine in',
          table: tableNum ? tableNum : undefined,
          customerName: name.trim(),
          customerPhone: phone.trim(),
          note,
          paymentTiming: 'pre_pay',
          paymentMethod: methodLabel,
          transactionId: methodRef,
          source,
        })
      }

      setVerifyingPayo(false)
      if (orderRes.success && orderRes.order) {
        handleOrderSuccess(orderRes.order, methodLabel, methodRef, isVerified)
      }
    } catch (err: any) {
      setVerifyingPayo(false)
      setError(err.message || 'Payment processing failed. Please verify or choose Pay after meal.')
    }
  }

  // Alias for backward compatibility
  const handleStartShegerPay = handleStartPayo
  const handleVerifyAndSubmitSheger = handleVerifyAndSubmitPayo

  const handleAddMoreDishes = () => {
    window.dispatchEvent(new CustomEvent('ilillii-clear-cart'))
    setSnapshot(null)
    setStep('details')
    close()
  }

  const handleClose = () => {
    if (busy || verifyingSheger) return
    setSnapshot(null)
    setStep('details')
    close()
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
            if (busy || verifyingSheger) return
            if (step === 'sheger') go('details')
            else handleClose()
          }}
          disabled={busy || verifyingSheger}
        >
          <Icon name="arrow" size={16} />
          {confirmedView
            ? t('order.backToMenu')
            : step === 'sheger'
              ? t('order.back')
              : t('order.backToCart')}
        </button>

        <div className="order-page-heading">
          <span className="eyebrow">
            {confirmedView ? t('order.goodFoodGreat') : t('order.dineInTableOrder')}
          </span>
          <h1 id="order-page-title" ref={heading} tabIndex={-1}>
            {step === 'details' ? (
              <>{t('checkout.whoJoining')}</>
            ) : step === 'sheger' ? (
              <>{t('checkout.shegerTitle')}</>
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
                  handlePlacePayAfterOrder()
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
                    placeholder="0909511588"
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

                {/* Payment Action Buttons */}
                <div className="order-buttons-group" style={{ gap: '12px', marginTop: '22px' }}>
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

                  <button
                    className="button secondary order-full payo-pay-btn"
                    type="button"
                    onClick={handleStartPayo}
                    disabled={locked}
                    style={{
                      background: '#ffffff',
                      borderColor: '#b82032',
                      color: '#b82032',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      fontWeight: 750,
                      minHeight: '48px',
                    }}
                  >
                    <span style={{ fontSize: '16px' }}>💳</span>
                    {t('checkout.payNowSheger')}
                  </button>
                </div>
              </form>
            )}

            {/* Step 2: Payo Payment Gateway Form */}
            {step === 'sheger' && (
              <div className="sheger-checkout-container">
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingBottom: '14px',
                    borderBottom: '1px solid #ebdcd3',
                    marginBottom: '18px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '22px' }}>💳</span>
                    <div>
                      <strong style={{ fontSize: '16px', color: 'var(--color-ink)', display: 'block' }}>
                        Payo Ethiopian Gateway
                      </strong>
                      <small style={{ fontSize: '11px', color: '#16a34a', fontWeight: 600 }}>
                        ● Live Auto-Verification Active
                      </small>
                    </div>
                  </div>
                  <strong style={{ fontSize: '18px', color: 'var(--color-brand)' }}>
                    {formatBirr(total)} ETB
                  </strong>
                </div>

                {/* Direct Payo Hosted Checkout Link */}
                {loadingPayoLink ? (
                  <div style={{ textAlign: 'center', padding: '16px', background: '#f8fafc', borderRadius: '10px', marginBottom: '16px', border: '1px solid #e2e8f0' }}>
                    <span className="order-spinner" style={{ margin: '0 auto 8px', borderColor: '#b82032 rgba(184,32,50,0.2) rgba(184,32,50,0.2)' }} />
                    <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, display: 'block' }}>
                      Connecting to Payo checkout...
                    </span>
                  </div>
                ) : payoData?.paymentUrl ? (
                  <div style={{ marginBottom: '16px' }}>
                    <a
                      href={payoData.paymentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px',
                        background: 'linear-gradient(135deg, #15803d 0%, #166534 100%)',
                        color: '#ffffff',
                        textDecoration: 'none',
                        padding: '14px 18px',
                        borderRadius: '10px',
                        fontWeight: 750,
                        fontSize: '14px',
                        boxShadow: '0 4px 14px rgba(21, 128, 61, 0.25)',
                        width: '100%',
                        boxSizing: 'border-box',
                      }}
                    >
                      <span>💳 Open Payo Payment Window</span>
                      <Icon name="arrow" size={16} />
                    </a>
                    <p style={{ margin: '6px 0 0', fontSize: '11px', color: '#15803d', textAlign: 'center', fontWeight: 500 }}>
                      ✓ Telebirr, CBE & Abyssinia supported. Auto-confirms order upon payment.
                    </p>
                  </div>
                ) : null}

                <p style={{ fontSize: '12px', color: '#57534e', lineHeight: 1.6, marginBottom: '14px' }}>
                  {t('checkout.shegerInstructions')}
                </p>

                {/* Bank / Telebirr Account Cards with 1-Click Copy */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                  {/* Commercial Bank of Ethiopia (CBE) */}
                  <div
                    style={{
                      background: '#fffaf5',
                      border: '1px solid #ebdcd3',
                      borderRadius: '8px',
                      padding: '12px 14px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <span style={{ fontSize: '10px', color: '#78716c', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        CBE
                      </span>
                      <strong style={{ display: 'block', fontSize: '15px', color: 'var(--color-ink)', marginTop: '2px' }}>
                        1000533856385
                      </strong>
                      <small style={{ fontSize: '11px', color: '#78716c' }}>
                        Abdisa Awel
                      </small>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard('1000533856385', 'cbe')}
                      style={{
                        background: copiedAccount === 'cbe' ? '#dcfce7' : '#ffffff',
                        color: copiedAccount === 'cbe' ? '#15803d' : '#1c1917',
                        border: '1px solid #d6d3d1',
                        borderRadius: '6px',
                        padding: '6px 12px',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                      }}
                    >
                      <Icon name="copy" size={13} />
                      {copiedAccount === 'cbe' ? t('checkout.copied') : 'Copy'}
                    </button>
                  </div>

                  {/* Telebirr Account */}
                  <div
                    style={{
                      background: '#f0fdf4',
                      border: '1px solid #bbf7d0',
                      borderRadius: '8px',
                      padding: '12px 14px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <span style={{ fontSize: '10px', color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Telebirr
                      </span>
                      <strong style={{ display: 'block', fontSize: '15px', color: '#14532d', marginTop: '2px' }}>
                        0909511588
                      </strong>
                      <small style={{ fontSize: '11px', color: '#15803d' }}>
                        Abdisa
                      </small>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard('0909511588', 'telebirr')}
                      style={{
                        background: copiedAccount === 'telebirr' ? '#dcfce7' : '#ffffff',
                        color: copiedAccount === 'telebirr' ? '#15803d' : '#1c1917',
                        border: '1px solid #bbf7d0',
                        borderRadius: '6px',
                        padding: '6px 12px',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                      }}
                    >
                      <Icon name="copy" size={13} />
                      {copiedAccount === 'telebirr' ? t('checkout.copied') : 'Copy'}
                    </button>
                  </div>
                </div>

                {/* Transaction ID Input (Optional if using Payo Link) */}
                <label className="order-field" style={{ marginBlock: '16px' }}>
                  {t('checkout.txnIdLabel')} <span>(Optional if using Payo Link)</span>
                  <input
                    value={payoTxnId || shegerTxnId}
                    onChange={e => {
                      setPayoTxnId(e.target.value)
                      setShegerTxnId(e.target.value)
                      if (error) setError('')
                    }}
                    placeholder={t('checkout.txnIdPlaceholder')}
                    style={{ fontSize: '14px', letterSpacing: '0.5px', fontFamily: 'monospace' }}
                  />
                  <small>
                    Enter your receipt or transaction number (e.g. FT26062K7WMY or Payo reference).
                  </small>
                </label>

                {/* Payo Verification & Submit Button */}
                <div className="order-buttons-group" style={{ gap: '10px', marginTop: '22px' }}>
                  <button
                    type="button"
                    className="button primary order-full"
                    onClick={handleVerifyAndSubmitPayo}
                    disabled={verifyingPayo}
                    aria-busy={verifyingPayo}
                    style={{ background: '#b82032', color: '#ffffff', minHeight: '48px' }}
                  >
                    {verifyingPayo ? (
                      <>
                        <span className="order-spinner" />
                        {t('checkout.verifyingSheger')}
                      </>
                    ) : (
                      <>
                        {t('checkout.verifyAndOrder')}
                        <Icon name="arrow" size={17} />
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    className="button secondary order-full"
                    onClick={() => go('details')}
                    disabled={verifyingPayo}
                    style={{ minHeight: '44px' }}
                  >
                    {t('order.back')}
                  </button>
                </div>
              </div>
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
                    href="tel:0909511588"
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
              wrong, staff will assist you right away. Phone: 0909511588.
            </p>
          )}
        </Modal>
      )}
    </dialog>
  )
}
