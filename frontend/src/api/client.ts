/**
 * Ilillii Bar and Restaurant - API Client
 * Connects frontend directly to the MongoDB-backed Express REST API.
 */

const API_BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api` : '/api'

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem('ilillii_token')
  } catch (e) {
    return null
  }
}

export function setStoredToken(token: string | null) {
  try {
    if (token) {
      localStorage.setItem('ilillii_token', token)
    } else {
      localStorage.removeItem('ilillii_token')
    }
  } catch (e) {}
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`
  const token = getStoredToken()

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options.headers as Record<string, string>) || {}),
  }

  try {
    const response = await fetch(url, { ...options, headers })
    const contentType = response.headers.get('content-type') || ''

    let data: any = null
    if (contentType.includes('application/json')) {
      data = await response.json()
    } else {
      const text = await response.text()
      if (!response.ok) {
        throw new Error(
          response.status === 405
            ? 'Endpoint method not allowed (405). Please check backend routing.'
            : `API Server returned ${response.status}: ${response.statusText}`
        )
      }
      throw new Error(`Expected JSON from API, but received ${contentType || 'HTML response'}.`)
    }

    if (!response.ok) {
      throw new Error(data?.message || `Request failed with status ${response.status}`)
    }

    return data as T
  } catch (error: any) {
    console.error(`API Error on ${options.method || 'GET'} ${url}:`, error.message)
    throw error
  }
}

// Types
export interface ApiMenuItem {
  id: string
  name: string
  amharicName?: string
  category: 'food' | 'hot-drinks' | 'cold-drinks' | 'beer-wine' | 'spirits'
  categoryLabel?: string
  price: number
  description?: string
  image: string
  available: boolean
  houseSpecial: boolean
  displayOrder?: number
  translations?: {
    or?: string
    am?: string
    en?: string
  }
  createdAt?: string
  updatedAt?: string
}

export interface ApiOrderItem {
  menuItemId: string
  name: string
  price: number
  quantity: number
  image?: string
}

export interface ApiOrder {
  id: string
  orderNumber: string
  type: 'Dine in' | 'Pickup'
  table?: string
  customerName?: string
  customerPhone?: string
  items: ApiOrderItem[]
  subtotal: number
  total: number
  status: 'pending' | 'accepted' | 'preparing' | 'ready' | 'completed' | 'cancelled'
  paymentStatus: 'unpaid' | 'paid' | 'pay_after_eating'
  paymentTiming: 'pre_pay' | 'post_pay'
  paymentMethod?: string
  note?: string
  source?: 'table_qr' | 'web_direct'
  parentOrderId?: string
  createdAt: string
  updatedAt: string
}

export interface ApiStaff {
  id: string
  name: string
  email?: string
  phone: string
  role: 'Manager' | 'Waiter' | 'Kitchen' | 'Cashier' | 'Host'
  status: 'Active' | 'On Break' | 'Off Duty' | 'Inactive'
  shift?: string
  assignedTables?: string[]
  createdAt?: string
}

export interface ApiAnalytics {
  totalRevenue: number
  todayRevenue: number
  totalOrders: number
  todayOrdersCount: number
  pendingOrders: number
  preparingOrders: number
  readyOrders: number
  completedOrders: number
  activeOrders: number
  totalMenuItems: number
  totalStaff: number
  activeStaff: number
  topItems: { name: string; quantity: number; revenue: number }[]
  currency: string
}

export interface ApiSettings {
  restaurantName: string
  managerPhone: string
  location: string
  announcement: string
  currency: string
  openingHours: string
}

export const api = {
  // Menu
  async getMenu(params?: { category?: string; search?: string; availableOnly?: boolean }) {
    const query = new URLSearchParams()
    if (params?.category && params.category !== 'all') query.set('category', params.category)
    if (params?.search) query.set('search', params.search)
    if (params?.availableOnly) query.set('availableOnly', 'true')
    const qs = query.toString() ? `?${query.toString()}` : ''
    return request<{ success: boolean; count: number; items: ApiMenuItem[] }>(`/menu${qs}`)
  },

  async getMenuItem(id: string) {
    return request<{ success: boolean; item: ApiMenuItem }>(`/menu/${id}`)
  },

  async createMenuItem(item: Partial<ApiMenuItem>) {
    return request<{ success: boolean; item: ApiMenuItem }>('/menu', {
      method: 'POST',
      body: JSON.stringify(item),
    })
  },

  async updateMenuItem(id: string, item: Partial<ApiMenuItem>) {
    return request<{ success: boolean; item: ApiMenuItem }>(`/menu/${id}`, {
      method: 'PUT',
      body: JSON.stringify(item),
    })
  },

  async toggleMenuItemAvailable(id: string) {
    return request<{ success: boolean; item: ApiMenuItem; available: boolean }>(`/menu/${id}/toggle-available`, {
      method: 'PATCH',
    })
  },

  async toggleMenuItemSpecial(id: string) {
    return request<{ success: boolean; item: ApiMenuItem; houseSpecial: boolean }>(`/menu/${id}/toggle-special`, {
      method: 'PATCH',
    })
  },

  async deleteMenuItem(id: string) {
    return request<{ success: boolean; message: string }>(`/menu/${id}`, {
      method: 'DELETE',
    })
  },

  // Orders
  async getOrders(params?: { status?: string; type?: string; limit?: number }) {
    const query = new URLSearchParams()
    if (params?.status && params.status !== 'all') query.set('status', params.status)
    if (params?.type && params.type !== 'all') query.set('type', params.type)
    if (params?.limit) query.set('limit', String(params.limit))
    const qs = query.toString() ? `?${query.toString()}` : ''
    return request<{ success: boolean; count: number; orders: ApiOrder[] }>(`/orders${qs}`)
  },

  async getOrder(id: string) {
    return request<{ success: boolean; order: ApiOrder }>(`/orders/${id}`)
  },

  async createOrder(orderData: {
    items: { menuItemId: string; name: string; price: number; quantity: number; image?: string }[]
    type?: 'Dine in' | 'Pickup'
    table?: string
    customerName?: string
    customerPhone?: string
    note?: string
    paymentTiming?: 'pre_pay' | 'post_pay'
    paymentMethod?: string
    source?: 'table_qr' | 'web_direct'
    parentOrderId?: string
  }) {
    return request<{ success: boolean; order: ApiOrder }>('/orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
    })
  },

  async addItemsToOrder(id: string, items: { menuItemId?: string; name: string; price: number; quantity: number; image?: string }[], note?: string) {
    return request<{ success: boolean; message: string; order: ApiOrder }>(`/orders/${id}/add-items`, {
      method: 'POST',
      body: JSON.stringify({ items, note }),
    })
  },

  async updateOrderStatus(id: string, status: 'pending' | 'accepted' | 'preparing' | 'ready' | 'completed' | 'cancelled') {
    return request<{ success: boolean; order: ApiOrder }>(`/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    })
  },

  async updateOrderPayment(id: string, paymentStatus: 'unpaid' | 'paid' | 'pay_after_eating', paymentMethod?: string) {
    return request<{ success: boolean; order: ApiOrder }>(`/orders/${id}/payment`, {
      method: 'PATCH',
      body: JSON.stringify({ paymentStatus, paymentMethod }),
    })
  },

  async cancelOrder(id: string) {
    return request<{ success: boolean; message: string; order: ApiOrder }>(`/orders/${id}`, {
      method: 'DELETE',
    })
  },

  // Staff
  async getStaff() {
    return request<{ success: boolean; count: number; staff: ApiStaff[] }>('/staff')
  },

  async createStaff(staffData: Partial<ApiStaff>) {
    return request<{ success: boolean; staff: ApiStaff }>('/staff', {
      method: 'POST',
      body: JSON.stringify(staffData),
    })
  },

  async updateStaff(id: string, staffData: Partial<ApiStaff>) {
    return request<{ success: boolean; staff: ApiStaff }>(`/staff/${id}`, {
      method: 'PUT',
      body: JSON.stringify(staffData),
    })
  },

  async toggleStaffStatus(id: string, status?: string) {
    return request<{ success: boolean; staff: ApiStaff; status: string }>(`/staff/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    })
  },

  async deleteStaff(id: string) {
    return request<{ success: boolean; message: string }>(`/staff/${id}`, {
      method: 'DELETE',
    })
  },

  // Analytics
  async getAnalytics() {
    return request<{ success: boolean; data: ApiAnalytics }>('/analytics')
  },

  // Settings
  async getSettings() {
    return request<{ success: boolean; settings: ApiSettings }>('/settings')
  },

  async updateSettings(settings: Partial<ApiSettings>) {
    return request<{ success: boolean; settings: ApiSettings }>('/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    })
  },

  // Auth
  async login(identifier: string, password: string) {
    const res = await request<{ success: boolean; message: string; token: string; user: ApiUser }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    })
    if (res.token) {
      setStoredToken(res.token)
    }
    return res
  },

  async register(userData: { name: string; phone: string; email?: string; password: string }) {
    const res = await request<{ success: boolean; message: string; token: string; user: ApiUser }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    })
    if (res.token) {
      setStoredToken(res.token)
    }
    return res
  },

  async googleAuth(credential: string, clientId?: string) {
    const res = await request<{ success: boolean; message: string; token: string; user: ApiUser }>('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ credential, clientId }),
    })
    if (res.token) {
      setStoredToken(res.token)
    }
    return res
  },

  async getMe() {
    return request<{ success: boolean; user: ApiUser; orders: ApiOrder[] }>('/auth/me')
  },

  logout() {
    setStoredToken(null)
    localStorage.removeItem('ilillii_customer')
    window.dispatchEvent(new CustomEvent('ilillii-auth-changed'))
  },
}

export interface ApiUser {
  id: string
  name: string
  phone?: string
  email?: string
  role: 'customer' | 'staff' | 'manager' | 'admin'
  avatar?: string
  authProvider?: string
  isStaff?: boolean
}
