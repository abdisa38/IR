import { useEffect, useMemo, useRef, useState } from 'react'
import { Icon, Logo, Modal } from './shared-ui'
import { formatBirr } from './menu-data'
import { canAccess, canSeeCustomer, canSeeMoney, createDemoOrders, navigation, nextOrderStatus, orderTotal, orderStatusLabel, recordedSales, roles } from './admin-model'
import type { AdminPage, DemoOrder, OrderStatus, PaymentStatus, Role } from './admin-model'
import { AdminCategories, AdminMenu, AdminSettings, AdminStaff, AdminTables } from './AdminManagement'
import { api, type ApiOrder } from './api/client'
import './admin.css'
import { Pagination, StatusBadge } from './ui-patterns'
import { useLanguage } from './language'

const paymentFilters: PaymentStatus[] = ['Unpaid', 'Awaiting Payment', 'Verification Pending', 'Paid', 'Failed', 'Refunded']
const statusFilters: (OrderStatus | 'All Orders')[] = ['New', 'Accepted', 'Preparing', 'Ready', 'Completed', 'Cancelled', 'All Orders']

const pageToSlug: Record<AdminPage, string> = {
  Overview: 'overview',
  Orders: 'orders',
  'Menu Management': 'menu',
  Categories: 'categories',
  Payments: 'payments',
  'Tables & QR Codes': 'tables',
  Reports: 'reports',
  'Staff & Permissions': 'staff',
  'Hotel Settings': 'settings',
}

const slugToPage: Record<string, AdminPage> = {
  overview: 'Overview',
  orders: 'Orders',
  menu: 'Menu Management',
  categories: 'Categories',
  payments: 'Payments',
  tables: 'Tables & QR Codes',
  reports: 'Reports',
  staff: 'Staff & Permissions',
  settings: 'Hotel Settings',
}

function getPageFromHash(): AdminPage | null {
  const hash = window.location.hash
  if (hash.startsWith('#admin/')) {
    const slug = hash.replace('#admin/', '').toLowerCase().split('?')[0].split('/')[0]
    return slugToPage[slug] || null
  }
  return null
}
const time = (value: string) => new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
const Badge = ({ value, type = 'Order' }: { value: string; type?: 'Payment' | 'Order' }) => <StatusBadge label={value} type={type} tone={['Paid', 'Completed', 'Ready for Pickup', 'Ready to Serve'].includes(value) ? 'success' : ['Failed', 'Cancelled', 'Refunded'].includes(value) ? 'error' : ['Submitted', 'Awaiting Payment', 'Verification Pending'].includes(value) ? 'warning' : 'neutral'} />
type Confirmation = { kind: 'cancel' | 'verify' | 'unable' | 'cash' | 'delete'; order: DemoOrder }

function ActivityChart({ orders }: { orders: DemoOrder[] }) {
  if (orders.length === 0) {
    return (
      <div className="admin-empty" style={{ padding: '35px 20px', minHeight: '160px' }}>
        <Icon name="chart" size={30} />
        <h3>No order activity yet</h3>
        <p>Live order trends and throughput will appear as customers place orders.</p>
      </div>
    )
  }
  const sorted = [...orders].sort((a, b) => a.received.localeCompare(b.received))
  const points = sorted.map((_, i) => `${35 + i * (560 / Math.max(1, sorted.length - 1))},${155 - ((i + 1) / Math.max(1, sorted.length)) * 120}`).join(' ')
  return <div className="admin-activity-chart"><svg viewBox="0 0 630 190" role="img" aria-label={`Cumulative activity for ${orders.length} orders`}><g className="chart-grid"><path d="M35 35h560M35 75h560M35 115h560M35 155h560" /></g><g className="chart-axis"><text x="5" y="39">{orders.length}</text><text x="12" y="159">0</text><text x="35" y="182">Earliest order</text><text x="490" y="182">Latest order</text></g>{sorted.length > 0 && <><polygon className="chart-area" points={`35,155 ${points} 595,155`} /><polyline className="chart-line" points={points} /><circle cx={sorted.length === 1 ? 35 : 595} cy={35} r="4" className="chart-point" /></>}</svg></div>
}

export default function Admin() {
  const { language, setLanguage, t } = useLanguage()

  // Authenticated user state
  const getStoredUser = () => {
    try {
      return JSON.parse(localStorage.getItem('ilillii_user') || 'null')
    } catch {
      return null
    }
  }

  const [currentUser, setCurrentUser] = useState<any>(getStoredUser)
  const isStaffAuth = Boolean(
    currentUser &&
    (currentUser.isStaff || ['admin', 'manager', 'kitchen', 'cashier', 'waiter', 'owner'].includes(currentUser.role))
  )

  const mapUserToRole = (user: any): Role => {
    if (!user) return 'Owner'
    if (user.role === 'kitchen') return 'Kitchen Staff'
    if (user.role === 'cashier') return 'Payment Reviewer'
    if (user.role === 'waiter') return 'Order/Service Staff'
    if (user.role === 'manager') return 'Manager'
    return 'Owner'
  }

  const mapUserToInitialPage = (user: any): AdminPage => {
    if (!user) return 'Overview'
    if (user.role === 'kitchen') return 'Orders'
    if (user.role === 'cashier') return 'Payments'
    if (user.role === 'waiter') return 'Orders'
    return 'Overview'
  }

  const [page, setPage] = useState<AdminPage>(() => getPageFromHash() || mapUserToInitialPage(getStoredUser()))
  const [role, setRole] = useState<Role>(() => mapUserToRole(getStoredUser()))
  const [orders, setOrders] = useState<DemoOrder[]>([])
  const [mobile, setMobile] = useState(false)
  const [narrow, setNarrow] = useState(() => window.innerWidth <= 1024)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('New')
  const [orderPage, setOrderPage] = useState(1)
  const [paymentFilter, setPaymentFilter] = useState('Verification Pending')
  const [period, setPeriod] = useState('Last 7 days')
  const [selected, setSelected] = useState<DemoOrder | null>(null)
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null)
  const [reason, setReason] = useState('')
  const [checked, setChecked] = useState(false)
  const [formError, setFormError] = useState('')
  const [notice, setNotice] = useState('')
  const [overlay, setOverlay] = useState<'notifications' | null>(null)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const profileMenuRef = useRef<HTMLDivElement>(null)
  const [viewState, setViewState] = useState('ready')

  const handleSignOut = () => {
    localStorage.removeItem('ilillii_token')
    localStorage.removeItem('ilillii_user')
    localStorage.removeItem('ilillii_customer')
    sessionStorage.clear()
    setCurrentUser(null)
    window.dispatchEvent(new CustomEvent('ilillii-auth-changed'))
    window.location.hash = 'login'
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  }

  useEffect(() => {
    const syncUser = () => {
      const u = getStoredUser()
      if (u) {
        setCurrentUser(u)
        setRole(mapUserToRole(u))
        const p = getPageFromHash()
        if (p) {
          setPage(p)
        }
      } else {
        setCurrentUser(null)
      }
    }
    syncUser()
    window.addEventListener('ilillii-auth-changed', syncUser)
    window.addEventListener('hashchange', syncUser)
    window.addEventListener('storage', syncUser)
    return () => {
      window.removeEventListener('ilillii-auth-changed', syncUser)
      window.removeEventListener('hashchange', syncUser)
      window.removeEventListener('storage', syncUser)
    }
  }, [])

  useEffect(() => {
    if (!isStaffAuth) {
      window.location.hash = 'login'
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    }
  }, [isStaffAuth])

  const loadOrders = async () => {
    try {
      const res = await api.getOrders({ limit: 100 })
      if (res.success && res.orders) {
        const mapped: DemoOrder[] = res.orders.map(o => ({
          id: String(o.orderNumber || '').replace(/^IL-/, ''),
          type: (o.type === 'Pickup' ? 'Pickup' : 'Dine-in') as 'Dine-in' | 'Pickup',
          status: (o.status === 'pending'
            ? 'New'
            : o.status === 'accepted'
            ? 'Accepted'
            : o.status === 'preparing'
            ? 'Preparing'
            : o.status === 'ready'
            ? 'Ready'
            : o.status === 'completed'
            ? 'Completed'
            : 'Cancelled') as OrderStatus,
          payment: (o.paymentStatus === 'paid' ? 'Paid' : 'Unpaid') as PaymentStatus,
          method: (o.paymentMethod?.includes('ShegerPay')
            ? 'ShegerPay'
            : o.paymentMethod?.includes('Telebirr')
            ? 'Telebirr'
            : o.paymentMethod?.includes('CBE')
            ? 'CBE transfer'
            : o.paymentMethod || 'Cash') as any,
          transferReference: o.transactionId || (o.paymentMethod?.includes('(') ? o.paymentMethod.split('(')[1].replace(')', '') : undefined),
          received: o.createdAt,
          table: o.table || undefined,
          customer: o.customerName?.trim() || (o.table ? `Table ${o.table} Guest` : 'Guest Customer'),
          phone: o.customerPhone || '0938890645',
          items: o.items.map(i => ({ id: i.menuItemId, name: i.name, price: i.price, quantity: i.quantity })),
          note: o.note,
          activity: [`Order created at ${time(o.createdAt)}`],
          fee: 0,
          source: (o.source || (o.table ? 'table_qr' : 'web_direct')) as any,
          parentOrderId: o.parentOrderId ? String(o.parentOrderId).replace(/^IL-/, '') : undefined,
        }))
        const sorted = mapped.sort((a, b) => new Date(b.received).getTime() - new Date(a.received).getTime())
        setOrders(sorted)
        setSelected(curr => (curr ? sorted.find(m => m.id === curr.id) || curr : null))
      }
    } catch (err: any) {
      console.warn('Could not load orders from backend:', err.message)
    }
  }

  useEffect(() => {
    loadOrders()
    const handleOrderPlaced = () => loadOrders()
    window.addEventListener('ilillii-order-placed', handleOrderPlaced)
    const timerId = setInterval(loadOrders, 5000)
    return () => {
      window.removeEventListener('ilillii-order-placed', handleOrderPlaced)
      clearInterval(timerId)
    }
  }, [])
  useEffect(() => setOrderPage(1), [filter, query])
  useEffect(() => {
    if (!profileMenuOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [profileMenuOpen])
  useEffect(() => {
    const resize = () => {
      const compact = window.innerWidth <= 1024
      setNarrow(compact)
      if (!compact) setMobile(false)
    }
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setMobile(false) }
    window.addEventListener('resize', resize)
    window.addEventListener('keydown', escape)
    return () => { window.removeEventListener('resize', resize); window.removeEventListener('keydown', escape) }
  }, [])
  useEffect(() => {
    if (!mobile || !narrow) return
    const sidebar = document.getElementById('staff-dashboard-navigation')
    const previousFocus = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    const focusable = () => sidebar ? [...sidebar.querySelectorAll<HTMLElement>('a[href], button:not(:disabled)')].filter(element => element.getClientRects().length > 0) : []
    focusable()[0]?.focus()
    document.body.style.overflow = 'hidden'
    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || document.querySelector('dialog[open]')) return
      const items = focusable()
      const first = items[0], last = items[items.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
    }
    document.addEventListener('keydown', trapFocus)
    return () => {
      document.removeEventListener('keydown', trapFocus)
      document.body.style.overflow = document.querySelector('dialog[open]') ? 'hidden' : previousOverflow
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true })
    }
  }, [mobile, narrow])
  const visible = canAccess(role, page)
  const financial = canSeeMoney(role)
  const operation = canAccess(role, 'Orders')
  const reviewing = canAccess(role, 'Payments')
  const scoped = orders.filter(order => period !== 'Today' || new Date(order.received).toDateString() === new Date().toDateString())
  const displayed = orders.filter(order => (filter === 'All Orders' || order.status === filter) && `${order.id} ${order.type} ${order.items.map(item => item.name).join(' ')}`.toLowerCase().includes(query.toLowerCase()))
  const pending = orders.filter(order => order.payment === 'Verification Pending')
  const demoDate = new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })
  const current = selected ? orders.find(order => order.id === selected.id) : null
  const notify = (text: string) => setNotice(text)
  const navigate = (next: AdminPage) => {
    setPage(next)
    setMobile(false)
    setQuery('')
    setViewState('ready')
    setNotice('')
    const slug = pageToSlug[next] || 'overview'
    window.location.hash = `#admin/${slug}`
  }
  const changeOrder = async (order: DemoOrder) => {
    if (!operation) return
    const next = nextOrderStatus(order)
    if (!next || (role === 'Kitchen Staff' && !['Accepted', 'Preparing'].includes(order.status))) return
    const apiStatus =
      next.status === 'Accepted'
        ? 'accepted'
        : next.status === 'Preparing'
        ? 'preparing'
        : next.status === 'Ready'
        ? 'ready'
        : next.status === 'Completed'
        ? 'completed'
        : 'pending'
    try {
      await api.updateOrderStatus(order.id, apiStatus as any)
      notify(`Order #${order.id.replace(/^IL-/, '')}: ${next.label}`)
      setOrders(prev => prev.map(o => (o.id === order.id ? { ...o, status: next.status } : o)))
      setSelected(curr => (curr && curr.id === order.id ? { ...curr, status: next.status } : curr))
      await loadOrders()
    } catch (err: any) {
      notify(`Update error: ${err.message}`)
    }
  }
  const confirmAction = (kind: Confirmation['kind'], order: DemoOrder) => { setConfirmation({ kind, order }); setReason(''); setChecked(false); setFormError('') }
  const confirm = async () => {
    if (!confirmation) return
    const { kind, order } = confirmation
    if (kind === 'cancel' ? !operation : kind === 'delete' ? !operation : !reviewing) return
    if ((kind === 'cancel' || kind === 'unable') && !reason.trim()) { setFormError('Add a reason so the team can understand this decision.'); return }
    if ((kind === 'verify' || kind === 'cash') && !checked) { setFormError('Confirm the payment check.'); return }
    try {
      if (kind === 'delete') {
        await api.deleteOrder(order.id)
        notify(`Order #${order.id.replace(/^IL-/, '')} deleted permanently.`)
        setOrders(prev => prev.filter(o => o.id !== order.id))
        setSelected(null)
      } else if (kind === 'cancel') {
        await api.cancelOrder(order.id)
        notify(`Order #${order.id.replace(/^IL-/, '')} cancelled.`)
      } else {
        await api.updateOrderPayment(order.id, 'paid', kind === 'cash' ? 'Cash' : 'Bank Transfer')
        notify(`Payment verified for order #${order.id.replace(/^IL-/, '')}.`)
      }
      setConfirmation(null)
      await loadOrders()
    } catch (err: any) {
      notify(`Order action error: ${err.message}`)
    }
  }
  const orderTable = (data: DemoOrder[]) => (
    <>
      <div className="admin-mobile-orders">
        {data.map(order => {
          const customerDisplayName = order.customer && !order.customer.trim().toLowerCase().startsWith('table')
            ? order.customer
            : 'Guest Customer'

          return (
            <article className="admin-mobile-order-card" key={order.id} onClick={() => setSelected(order)} style={{ cursor: 'pointer' }}>
              <div className="admin-card-header">
                <div className="admin-card-user-info">
                  <span className="admin-card-customer-link">
                    {customerDisplayName}
                  </span>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--color-brand)', marginLeft: '8px' }}>
                    #{order.id.replace(/^IL-/, '')}
                  </span>
                </div>
                <span className="admin-card-time-text">{time(order.received)}</span>
              </div>

              <div className="admin-card-tags-row">
                <span className="admin-tag-service">
                  <Icon name={order.type === 'Dine-in' ? 'meal' : 'bag'} size={14} />
                  {order.type}
                </span>
                {order.source === 'table_qr' ? (
                  <span className="admin-tag-table-qr">
                    Table {order.table} (QR)
                  </span>
                ) : order.table ? (
                  <span className="admin-tag-table-manual">
                    Table {order.table}
                  </span>
                ) : (
                  <span className="admin-tag-table-direct">
                    Web Direct
                  </span>
                )}
                {order.parentOrderId && (
                  <span className="admin-tag-extra">
                    + Extra Items
                  </span>
                )}
              </div>

              <div className="admin-card-items-box">
                {order.items.map((item, idx) => (
                  <div key={idx} className="admin-card-item-line">
                    <span className="admin-item-title">
                      <strong className="admin-item-count">{item.quantity}×</strong>
                      {item.name}
                    </span>
                  </div>
                ))}
                {order.note && <div className="admin-card-kitchen-note">Note: {order.note}</div>}
              </div>

              {order.status === 'Completed' && (
                <div className="admin-card-badges-row">
                  <span className="admin-status-completed-pill">
                    <span className="dot" /> {t('stage.completed') || 'Completed'}
                  </span>
                </div>
              )}

              <div className="admin-card-footer-row">
                {financial && (
                  <div className="admin-card-price-display">
                    <strong>{formatBirr(orderTotal(order))}</strong>
                    <small>ETB</small>
                  </div>
                )}
                {operation && nextOrderStatus(order) && (role !== 'Kitchen Staff' || ['Accepted', 'Preparing'].includes(order.status)) && (
                  <button
                    className="button primary"
                    onClick={(e) => {
                      e.stopPropagation()
                      changeOrder(order)
                    }}
                  >
                    {nextOrderStatus(order)!.label === 'Accept order' ? t('admin.acceptOrder') : nextOrderStatus(order)!.label}
                  </button>
                )}
              </div>
            </article>
          )
        })}
        {data.length === 0 && (
          <div className="admin-empty">
            <Icon name="bag" size={28} />
            <h3>No orders yet.</h3>
            <p>New orders placed by customers will appear here in real time.</p>
          </div>
        )}
      </div>

      <div className="admin-table-wrap admin-order-table">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Customer & Order</th>
              <th>Received</th>
              <th>Order Type & Source</th>
              <th>Items</th>
              {financial && <th>Total</th>}
              <th>Payment</th>
              <th>Order Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {data.map(order => {
              const desktopCustomer = order.customer && !order.customer.trim().toLowerCase().startsWith('table')
                ? order.customer
                : 'Guest Customer'
              return (
              <tr key={order.id}>
                <td>
                  <button
                    className="admin-order-link"
                    onClick={() => setSelected(order)}
                    style={{ fontWeight: 700, display: 'block', textAlign: 'left', color: 'var(--color-ink)' }}
                  >
                    {desktopCustomer} <span style={{ color: 'var(--color-brand)', fontWeight: 800, marginLeft: '6px' }}>#{order.id.replace(/^IL-/, '')}</span>
                  </button>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginTop: '3px' }}>
                    {order.parentOrderId && (
                      <span style={{ fontSize: '10px', color: '#b45309', background: '#fef3c7', padding: '1px 5px', borderRadius: '3px' }}>
                        + Extra Dishes
                      </span>
                    )}
                  </div>
                </td>
                <td>{time(order.received)}</td>
                <td>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                    <span className={`admin-order-type type-${order.type.toLowerCase()}`}>
                      <Icon name={order.type === 'Dine-in' ? 'meal' : 'bag'} size={14} />
                      {order.type}
                    </span>
                    {order.source === 'table_qr' ? (
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#15803d', background: '#dcfce7', padding: '1px 6px', borderRadius: '4px', border: '1px solid #bbf7d0' }}>
                        QR Table {order.table}
                      </span>
                    ) : order.table ? (
                      <span style={{ fontSize: '11px', fontWeight: 600, color: '#0369a1', background: '#e0f2fe', padding: '1px 6px', borderRadius: '4px' }}>
                        Table {order.table}
                      </span>
                    ) : (
                      <span style={{ fontSize: '11px', fontWeight: 600, color: '#6d28d9', background: '#ede9fe', padding: '1px 6px', borderRadius: '4px' }}>
                        Web Direct (No QR)
                      </span>
                    )}
                  </div>
                </td>
                <td>
                  <span className="admin-item-summary">
                    {order.items.map(item => `${item.quantity} × ${item.name}`).join(', ')}
                  </span>
                </td>
                {financial && (
                  <td>
                    <strong>{formatBirr(orderTotal(order))}</strong>
                    <small>ETB</small>
                  </td>
                )}
                <td>
                  <Badge value={order.payment} type="Payment" />
                </td>
                <td>
                  <Badge value={orderStatusLabel(order)} />
                </td>
                <td>
                  <button className="icon-button" aria-label={`View ${order.id}`} onClick={() => setSelected(order)}>
                    <Icon name="arrow" size={15} />
                  </button>
                </td>
              </tr>
            )
          })}
          </tbody>
        </table>
        {data.length === 0 && (
          <div className="admin-empty">
            <Icon name="bag" size={28} />
            <h3>No orders yet.</h3>
            <p>New orders placed by customers will appear here in real time.</p>
          </div>
        )}
      </div>
    </>
  )
  const reportOrders = scoped.filter(order => order.status === 'Completed' && order.payment === 'Paid' && order.fee !== null)
  const bestSellers = useMemo(() => {
    const map = new Map<string, number>(); reportOrders.forEach(order => order.items.forEach(item => map.set(item.name, (map.get(item.name) || 0) + item.quantity))); return [...map].sort((a, b) => b[1] - a[1])
  }, [orders, period])
  const subtitle: Record<AdminPage, string> = { Overview: 'A clear view of your restaurant, one order at a time.', Orders: 'Keep every meal moving, from arrival to the table.', 'Menu Management': 'Keep your food and drink menu clear and up to date.', Categories: 'Organize your menu in a way that feels familiar.', Payments: 'Trusted checks before any payment is marked paid.', 'Tables & QR Codes': 'A simple connection between every table and its order.', Reports: 'Understand recorded activity, without guesswork.', 'Staff & Permissions': 'The right access for each member of your team.', 'Hotel Settings': 'Verified business details, kept in one place.' }

  if (!isStaffAuth) {
    return null
  }
  return <div className="admin-app">
    {mobile && <button className="admin-mobile-scrim" aria-label="Close navigation" onClick={() => setMobile(false)} />}
    <aside id="staff-dashboard-navigation" inert={narrow && !mobile} className={`admin-sidebar ${mobile ? 'sidebar-open' : ''}`}><div className="admin-sidebar-brand"><Logo /><span>RESTAURANT WORKSPACE</span></div><div className="admin-location"><span className="admin-location-icon"><Icon name="pin" size={17} /></span><div><strong>Ilillii Hotel</strong><small>Bale Robe, Oromia</small></div><span className="admin-location-dot" /></div><nav aria-label="Dashboard navigation">{navigation.map(item => canAccess(role, item.page) ? <div key={item.page}>{item.section && <span className="admin-nav-label">{item.section}</span>}<button className={page === item.page ? 'active' : ''} onClick={() => navigate(item.page)} aria-current={page === item.page ? 'page' : undefined}><Icon name={item.icon} size={18} /><span>{item.page}</span>{item.page === 'Orders' && <small>{orders.filter(order => order.status === 'New').length}</small>}{item.page === 'Payments' && <span className="admin-nav-notice" />}</button></div> : null)}</nav><div className="admin-sidebar-bottom"><div className="admin-sidebar-user-pill" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', background: 'rgba(255,255,255,0.06)', borderRadius: '8px', color: '#fff' }}><span className="admin-avatar">IH</span><span><strong style={{ display: 'block', fontSize: '13px' }}>{currentUser?.name || 'Ilillii Staff'}</strong><small style={{ color: 'var(--color-muted)', fontSize: '11px' }}>{role}</small></span></div></div></aside>
    <div className="admin-workspace" inert={mobile && narrow}><header className="admin-topbar"><div><button className="icon-button admin-menu-toggle" aria-label="Open navigation" aria-expanded={mobile} aria-controls="staff-dashboard-navigation" onClick={() => setMobile(true)}><Icon name="menu" size={20} /></button><span>Workspace</span><Icon name="chevron-right" size={13} /><strong>{page}</strong></div><div>
      <button
        type="button"
        className="language-button"
        style={{ background: '#f5ebe1', color: 'var(--color-brand)', padding: '5px 10px', borderRadius: '8px', border: '1px solid #ebdcd0', display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', marginInline: '4px' }}
        onClick={() => {
          const nextLang = language === 'om' ? 'am' : language === 'am' ? 'en' : 'om'
          setLanguage(nextLang)
        }}
        aria-label="Change Language"
      >
        <Icon name="globe" size={14} />
        <span>{language === 'om' ? 'Oro' : language === 'am' ? 'Amh' : 'Eng'}</span>
      </button>
      <span className="admin-demo-pill">STAFF WORKSPACE</span>
      <button
        className="admin-notification"
        aria-label="View notifications"
        onClick={() => setOverlay('notifications')}
        style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <Icon name="bell" size={20} />
        {orders.filter(order => order.status === 'New').length > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              background: '#b82032',
              color: '#ffffff',
              fontSize: '11px',
              fontWeight: 800,
              minWidth: '18px',
              height: '18px',
              borderRadius: '9px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 4px',
              lineHeight: 1,
              boxShadow: '0 2px 4px rgba(0,0,0,0.25)',
              border: '1.5px solid #ffffff',
            }}
          >
            {orders.filter(order => order.status === 'New').length}
          </span>
        )}
      </button>
      <div className="admin-profile-menu-wrap" ref={profileMenuRef}>
        <button
          className="admin-profile-button"
          aria-expanded={profileMenuOpen}
          onClick={() => setProfileMenuOpen(!profileMenuOpen)}
        >
          <span className="admin-avatar">IH</span>
          <span>{currentUser?.name || `Ilillii ${role}`}<small>{role}</small></span>
          <Icon name="down" size={13} />
        </button>
        {profileMenuOpen && (
          <div className="admin-profile-dropdown" role="menu">
            <div className="admin-dropdown-user">
              <span className="admin-dropdown-avatar">IH</span>
              <div className="admin-dropdown-user-info">
                <strong>{currentUser?.name || `Ilillii ${role}`}</strong>
                <small>{role} · Bale Robe</small>
              </div>
            </div>
            <div className="admin-dropdown-divider" />
            <button
              className="admin-dropdown-logout-btn"
              onClick={() => {
                setProfileMenuOpen(false)
                handleSignOut()
              }}
            >
              <Icon name="logout" size={16} />
              <span>{t('nav.signOut')}</span>
            </button>
          </div>
        )}
      </div>
    </div></header>
      <main className="admin-main"><div className="admin-page-heading"><div><span className="admin-heading-eyebrow">{page === 'Overview' ? 'YOUR RESTAURANT, AT A GLANCE' : 'ILILLII HOTEL · OPERATIONS'}</span><h1>{page === 'Overview' ? 'A good day starts here.' : page}</h1></div><div>{page === 'Overview' || page === 'Reports' ? <label className="admin-period-filter"><Icon name="calendar" size={16} /><select aria-label="Reporting period" value={period} onChange={event => setPeriod(event.target.value)}><option>Today</option><option>Last 7 days</option></select></label> : null}</div></div>
        {notice && <div className="admin-feedback" role="status"><Icon name="check" size={16} /><span>{notice}</span><button aria-label="Dismiss notification" onClick={() => setNotice('')}><Icon name="close" size={15} /></button></div>}
        {!visible || viewState === 'denied' ? <div className="admin-state-panel"><Icon name="shield" size={35} /><h2>This section is not accessible to your role ({role}).</h2><p>Please select a section permitted for your staff account.</p><button className="button primary" onClick={() => navigate(navigation.find(item => canAccess(role, item.page))!.page)}>Go to my workspace<Icon name="arrow" size={17} /></button></div> : viewState !== 'ready' ? <div className="admin-state-panel"><Icon name={viewState === 'loading' ? 'clock' : viewState === 'error' ? 'info' : 'bag'} size={35} /><h2>{viewState === 'loading' ? 'Loading your workspace…' : viewState === 'error' ? 'We couldn’t load this view.' : 'A fresh start, ready for orders.'}</h2><button className="button secondary" onClick={() => setViewState('ready')}>{viewState === 'error' ? 'Try again' : 'Refresh'}</button></div> : <>
        {page === 'Overview' && (
          <>
            <div className="admin-overview-greeting">
              <span><span className="admin-live-dot" />OPERATIONS DASHBOARD</span>
              <small>{demoDate}</small>
            </div>
            <div className="admin-stat-grid">
              {[
                { title: 'Orders received', value: scoped.length, icon: 'bag', detail: 'Orders in period' },
                { title: 'Awaiting acceptance', value: scoped.filter(order => order.status === 'New').length, icon: 'clock', detail: 'Ready for review' },
                { title: 'In the kitchen', value: scoped.filter(order => order.status === 'Preparing').length, icon: 'meal', detail: 'Cooking' },
                { title: financial ? 'Recorded sales' : 'Ready to serve', value: financial ? `${formatBirr(recordedSales(scoped))}` : scoped.filter(order => order.status === 'Ready').length, icon: financial ? 'cash' : 'check', detail: financial ? 'ETB' : 'Ready' },
              ].map((stat, i) => (
                <article className={`admin-stat-card stat-${i}`} key={stat.title}>
                  <div><span>{stat.title}</span><span className="stat-icon"><Icon name={stat.icon} size={19} /></span></div>
                  <strong>{stat.value}{stat.title === 'Recorded sales' && <small>ETB</small>}</strong>
                </article>
              ))}
            </div>
            <section className="admin-panel admin-attention-panel" style={{ maxWidth: '640px', marginTop: '16px' }}>
              <div className="admin-panel-heading"><h2>Action needed</h2><Icon name="bell" size={18} /></div>
              {orders.length === 0 ? (
                <div className="admin-empty" style={{ padding: '24px 16px' }}>
                  <Icon name="check" size={24} />
                  <h3>All caught up</h3>
                  <p>No orders awaiting action.</p>
                </div>
              ) : (
                <>
                  <button onClick={() => { setFilter('New'); navigate('Orders') }} disabled={!canAccess(role, 'Orders')}>
                    <span className="attention-icon"><Icon name="bag" size={19} /></span>
                    <div><strong>{orders.filter(order => order.status === 'New').length} new orders</strong><small>Review in Orders</small></div>
                    <Icon name="arrow" size={16} />
                  </button>
                  {reviewing && (
                    <button onClick={() => navigate('Payments')}>
                      <span className="attention-icon gold"><Icon name="bank" size={19} /></span>
                      <div><strong>{pending.length} payment to verify</strong><small>Check records</small></div>
                      <Icon name="arrow" size={16} />
                    </button>
                  )}
                  <div className="admin-service-summary">
                    <span>Ready to serve<strong>{scoped.filter(order => order.status === 'Ready' && order.type === 'Dine-in').length}</strong></span>
                    <span>Ready for pickup<strong>{scoped.filter(order => order.status === 'Ready' && order.type === 'Pickup').length}</strong></span>
                  </div>
                </>
              )}
            </section>
          </>
        )}
        {page === 'Orders' && <section className="admin-panel"><div className="admin-section-toolbar"><label className="admin-search"><Icon name="search" size={17} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder={t('admin.searchOrders')} aria-label="Search orders" /></label><span className="admin-small-note">{displayed.length} orders</span></div><div className="admin-filter-tabs">{statusFilters.map(value => <button key={value} className={filter === value ? 'active' : ''} onClick={() => setFilter(value)}>{value === 'All Orders' ? t('admin.allOrders') : value === 'New' ? t('admin.new') : value === 'Accepted' ? t('admin.accepted') : value}<small>{value === 'All Orders' ? orders.length : orders.filter(order => order.status === value).length}</small></button>)}</div>{orderTable(displayed.slice((orderPage - 1) * 6, orderPage * 6))}<Pagination page={orderPage} count={displayed.length} pageSize={6} onPage={setOrderPage} /></section>}
        {page === 'Payments' && <section className="admin-panel"><div className="admin-section-toolbar"><span className="admin-demo-pill">PAYMENT VERIFICATION</span></div><div className="admin-filter-tabs">{paymentFilters.map(value => <button key={value} className={paymentFilter === value ? 'active' : ''} onClick={() => setPaymentFilter(value)}>{value}<small>{orders.filter(order => order.payment === value).length}</small></button>)}</div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Order / submitted</th><th>Amount</th><th>Payment method</th><th>Reference</th><th>Status</th><th>Reviewed by</th><th /></tr></thead><tbody>{orders.filter(order => order.payment === paymentFilter).map(order => <tr key={order.id}><td data-label="Order / submitted"><strong>#{order.id.replace(/^IL-/, '')}</strong><small>{time(order.received)}</small></td><td data-label="Amount">{formatBirr(orderTotal(order))} ETB</td><td data-label="Payment method">{order.method}</td><td data-label="Reference">{order.transferReference || (order.method === 'Telebirr' ? 'TELEBIRR-DIRECT' : 'Cash on arrival')}</td><td data-label="Status"><Badge value={order.payment} type="Payment" /></td><td data-label="Reviewed by">{order.reviewer || 'Pending review'}{order.reviewedAt && <small>{time(order.reviewedAt)}</small>}</td><td><button className="admin-table-action" onClick={() => setSelected(order)}>Review<Icon name="arrow" size={14} /></button></td></tr>)}</tbody></table>{!orders.some(order => order.payment === paymentFilter) && <div className="admin-empty"><Icon name="bank" size={30} /><h3>No payments in this queue.</h3><p>Try another payment status.</p></div>}</div></section>}
        {page === 'Reports' && <><div className="admin-inline-note"><Icon name="info" size={17} />Sales summary covers completed and paid dining and pickup orders at Ilillii Hotel.</div><div className="admin-stat-grid reports-stats"><article className="admin-stat-card"><span>Recorded sales</span><strong>{formatBirr(recordedSales(scoped))}<small>ETB</small></strong></article><article className="admin-stat-card"><span>Orders by period</span><strong>{scoped.length}</strong></article><article className="admin-stat-card"><span>Cancelled orders</span><strong>{scoped.filter(order => order.status === 'Cancelled').length}</strong></article></div><div className="admin-overview-middle"><section className="admin-panel"><div className="admin-panel-heading"><h2>Orders by time</h2></div><ActivityChart orders={scoped} /></section><section className="admin-panel"><div className="admin-panel-heading"><h2>Payment-method breakdown</h2></div>{['Cash', 'Telebirr', 'CBE transfer'].map(method => <div className="admin-report-row" key={method}><span>{method}</span><strong>{formatBirr(reportOrders.filter(order => order.method === method).reduce((sum, order) => sum + orderTotal(order), 0))} ETB</strong></div>)}</section></div><section className="admin-panel"><div className="admin-panel-heading"><h2>Best-selling dishes & drinks</h2></div>{bestSellers.map(([name, quantity]) => <div className="admin-report-row" key={name}><span>{name}</span><strong>{quantity} {quantity === 1 ? 'item' : 'items'}</strong></div>)}{!bestSellers.length && <div className="admin-empty">No recorded sales in this period.</div>}</section></>}
        </>}
        <div hidden={!visible || viewState !== 'ready'}>
        <div hidden={page !== 'Menu Management'}>{canAccess(role, 'Menu Management') && <AdminMenu notify={notify} />}</div>
        <div hidden={page !== 'Categories'}>{canAccess(role, 'Categories') && <AdminCategories notify={notify} />}</div>
        <div hidden={page !== 'Tables & QR Codes'}>{canAccess(role, 'Tables & QR Codes') && <AdminTables notify={notify} />}</div>
        <div hidden={page !== 'Staff & Permissions'}>{canAccess(role, 'Staff & Permissions') && <AdminStaff notify={notify} />}</div>
        <div hidden={page !== 'Hotel Settings'}>{canAccess(role, 'Hotel Settings') && <AdminSettings notify={notify} />}</div>
        </div>
        <div className="admin-workspace-footnote"><span>ILILLII HOTEL · BALE ROBE</span><span>Around Awraris· Phone: 0938890645</span></div>
      </main></div>
    {current && visible && <Modal title={page === 'Payments' ? 'Payment review' : 'Order details'} close={() => setSelected(null)}><div className="admin-order-detail"><div className="order-detail-reference"><strong>{current.table ? `Table ${current.table}` : current.customer} · #{current.id.replace(/^IL-/, '')}</strong><Badge value={orderStatusLabel(current)} /></div><div className="order-detail-method" style={{ flexWrap: 'wrap', gap: '8px' }}><span><Icon name={current.type === 'Dine-in' ? 'meal' : 'bag'} size={18} />{current.type}</span>{current.source === 'table_qr' ? <span style={{ color: '#15803d', background: '#dcfce7', padding: '3px 10px', borderRadius: '12px', fontWeight: 700, fontSize: '13px', border: '1px solid #bbf7d0' }}>Table {current.table} (QR Code Verified)</span> : current.table ? <span style={{ color: '#0369a1', background: '#e0f2fe', padding: '3px 10px', borderRadius: '12px', fontWeight: 600, fontSize: '13px' }}>Table {current.table} (Manual Selection)</span> : <span style={{ color: '#6d28d9', background: '#ede9fe', padding: '3px 10px', borderRadius: '12px', fontWeight: 600, fontSize: '13px' }}>Web Direct (No Table QR)</span>}{current.parentOrderId && <span style={{ color: '#b45309', background: '#fef3c7', padding: '3px 8px', borderRadius: '6px', fontWeight: 600, fontSize: '12px' }}>+ Extra Dishes added to active order #{current.parentOrderId}</span>}<small>Received {time(current.received)}</small></div>{canSeeCustomer(role) && <div className="admin-customer-card"><strong>{current.customer}</strong>{current.type !== 'Dine-in' && <span>{current.phone}</span>}</div>}<div className="admin-order-items">{current.items.map(item => <div key={item.id}><span>{item.quantity}×</span><strong>{item.name}<small>{financial ? `${formatBirr(item.price)} ETB each` : ''}</small></strong>{financial && <b>{formatBirr(item.price * item.quantity)} ETB</b>}</div>)}</div>{current.note && <div className="kitchen-note">{current.note}</div>}{financial && <><div className="summary-subtotal"><span>Subtotal</span><strong>{formatBirr(current.items.reduce((sum, item) => sum + item.price * item.quantity, 0))} ETB</strong></div><div className="summary-total"><span>Order total</span><strong>{formatBirr(orderTotal(current))} <small>ETB</small></strong></div></>}<div className="order-detail-payment"><span>{current.method}</span><Badge value={current.payment} type="Payment" /></div>
      {page === 'Payments' && reviewing ? <><div className="admin-inline-note"><Icon name="shield" size={17} />Verify against Telebirr or CBE transaction receipts.</div><dl className="review-details"><div><dt>Submitted reference</dt><dd>{current.transferReference || 'Cash on arrival'}</dd></div><div><dt>Reviewer</dt><dd>{current.reviewer || 'Not reviewed'}</dd></div>{current.reviewedAt && <div><dt>Review time</dt><dd>{new Date(current.reviewedAt).toLocaleString()}</dd></div>}</dl>{current.method === 'CBE transfer' && current.payment === 'Verification Pending' && <div className="admin-detail-actions"><button className="button primary" disabled={current.status === 'Cancelled'} onClick={() => confirmAction('verify', current)}>Mark payment verified</button><button className="button secondary" onClick={() => confirmAction('unable', current)}>Unable to verify</button></div>}{current.method === 'Cash' && current.payment !== 'Paid' && <button className="button primary" onClick={() => confirmAction('cash', current)}>Record cash received</button>}</> : operation ? <div className="admin-detail-actions">{nextOrderStatus(current) && <button className="button primary" onClick={() => changeOrder(current)}>{nextOrderStatus(current)!.label}<Icon name="arrow" size={15} /></button>}{!['Cancelled', 'Completed'].includes(current.status) && role !== 'Kitchen Staff' && <button className="button secondary" onClick={() => confirmAction('cancel', current)}>{current.status === 'New' ? 'Reject order' : 'Request cancellation'}</button>}{role !== 'Kitchen Staff' && <button type="button" className="button secondary" style={{ background: '#fef2f2', borderColor: '#fca5a5', color: '#b91c1c', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700, marginLeft: 'auto' }} onClick={() => confirmAction('delete', current)} title="Permanently delete order"><Icon name="trash" size={15} />Delete order</button>}</div> : null}<h3 className="admin-detail-subheading">Order activity</h3><ol className="admin-detail-timeline">{current.activity.map((activity, index) => <li key={`${activity}-${index}`}><span /><p>{activity}</p></li>)}</ol></div></Modal>}
    {confirmation && <Modal title={confirmation.kind === 'delete' ? 'Delete Order Permanently' : confirmation.kind === 'cancel' ? 'Confirm order cancellation' : 'Confirm payment update'} close={() => setConfirmation(null)}><form className="admin-form" onSubmit={event => { event.preventDefault(); confirm() }}><p>{confirmation.kind === 'delete' ? 'Are you sure you want to permanently delete this order? This will remove it completely from the database and dashboard.' : confirmation.kind === 'cancel' ? 'Are you sure you want to cancel or reject this order?' : 'Verify this payment against the hotel register or mobile banking record.'}</p><strong style={{ fontSize: '20px', color: confirmation.kind === 'delete' ? '#b91c1c' : 'var(--color-brand)' }}>#{confirmation.order.id.replace(/^IL-/, '')}</strong>{formError && <div className="admin-form-error" role="alert">{formError}</div>}{confirmation.kind === 'cancel' || confirmation.kind === 'unable' ? <label>Reason<textarea value={reason} maxLength={500} onChange={event => setReason(event.target.value)} required rows={3} /></label> : confirmation.kind === 'delete' ? null : <label className="admin-checkbox"><input type="checkbox" checked={checked} onChange={event => setChecked(event.target.checked)} />I confirm the payment was received via cash or bank record.</label>}<div className="admin-form-actions"><button className="button primary" type="submit" style={confirmation.kind === 'delete' ? { background: '#dc2626', borderColor: '#b91c1c', color: '#fff' } : undefined}>{confirmation.kind === 'delete' ? 'Delete permanently' : 'Confirm update'}</button><button className="button secondary" type="button" onClick={() => setConfirmation(null)}>Cancel</button></div></form></Modal>}
    {overlay === 'notifications' && (
      <Modal title={`Incoming Orders (${orders.filter(order => order.status === 'New').length})`} close={() => setOverlay(null)}>
        <div className="admin-notification-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {orders.filter(order => order.status === 'New').map(order => (
            <button
              key={order.id}
              onClick={() => {
                setOverlay(null)
                if (canAccess(role, 'Orders')) {
                  navigate('Orders')
                  setSelected(order)
                } else notify('Order details are not available to this role.')
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 14px',
                width: '100%',
                textAlign: 'left',
                background: '#ffffff',
                border: '1px solid #ebdcd0',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              <span
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: order.type === 'Pickup' ? '#f3e8ff' : '#fee2e2',
                  color: order.type === 'Pickup' ? '#7e22ce' : '#b82032',
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0,
                }}
              >
                <Icon name={order.type === 'Pickup' ? 'bag' : 'meal'} size={18} />
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <strong style={{ display: 'block', fontSize: '13px', color: 'var(--color-ink)' }}>
                  {order.table ? `Table ${order.table}` : order.type === 'Pickup' ? 'Takeaway' : 'Dine-in (Direct)'} · {order.customer}
                </strong>
                <small style={{ fontSize: '11px', color: 'var(--color-muted)' }}>
                  {order.items.length} dishes · {formatBirr(orderTotal(order))} ETB · {time(order.received)}
                </small>
              </span>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 750,
                  color: '#b82032',
                  background: '#fff1f2',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: '1px solid #fecdd3',
                }}
              >
                View
              </span>
            </button>
          ))}
          {orders.some(order => order.status === 'New') && (
            <button
              className="button primary order-full"
              style={{ minHeight: '44px', width: '100%', marginTop: '8px' }}
              onClick={() => {
                setOverlay(null)
                navigate('Orders')
              }}
            >
              Go to Orders Dashboard ({orders.filter(order => order.status === 'New').length})
            </button>
          )}
          {!orders.some(order => order.status === 'New') && (
            <div className="admin-empty" style={{ padding: '30px 16px' }}>
              <Icon name="bell" size={28} />
              <h3>No new notifications</h3>
              <p>All orders are up to date.</p>
              <button
                className="button secondary"
                style={{ marginTop: '12px' }}
                onClick={() => {
                  setOverlay(null)
                  navigate('Orders')
                }}
              >
                View All Orders
              </button>
            </div>
          )}
        </div>
      </Modal>
    )}
  </div>
}
