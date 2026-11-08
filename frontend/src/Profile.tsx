import { useState, useEffect, useRef } from 'react'
import { GlobalHeader, GlobalFooter } from './LocationComponents'
import { Icon } from './shared-ui'
import { SiteLink } from './site-routing'
import { api } from './api/client'
import './profile.css'

interface OrderItem {
  name: string
  quantity: number
  price: number
}

interface OrderRecord {
  _id?: string
  orderNumber: string
  date?: string
  createdAt?: string
  total: number
  table?: string
  type?: string
  status?: string
  paymentMethod?: string
  items: OrderItem[]
}

export default function Profile() {
  const [customer, setCustomer] = useState<{ name?: string; phone?: string; id?: string } | null>(() => {
    try {
      const saved = localStorage.getItem('ilillii_customer')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed && (parsed.name || parsed.phone)) return parsed
      }
    } catch {}
    return null
  })

  const [orders, setOrders] = useState<OrderRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<'all' | 'active' | 'completed'>('all')

  // Edit state
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(customer?.name || '')
  const [editPhone, setEditPhone] = useState(customer?.phone || '')

  const customerRef = useRef(customer)
  customerRef.current = customer

  // Normalize phone for matching
  const matchPhone = (a?: string, b?: string) => {
    if (!a || !b) return false
    const dA = a.replace(/\D/g, '').slice(-9)
    const dB = b.replace(/\D/g, '').slice(-9)
    return Boolean(dA && dB && dA === dB)
  }

  // Load orders cleanly without blinking
  const fetchOrders = async (silent = false) => {
    if (!silent) setLoading(true)
    const currentCust = customerRef.current
    const localMap = new Map<string, OrderRecord>()

    // 1. Read local order history, but ONLY include orders that belong to this customer
    try {
      const localHist = localStorage.getItem('ilillii_order_history')
      if (localHist) {
        const parsed: any[] = JSON.parse(localHist)
        if (Array.isArray(parsed)) {
          for (const ord of parsed) {
            const key = String(ord.orderNumber || ord._id || '').replace(/^IL-/, '')
            if (!key) continue

            // Verify order belongs to this customer
            const activeId = localStorage.getItem('ilillii_active_order_id')
            const matchesActive = activeId && key === activeId
            const matchesPhone = currentCust?.phone && matchPhone(ord.phone || ord.customerPhone, currentCust.phone)
            const matchesName = currentCust?.name && ord.name && ord.name.toLowerCase() === currentCust.name.toLowerCase()

            if (matchesActive || matchesPhone || matchesName || !currentCust) {
              localMap.set(key, {
                _id: ord._id,
                orderNumber: ord.orderNumber || key,
                total: Number(ord.total) || 0,
                table: ord.table,
                type: ord.type || 'Dine in',
                status: ord.status || 'Submitted',
                paymentMethod: ord.paymentMethod,
                createdAt: ord.date || ord.createdAt,
                date: ord.date || ord.createdAt,
                items: Array.isArray(ord.items)
                  ? ord.items.map((it: any) => ({
                      name: it.name,
                      quantity: Number(it.quantity) || 1,
                      price: Number(it.price) || 0,
                    }))
                  : [],
              })
            }
          }
        }
      }
    } catch {}

    // 2. Fetch real orders from database
    if (currentCust && (currentCust.phone || currentCust.name)) {
      try {
        const res = await api.getOrders({
          phone: currentCust.phone || undefined,
          customer: currentCust.name || undefined,
          limit: 50,
        })
        if (res && res.success && Array.isArray(res.orders)) {
          for (const ord of res.orders) {
            const key = String(ord.orderNumber || ord._id || '').replace(/^IL-/, '')
            if (key) {
              localMap.set(key, {
                _id: ord._id,
                orderNumber: ord.orderNumber || key,
                total: ord.total,
                table: ord.table,
                type: ord.type,
                status: ord.status,
                paymentMethod: ord.paymentMethod,
                createdAt: ord.createdAt,
                date: ord.createdAt,
                items: Array.isArray(ord.items)
                  ? ord.items.map((it: any) => ({
                      name: it.name,
                      quantity: Number(it.quantity) || 1,
                      price: Number(it.price) || 0,
                    }))
                  : [],
              })
            }
          }
        }
      } catch {}
    }

    const merged = Array.from(localMap.values()).sort((a, b) => {
      const tA = new Date(a.createdAt || a.date || 0).getTime()
      const tB = new Date(b.createdAt || b.date || 0).getTime()
      return tB - tA
    })

    setOrders(merged)
    if (!silent) setLoading(false)
  }

  useEffect(() => {
    fetchOrders(false)

    // Polling for admin status updates (e.g. kitchen updates status to Preparing, Ready, Completed)
    const pollInterval = setInterval(() => {
      fetchOrders(true)
    }, 6000)

    const handleAuth = () => {
      try {
        const saved = localStorage.getItem('ilillii_customer')
        if (saved) {
          const parsed = JSON.parse(saved)
          setCustomer(parsed)
          setEditName(parsed.name || '')
          setEditPhone(parsed.phone || '')
        } else {
          setCustomer(null)
          setEditName('')
          setEditPhone('')
        }
      } catch {}
      fetchOrders(false)
    }

    const handleOrderPlaced = () => {
      fetchOrders(false)
    }

    window.addEventListener('ilillii-auth-changed', handleAuth)
    window.addEventListener('ilillii-order-placed', handleOrderPlaced)
    return () => {
      clearInterval(pollInterval)
      window.removeEventListener('ilillii-auth-changed', handleAuth)
      window.removeEventListener('ilillii-order-placed', handleOrderPlaced)
    }
  }, [])

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault()
    const cleanName = editName.trim()
    const cleanPhone = editPhone.trim()

    const updated = {
      ...(customer || {}),
      name: cleanName,
      phone: cleanPhone,
      id: customer?.id || 'cust_' + Math.random().toString(36).substring(2, 10),
      updatedAt: new Date().toISOString(),
    }

    localStorage.setItem('ilillii_customer', JSON.stringify(updated))
    setCustomer(updated)
    setIsEditing(false)
    window.dispatchEvent(new CustomEvent('ilillii-auth-changed'))
    fetchOrders(false)
  }

  // Logout function
  const handleLogout = () => {
    if (window.confirm('Log out from your profile?')) {
      localStorage.removeItem('ilillii_customer')
      localStorage.removeItem('ilillii_active_order_id')
      localStorage.removeItem('ilillii_active_order_time')
      localStorage.removeItem('ilillii_order_history')
      setCustomer(null)
      setOrders([])
      setIsEditing(false)
      window.dispatchEvent(new CustomEvent('ilillii-auth-changed'))
      window.location.hash = '#home'
    }
  }

  // Active in-progress order
  const activeOrder = orders.find(ord => {
    const st = (ord.status || '').toLowerCase()
    return ['submitted', 'pending', 'accepted', 'preparing', 'cooking', 'ready', 'ready to serve'].includes(st)
  })

  // Stepper helper
  const getStepIndex = (status?: string) => {
    const s = (status || '').toLowerCase()
    if (s.includes('ready')) return 3
    if (s.includes('cook') || s.includes('prep')) return 2
    if (s.includes('accept')) return 1
    return 0
  }

  // Filtered orders
  const activeOrders = orders.filter(ord => {
    const st = (ord.status || '').toLowerCase()
    return ['submitted', 'pending', 'accepted', 'preparing', 'cooking', 'ready', 'ready to serve'].includes(st)
  })

  const completedOrders = orders.filter(ord => {
    const st = (ord.status || '').toLowerCase()
    return ['completed', 'served'].includes(st)
  })

  const displayedOrders = tab === 'active' ? activeOrders : tab === 'completed' ? completedOrders : orders
  const totalSpent = orders.reduce((sum, ord) => sum + (ord.total || 0), 0)
  const formatBirr = (num: number) => num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Today'
    try {
      const d = new Date(dateStr)
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    } catch {
      return 'Recent'
    }
  }

  return (
    <div className="profile-page">
      <GlobalHeader active="profile" />

      <main className="profile-container">
        {/* Breadcrumb */}
        <nav className="profile-breadcrumb" aria-label="Breadcrumb">
          <SiteLink href="/#home">Home</SiteLink>
          <span>/</span>
          <SiteLink href="/#menu">Menu</SiteLink>
          <span>/</span>
          <span style={{ color: 'var(--color-brand)' }}>Profile</span>
        </nav>

        {/* Hero Card */}
        <section className="profile-hero-card">
          <div className="profile-hero-left">
            <div className="profile-avatar">
              {customer?.name ? (
                customer.name.charAt(0).toUpperCase()
              ) : (
                <Icon name="user" size={32} />
              )}
            </div>
            <div className="profile-hero-info">
              <h1>{customer?.name || 'Customer Profile'}</h1>
              <div className="profile-hero-meta">
                {customer?.phone && (
                  <span className="profile-phone-text">
                    <Icon name="phone" size={13} />
                    {customer.phone}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="profile-hero-actions">
            <button
              type="button"
              className="profile-action-btn"
              onClick={() => {
                setEditName(customer?.name || '')
                setEditPhone(customer?.phone || '')
                setIsEditing(!isEditing)
              }}
              title="Edit Profile"
            >
              <Icon name="pencil" size={14} />
              {isEditing ? 'Cancel' : 'Edit'}
            </button>
            {customer && (
              <button
                type="button"
                className="profile-action-btn"
                onClick={handleLogout}
                title="Log out"
                style={{ color: '#dc2626', borderColor: '#fca5a5' }}
              >
                <Icon name="logout" size={14} />
                Logout
              </button>
            )}
          </div>
        </section>

        {/* Inline Edit Form */}
        {isEditing && (
          <section className="profile-edit-card">
            <form onSubmit={handleSaveProfile}>
              <div className="profile-edit-grid">
                <div className="profile-field">
                  <label htmlFor="guest-name-input">Name</label>
                  <input
                    id="guest-name-input"
                    type="text"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    placeholder="Your name"
                    autoFocus
                    required
                  />
                </div>
                <div className="profile-field">
                  <label htmlFor="guest-phone-input">Phone</label>
                  <input
                    id="guest-phone-input"
                    type="tel"
                    value={editPhone}
                    onChange={e => setEditPhone(e.target.value)}
                    placeholder="09..."
                  />
                </div>
              </div>
              <div className="profile-edit-buttons">
                <button type="submit" className="button primary" style={{ minHeight: '38px', padding: '0 20px', fontSize: '13px' }}>
                  Save
                </button>
                <button
                  type="button"
                  className="button secondary"
                  style={{ minHeight: '38px', padding: '0 16px', fontSize: '13px' }}
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </section>
        )}

        {/* Real Metrics Row */}
        <section className="profile-metrics-grid">
          <div className="profile-metric-tile">
            <div className="metric-icon-box">
              <Icon name="bag" size={22} />
            </div>
            <div className="metric-data">
              <strong>{orders.length}</strong>
              <span>Orders</span>
            </div>
          </div>

          <div className="profile-metric-tile">
            <div className="metric-icon-box" style={{ background: '#fff7ed', color: '#ea580c', borderColor: '#fed7aa' }}>
              <Icon name="clock" size={22} />
            </div>
            <div className="metric-data">
              <strong>{activeOrders.length}</strong>
              <span>Active</span>
            </div>
          </div>

          <div className="profile-metric-tile">
            <div className="metric-icon-box" style={{ background: '#f0fdf4', color: '#16a34a', borderColor: '#bbf7d0' }}>
              <Icon name="bank" size={22} />
            </div>
            <div className="metric-data">
              <strong>{formatBirr(totalSpent)}</strong>
              <span>Spent (ETB)</span>
            </div>
          </div>
        </section>

        {/* Active Order Card */}
        {activeOrder && (
          <section className="profile-active-order-card">
            <div className="active-order-header">
              <div>
                <strong style={{ fontSize: '16px', color: 'var(--color-ink)' }}>
                  Order #{String(activeOrder.orderNumber).replace(/^IL-/, '')}
                </strong>
                <span style={{ fontSize: '13px', color: '#78716c', marginLeft: '10px' }}>
                  {activeOrder.table ? `Table ${activeOrder.table}` : 'Direct Order'}
                </span>
              </div>
              <span className="active-order-badge">
                {activeOrder.status || 'Active'}
              </span>
            </div>

            {/* Stepper */}
            <div className="active-order-stepper">
              {['Sent', 'Accepted', 'Cooking', 'Ready'].map((stepName, sIdx) => {
                const currentIdx = getStepIndex(activeOrder.status)
                const isDone = sIdx < currentIdx
                const isCurrent = sIdx === currentIdx
                return (
                  <div
                    key={stepName}
                    className={`stepper-step ${isCurrent ? 'active' : ''} ${isDone ? 'done' : ''}`}
                  >
                    <div className="stepper-indicator">
                      {isDone ? <Icon name="check" size={13} /> : sIdx + 1}
                    </div>
                    <span className="stepper-label">{stepName}</span>
                  </div>
                )
              })}
            </div>

            {/* Dishes */}
            {Array.isArray(activeOrder.items) && activeOrder.items.length > 0 && (
              <div className="active-dishes-box">
                {activeOrder.items.map((item, idx) => (
                  <div key={idx} className="active-dish-row">
                    <span><strong>{item.quantity}×</strong> {item.name}</span>
                    <span>{formatBirr(item.price * item.quantity)} ETB</span>
                  </div>
                ))}
              </div>
            )}

            <div className="active-order-footer">
              <strong style={{ fontSize: '16px', color: 'var(--color-brand)' }}>
                Total: {formatBirr(activeOrder.total)} ETB
              </strong>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="button secondary"
                  style={{ minHeight: '36px', padding: '0 14px', fontSize: '12.5px' }}
                  onClick={() => fetchOrders(false)}
                  title="Refresh status"
                >
                  <Icon name="refresh" size={13} />
                  Refresh
                </button>
                <SiteLink
                  href="/#menu"
                  className="button primary"
                  style={{ minHeight: '36px', padding: '0 16px', fontSize: '12.5px' }}
                  onClick={() => {
                    localStorage.setItem('ilillii_active_order_id', String(activeOrder.orderNumber).replace(/^IL-/, ''))
                    localStorage.setItem('ilillii_active_order_time', Date.now().toString())
                  }}
                >
                  + Add Food
                </SiteLink>
              </div>
            </div>
          </section>
        )}

        {/* Orders History Section */}
        <section>
          <div className="profile-section-heading">
            <h2>Order History</h2>
            <div className="profile-filter-tabs">
              <button
                type="button"
                className={`profile-filter-tab ${tab === 'all' ? 'active' : ''}`}
                onClick={() => setTab('all')}
              >
                All <span className="filter-badge">{orders.length}</span>
              </button>
              <button
                type="button"
                className={`profile-filter-tab ${tab === 'active' ? 'active' : ''}`}
                onClick={() => setTab('active')}
              >
                Active <span className="filter-badge">{activeOrders.length}</span>
              </button>
              <button
                type="button"
                className={`profile-filter-tab ${tab === 'completed' ? 'active' : ''}`}
                onClick={() => setTab('completed')}
              >
                Completed <span className="filter-badge">{completedOrders.length}</span>
              </button>
            </div>
          </div>

          {loading ? (
            <div className="profile-empty-orders">
              <p>Loading orders...</p>
            </div>
          ) : displayedOrders.length === 0 ? (
            <div className="profile-empty-orders">
              <Icon name="bag" size={32} />
              <h3>No orders</h3>
              <p>You have not placed any orders yet.</p>
              <SiteLink href="/#menu" className="button primary" style={{ display: 'inline-flex', padding: '8px 20px', fontSize: '13px' }}>
                Order Food
              </SiteLink>
            </div>
          ) : (
            <div className="profile-orders-list">
              {displayedOrders.map((ord, idx) => {
                const cleanNum = String(ord.orderNumber).replace(/^IL-/, '')
                const st = (ord.status || 'Submitted').toLowerCase()
                const isLive = ['submitted', 'pending', 'accepted', 'preparing', 'cooking', 'ready', 'ready to serve'].includes(st)
                const isDone = ['completed', 'served'].includes(st)
                const statusClass = isLive ? 'in-progress' : isDone ? 'completed' : 'cancelled'

                return (
                  <article key={ord.orderNumber || idx} className="profile-order-card">
                    <div className="profile-order-header">
                      <div className="order-title-group">
                        <strong style={{ fontSize: '15px', color: 'var(--color-ink)' }}>
                          Order #{cleanNum}
                        </strong>
                        <span className={`order-status-pill ${statusClass}`}>
                          {ord.status || 'Submitted'}
                        </span>
                        <span style={{ fontSize: '12px', color: '#78716c' }}>
                          {ord.table ? `Table ${ord.table}` : 'Direct'}
                        </span>
                      </div>
                      <strong style={{ fontSize: '16px', color: 'var(--color-brand)' }}>
                        {formatBirr(ord.total)} ETB
                      </strong>
                    </div>

                    {Array.isArray(ord.items) && ord.items.length > 0 && (
                      <div className="profile-order-items">
                        {ord.items.map((item, iIdx) => (
                          <div key={iIdx} className="order-item-line">
                            <span><strong>{item.quantity}×</strong> {item.name}</span>
                            <span>{formatBirr(item.price * item.quantity)} ETB</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="profile-order-footer">
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <Icon name="clock" size={13} />
                        {formatDate(ord.date || ord.createdAt)}
                      </span>
                      <SiteLink
                        href="/#menu"
                        className="button secondary"
                        style={{ minHeight: '30px', padding: '0 12px', fontSize: '11.5px', fontWeight: 700 }}
                      >
                        Order Again
                      </SiteLink>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>
      </main>

      <GlobalFooter />
    </div>
  )
}
