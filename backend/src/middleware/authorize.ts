import { RequestHandler } from 'express'
import jwt from 'jsonwebtoken'
import { isValidObjectId } from 'mongoose'
import { Staff } from '../models/Staff.js'
import { User } from '../models/User.js'

const normalizeRole = (role: unknown) => String(role || '').trim().toLowerCase()

export const requireRoles = (...allowedRoles: string[]): RequestHandler => async (req, res, next) => {
  const secret = process.env.JWT_SECRET
  if (!secret) return res.status(503).json({ success: false, message: 'Authentication is not configured' })

  const token = req.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1]
  if (!token) return res.status(401).json({ success: false, message: 'Authentication required' })

  try {
    const payload = jwt.verify(token, secret, { algorithms: ['HS256'] })
    if (typeof payload === 'string' || !payload.id || !isValidObjectId(String(payload.id))) {
      return res.status(401).json({ success: false, message: 'Invalid authentication token' })
    }

    const id = String(payload.id)
    const staff = await Staff.findById(id).select('role status')
    let role: string

    if (staff) {
      role = normalizeRole(staff.role)
      if (staff.status !== 'Active') return res.status(403).json({ success: false, message: 'Active staff access required' })
    } else {
      const user = await User.findById(id).select('role')
      if (!user) return res.status(401).json({ success: false, message: 'Staff account not found' })
      role = normalizeRole(user.role)
    }

    if (normalizeRole(payload.role) !== role || !allowedRoles.includes(role)) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' })
    }

    res.locals.staffRole = role
    return next()
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired authentication token' })
  }
}

export const requireStaff = requireRoles('manager', 'admin', 'waiter', 'kitchen', 'cashier', 'host', 'staff')
export const requireManager = requireRoles('manager', 'admin')
export const requireOrderStaff = requireRoles('manager', 'admin', 'waiter', 'kitchen', 'cashier', 'host', 'staff')
export const requirePaymentStaff = requireRoles('manager', 'admin', 'cashier')
