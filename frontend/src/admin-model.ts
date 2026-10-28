import { menuItems } from './menu-data'
import type { PaymentStatus } from './payment-model'
export type { PaymentStatus } from './payment-model'
export type Role = 'Owner' | 'Manager' | 'Order/Service Staff' | 'Kitchen Staff' | 'Payment Reviewer'
export type AdminPage = 'Overview' | 'Orders' | 'Kitchen Board' | 'Menu Management' | 'Categories' | 'Payments' | 'Tables & QR Codes' | 'Reports' | 'Staff & Permissions' | 'Hotel Settings'
export const roles: Role[] = ['Owner', 'Manager', 'Order/Service Staff', 'Kitchen Staff', 'Payment Reviewer']
export const navigation: { page: AdminPage; icon: string; section?: string }[] = [
  { page: 'Overview', icon: 'overview', section: 'WORKSPACE' }, { page: 'Orders', icon: 'bag' }, { page: 'Kitchen Board', icon: 'meal' },
  { page: 'Menu Management', icon: 'menu', section: 'RESTAURANT' }, { page: 'Categories', icon: 'layers' }, { page: 'Payments', icon: 'cash' }, { page: 'Tables & QR Codes', icon: 'qr' },
  { page: 'Reports', icon: 'chart', section: 'MANAGEMENT' }, { page: 'Staff & Permissions', icon: 'users' }, { page: 'Hotel Settings', icon: 'settings' },
]
const permissions: Record<Role, AdminPage[]> = {
  Owner: navigation.map(item => item.page),
  Manager: ['Overview', 'Orders', 'Kitchen Board', 'Menu Management', 'Categories', 'Tables & QR Codes', 'Reports'],
  'Order/Service Staff': ['Overview', 'Orders', 'Kitchen Board', 'Tables & QR Codes'],
  'Kitchen Staff': ['Kitchen Board'],
  'Payment Reviewer': ['Overview', 'Payments'],
}
export const canAccess = (role: Role, page: AdminPage) => permissions[role].includes(page)
export const canSeeMoney = (role: Role) => ['Owner', 'Manager', 'Payment Reviewer'].includes(role)
export const canSeeCustomer = (role: Role) => ['Owner', 'Manager', 'Order/Service Staff'].includes(role)
export type OrderStatus = 'New' | 'Accepted' | 'Preparing' | 'Ready' | 'Completed' | 'Cancelled'
export type DemoOrder = { id: string; type: 'Dine-in' | 'Pickup'; status: OrderStatus; payment: PaymentStatus; method: 'Cash' | 'CBE transfer' | 'Telebirr'; received: string; table?: string; customer: string; phone: string; items: { id: string; name: string; price: number; quantity: number }[]; note?: string; activity: string[]; reviewer?: string; reviewedAt?: string; transferReference?: string; fee: number | null }
export const orderTotal = (order: DemoOrder) => order.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
export const orderStatusLabel = (order: DemoOrder) => order.status === 'New' ? 'Submitted' : order.status === 'Ready' ? order.type === 'Dine-in' ? 'Ready to Serve' : 'Ready for Pickup' : order.status
export function createDemoOrders(): DemoOrder[] {
  const fixtures: [DemoOrder['type'], OrderStatus, PaymentStatus, DemoOrder['method'], number, number][] = [
    ['Dine-in', 'New', 'Unpaid', 'Cash', 0, 2], ['Pickup', 'New', 'Paid', 'Telebirr', 3, 1],
    ['Dine-in', 'Accepted', 'Paid', 'CBE transfer', 10, 2], ['Dine-in', 'Preparing', 'Unpaid', 'Cash', 5, 1],
    ['Pickup', 'Ready', 'Paid', 'Telebirr', 2, 2], ['Dine-in', 'Ready', 'Paid', 'Telebirr', 11, 3],
    ['Pickup', 'New', 'Verification Pending', 'CBE transfer', 4, 1], ['Dine-in', 'Completed', 'Paid', 'Cash', 6, 1],
    ['Pickup', 'Cancelled', 'Failed', 'Telebirr', 1, 1],
  ]
  return fixtures.map(([type, status, payment, method, index, quantity], i) => {
    const item = menuItems[index]
    return { id: `DEMO-ILL-${1042 + i}`, type, status, payment, method, received: new Date(Date.now() - (i * 11 + 4) * 60000).toISOString(), table: type === 'Dine-in' ? ['05', '08', '12'][i % 3] : undefined, customer: `Demo guest ${String.fromCharCode(65 + i)}`, phone: '0909511588', items: [{ id: item.id, name: item.name, price: item.price, quantity }], note: i === 0 ? 'Note: please bring the drinks with the meal.' : undefined, activity: ['Order received'], transferReference: method === 'CBE transfer' ? `DEMO-CBE-${200 + i}` : undefined, fee: 0 }
  })
}
export function nextOrderStatus(order: DemoOrder): { status: OrderStatus; label: string } | null {
  if (order.type !== 'Dine-in' && order.payment !== 'Paid') return null
  if (order.status === 'New') return { status: 'Accepted', label: 'Accept order' }
  if (order.status === 'Accepted') return { status: 'Preparing', label: 'Start preparation' }
  if (order.status === 'Preparing') return { status: 'Ready', label: 'Mark ready' }
  if (order.status === 'Ready') return { status: 'Completed', label: order.type === 'Dine-in' ? 'Mark served & complete' : 'Mark collected & complete' }
  return null
}
export const recordedSales = (orders: DemoOrder[]) => orders.filter(order => order.status === 'Completed' && order.payment === 'Paid').reduce((sum, order) => sum + orderTotal(order), 0)
