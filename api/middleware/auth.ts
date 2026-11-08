import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

export const JWT_SECRET = process.env.JWT_SECRET || 'ililli_hotel_secure_jwt_secret_2026'

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string
    name: string
    role: string
    isStaff?: boolean
    phone?: string
    email?: string
  }
}

export function requireStaffAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Staff authorization required. Please sign in.',
    })
  }

  const token = authHeader.split(' ')[1]
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any
    const staffRoles = ['admin', 'manager', 'owner', 'kitchen', 'cashier', 'waiter', 'staff']
    const isStaff = decoded.isStaff === true || staffRoles.includes(String(decoded.role || '').toLowerCase())

    if (!isStaff) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Staff privileges required.',
      })
    }

    req.user = decoded
    next()
  } catch (err: any) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired session. Please sign in again.',
    })
  }
}

export function optionalAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1]
    try {
      req.user = jwt.verify(token, JWT_SECRET) as any
    } catch (e) {
      // Optional auth: ignore invalid tokens
    }
  }
  next()
}
