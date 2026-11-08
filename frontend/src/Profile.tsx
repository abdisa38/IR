import { useState, useEffect, useCallback } from 'react'
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
  const [customer, setCustomer] = useState<{ name?: string; phone?: string; id?: string } | null>(null)
  const [orders, setOrders] = useState<OrderRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'all' | 'active' | 'completed'>('all')

  // Edit state
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')

  // Load customer state from localStorage
  const loadCustomer = () => {
    try {
      const saved = localStorage.getItem('ilillii_customer')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed && (parsed.name || parsed.phone)) {
          setCustomer(parsed)
          setEditName(parsed.name || '')
          setEditPhone(parsed.phone || '')
          return parsed
        }
      }
      setCustomer(null)
      setEditName('')
      setEditPhone('')
      return null
    } catch {
      setCustomer(null)
      return null
    }
  }

  // Fetch real orders from server & localStorage
  const loadOrders = useCallback(async (currentCustomer?: { name?: string; phone?: string } | null) => {
    setLoading(true)
    const localMap = new Map<string, OrderRecord>()

    // 1. Read local order history
    try {
      const localHist = localStorage.getItem('ilillii_order_history')
      if (localHist) {
        const parsed: OrderRecord[] = JSON.parse(localHist)
        if (Array.isArray(parsed)) {
          for (const ord of parsed) {
            const key = String(ord.orderNumber || ord._id || '').replace(/^IL-/, '')
            if (key) localMap.set(key, ord)
          }
        }
      }
    } catch {}

    // 2. Fetch real orders from database if customer details exist
    const cust = currentCustomer !== undefined ? currentCustomer : customer
    if (cust && (cust.phone || cust.name)) {
      try {
        const res = await api.getOrders({
          phone: cust.phone || undefined,
          customer: cust.name || undefined,
          limit: 30,
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
                      quantity: it.quantity,
                      price: it.price,
                    }))
                  : [],
              })
            }
          }
        }
      } catch {}
    }

    // Convert map to array and sort by most recent
    const merged = Array.from(localMap.values()).sort((a, b) => {
      const tA = new Date(a.createdAt || a.date || 0).getTime()
      const tB = new Date(b.createdAt || b.date || 0).getTime()
      return tB - tA
    })

    setOrders(merged)
    setLoading(false)
  }, [customer])

  useEffect(() => {
    const cust = loadCustomer()
    loadOrders(cust)

    const handleAuth = () => {
      const updatedCust = loadCustomer()
      loadOrders(updatedCust)
    }

    const handleOrderPlaced = () => {
      loadOrders()
    }

    window.addEventListener('ilillii-auth-changed', handleAuth)
    window.addEventListener('ilillii-order-placed', handleOrderPlaced)
    return () => {
      window.removeEventListener('ilillii-auth-changed', handleAuth)
      window.removeEventListener('ilillii-order-placed', handleOrderPlaced)
    }
  }, [loadOrders])

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault()
    const cleanName = editName.trim()
    const cleanPhone = editPhone.trim()

    const updated = {
      ...(customer || {}),
      name: cleanName,
      phone: cleanPhone,
      id: customer?.id || 'guest_' + Math.random().toString(36).substring(2, 10),
      updatedAt: new Date().toISOString(),
    }

    localStorage.setItem('ilillii_customer', JSON.stringify(updated))
    setCustomer(updated)
    setIsEditing(false)
    window.dispatchEvent(new CustomEvent('ilillii-auth-changed'))
    loadOrders(updated)
  }

  const handleResetProfile = () => {
    if (window.confirm('Reset profile?')) {
      localStorage.removeItem('ilillii_customer')
      setCustomer(null)
      setEditName('')
      setEditPhone('')
      setIsEditing(false)
      window.dispatchEvent(new CustomEvent('ilillii-auth-changed'))
      loadOrders(null)
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

  // Real stats
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
              <h1>{customer?.name || 'Guest'}</h1>
              <div className="profile-hero-meta">
                <span className="profile-badge">
                  {customer?.name ? 'Guest' : 'New Guest'}
                </span>
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
              onClick={() => setIsEditing(!isEditing)}
              title="Edit Profile"
            >
              <Icon name="pencil" size={14} />
              {isEditing ? 'Cancel' : 'Edit'}
            </button>
            {customer && (
              <button
                type="button"
                className="profile-action-btn"
                onClick={handleResetProfile}
                title="Reset Profile"
              >
                Reset
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
                  onClick={() => loadOrders()}
                  title="Refresh status"
                >
                  <Icon name="refresh" size={13} />
                  Refresh
                </button>
                <SiteLink
                  href="/#menu"
                  className="button primary"
                  style={{ minHeight: '36px', padding: '0 16px', fontSize: '12.5px' }}
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
