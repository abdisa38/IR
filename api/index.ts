import express, { Request, Response } from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { connectDB } from './db.js'
import menuRoutes from './routes/menu.js'
import orderRoutes from './routes/orders.js'
import staffRoutes from './routes/staff.js'
import analyticsRoutes from './routes/analytics.js'
import settingsRoutes from './routes/settings.js'
import authRoutes from './routes/auth.js'

dotenv.config()

const app = express()

// Production-hardened CORS origins
const allowedOrigins = [
  'https://ilillihotel.com',
  'https://www.ilillihotel.com',
  'https://ililli-restaurant.pro.et',
  'http://localhost:5173',
  'http://localhost:8443',
  'http://localhost:3000',
  'http://localhost:5000',
]

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true)
      if (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
        return callback(null, true)
      }
      return callback(null, false)
    },
    credentials: true,
  })
)

// In-memory rate limiting to protect auth endpoints against brute-force attacks
const authAttempts = new Map<string, { count: number; resetTime: number }>()
const rateLimitAuth = (req: Request, res: Response, next: any) => {
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown'
  const now = Date.now()
  const windowMs = 15 * 60 * 1000 // 15 mins
  const maxAttempts = 20

  const record = authAttempts.get(ip)
  if (!record || now > record.resetTime) {
    authAttempts.set(ip, { count: 1, resetTime: now + windowMs })
    return next()
  }

  if (record.count >= maxAttempts) {
    return res.status(429).json({
      success: false,
      message: 'Too many authentication attempts. Please wait 15 minutes before trying again.',
    })
  }

  record.count++
  next()
}

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Health check endpoint (never blocked by DB connection)
const healthHandler = (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'Ilillii Bar & Restaurant API (Vercel Serverless)',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  })
}

app.get('/api/health', healthHandler)
app.get('/health', healthHandler)

// Middleware to ensure DB connection before data requests
app.use(async (req: Request, res: Response, next) => {
  // Direct staff logins don't require DB connection
  if (req.path.includes('/auth/login') && req.body?.identifier && ['admin', 'manager', 'kitchen', 'cashier', 'waiter', 'owner'].includes(String(req.body.identifier).toLowerCase())) {
    return next()
  }

  try {
    await connectDB()
    next()
  } catch (err: any) {
    console.error('Database connection middleware error:', err.message)
    res.status(500).json({
      success: false,
      message: 'Database connection failed. Please ensure MongoDB Atlas Network Access whitelist allows 0.0.0.0/0.',
      error: err.message,
    })
  }
})

// Mount API routes on both /api/* and /* so path rewrites always work seamlessly
app.use('/api/menu', menuRoutes)
app.use('/menu', menuRoutes)

app.use('/api/orders', orderRoutes)
app.use('/orders', orderRoutes)

app.use('/api/staff', staffRoutes)
app.use('/staff', staffRoutes)

app.use('/api/analytics', analyticsRoutes)
app.use('/analytics', analyticsRoutes)

app.use('/api/settings', settingsRoutes)
app.use('/settings', settingsRoutes)

app.use('/api/auth', rateLimitAuth, authRoutes)
app.use('/auth', rateLimitAuth, authRoutes)

// 404 handler for unknown API routes
app.use((req: Request, res: Response) => {
  res.status(404).json({ success: false, message: `Endpoint ${req.originalUrl} not found on Ilillii API` })
})

// Error handler
app.use((err: any, _req: Request, res: Response, _next: any) => {
  console.error('Unhandled Server Error in API handler:', err)
  res.status(500).json({ success: false, message: 'Internal Server Error', error: err.message })
})

export default app
