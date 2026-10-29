import { menuItems } from './menu-data'
import type { PaymentStatus } from './payment-model'
export type { PaymentStatus } from './payment-model'
export type Role = 'Owner' | 'Manager' | 'Order/Service Staff' | 'Kitchen Staff' | 'Payment Reviewer'
export type AdminPage = 'Overview' | 'Orders' | 'Menu Management' | 'Categories' | 'Payments' | 'Tables & QR Codes' | 'Reports' | 'Staff & Permissions' | 'Hotel Settings'
export const roles: Role[] = ['Owner', 'Manager', 'Order/Service Staff', 'Kitchen Staff', 'Payment Reviewer']
export const navigation: { page: AdminPage; icon: string; section?: string }[] = [
  { page: 'Overview', icon: 'overview', section: 'WORKSPACE' }, { page: 'Orders', icon: 'bag' },
  { page: 'Menu Management', icon: 'menu', section: 'RESTAURANT' }, { page: 'Categories', icon: 'layers' }, { page: 'Payments', icon: 'cash' }, { page: 'Tables & QR Codes', icon: 'qr' },
  { page: 'Reports', icon: 'chart', section: 'MANAGEMENT' }, { page: 'Staff & Permissions', icon: 'users' }, { page: 'Hotel Settings', icon: 'settings' },
]
const permissions: Record<Role, AdminPage[]> = {
  Owner: navigation.map(item => item.page),
  Manager: ['Overview', 'Orders', 'Menu Management', 'Categories', 'Tables & QR Codes', 'Reports'],
  'Order/Service Staff': ['Overview', 'Orders', 'Tables & QR Codes'],
  'Kitchen Staff': ['Orders'],
  'Payment Reviewer': ['Overview', 'Payments'],
}
export const canAccess = (role: Role, page: AdminPage) => permissions[role].includes(page)
export const canSeeMoney = (role: Role) => ['Owner', 'Manager', 'Payment Reviewer'].includes(role)
export const canSeeCustomer = (role: Role) => ['Owner', 'Manager', 'Order/Service Staff'].includes(role)
export type OrderStatus = 'New' | 'Accepted' | 'Preparing' | 'Ready' | 'Completed' | 'Cancelled'
export type DemoOrder = {
  id: string
  type: 'Dine-in' | 'Pickup'
  status: OrderStatus
  payment: PaymentStatus
  method: 'Cash' | 'CBE transfer' | 'Telebirr'
  received: string
  table?: string
  customer: string
  phone: string
  items: { id: string; name: string; price: number; quantity: number }[]
  note?: string
  activity: string[]
  reviewer?: string
  reviewedAt?: string
  transferReference?: string
  fee: number | null
  source?: 'table_qr' | 'web_direct'
  parentOrderId?: string
}
export const orderTotal = (order: DemoOrder) => order.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
export const orderStatusLabel = (order: DemoOrder) =>
  order.status === 'New' ? 'Submitted' :
  order.status === 'Accepted' ? 'Accepted' :
  order.status === 'Preparing' ? 'Preparing' :
  order.status === 'Ready' ? (order.type === 'Dine-in' ? 'Ready to Serve' : 'Ready for Pickup') :
  order.status
export function createDemoOrders(): DemoOrder[] {
  return []
}
export function nextOrderStatus(order: DemoOrder): { status: OrderStatus; label: string } | null {
  if (order.status === 'New') return { status: 'Accepted', label: 'Accept order' }
  if (order.status === 'Accepted') return { status: 'Preparing', label: 'Start preparation' }
  if (order.status === 'Preparing') return { status: 'Ready', label: 'Mark ready' }
  if (order.status === 'Ready') return { status: 'Completed', label: order.type === 'Dine-in' ? 'Mark served & complete' : 'Mark collected & complete' }
  return null
}
export const recordedSales = (orders: DemoOrder[]) => orders.filter(order => order.status === 'Completed' && order.payment === 'Paid').reduce((sum, order) => sum + orderTotal(order), 0)
