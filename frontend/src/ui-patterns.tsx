import type { ReactNode } from 'react'
import { Icon } from './shared-ui'
import { formatBirr } from './menu-data'

export function CompactCheckoutAmount({ subtotal, delivery = false }: { subtotal: number; delivery?: boolean }) {
  return <div className="compact-checkout-amount"><div><span>{delivery ? 'Item subtotal' : 'Order total'}</span><strong>{formatBirr(subtotal)} <small>ETB</small></strong></div></div>
}

export function QuantityControl({ label, quantity, onChange }: { label: string; quantity: number; onChange: (delta: number) => void }) {
  return <div className="quantity-control"><button aria-label={`Decrease ${label} quantity`} onClick={() => onChange(-1)}><Icon name="minus" size={16} /></button><span aria-label={`${quantity} selected`}>{quantity}</span><button aria-label={`Increase ${label} quantity`} onClick={() => onChange(1)}><Icon name="plus" size={16} /></button></div>
}
export function StatePanel({ title, children, kind = 'info', action, className = '' }: { title: string; children?: ReactNode; kind?: 'info' | 'error' | 'loading' | 'success'; action?: ReactNode; className?: string }) {
  return <section className={`ui-state ui-state-${kind} ${className}`} role={kind === 'error' ? 'alert' : 'status'} aria-live="polite"><span className="ui-state-icon"><Icon name={kind === 'success' ? 'check' : kind === 'loading' ? 'clock' : 'info'} size={26} /></span><h3>{title}</h3>{children && <div className="ui-state-copy">{children}</div>}{action && <div className="ui-state-action">{action}</div>}</section>
}
export function StatusBadge({ label, type, tone = 'neutral' }: { label: string; type: 'Payment' | 'Order'; tone?: 'neutral' | 'success' | 'warning' | 'error'; demo?: boolean }) {
  return <span className={`ui-status ui-status-${tone}`}><Icon name={tone === 'success' ? 'check' : tone === 'error' ? 'close' : 'info'} size={13} /><span><small>{type}</small>{label}</span></span>
}
export function Pagination({ page, count, pageSize, onPage }: { page: number; count: number; pageSize: number; onPage: (page: number) => void }) {
  const pages = Math.max(1, Math.ceil(count / pageSize))
  const current = Math.min(page, pages)
  return <nav className="ui-pagination" aria-label="Results pagination"><span>{count ? `${(current - 1) * pageSize + 1}–${Math.min(current * pageSize, count)} of ${count} items` : 'No items'}</span><div><button disabled={current <= 1} onClick={() => onPage(current - 1)} aria-label="Previous page"><Icon name="chevron-left" size={16} /></button><strong>Page {current} of {pages}</strong><button disabled={current >= pages} onClick={() => onPage(current + 1)} aria-label="Next page"><Icon name="chevron-right" size={16} /></button></div></nav>
}
