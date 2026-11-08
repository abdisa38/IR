import express, { Request, Response } from 'express'
import cors from 'cors'
import { rateLimit } from 'express-rate-limit'
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

// Browser access from a separate frontend requires an explicit origin allowlist.
const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',').map(origin => origin.trim()).filter(Boolean)
app.use(cors({
  origin: (origin, callback) => callback(null, !origin || allowedOrigins.includes(origin)),
}))

// This per-instance limit complements a shared rate limit at the deployment edge.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many authentication attempts. Please try again later.' },
})
app.use('/api/auth', authLimiter)
app.use('/auth', authLimiter)

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
  try {
    await connectDB()
    next()
  } catch (err: any) {
    console.error('Database connection middleware error:', err.message)
    res.status(500).json({
      success: false,
      message: 'Database connection failed.',
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

app.use('/api/auth', authRoutes)
app.use('/auth', authRoutes)

// 404 handler for unknown API routes
app.use((req: Request, res: Response) => {
  res.status(404).json({ success: false, message: `Endpoint ${req.originalUrl} not found on Ilillii API` })
})

// Error handler
app.use((err: any, _req: Request, res: Response, _next: any) => {
  console.error('Unhandled Server Error in API handler:', err)
  res.status(500).json({ success: false, message: 'Internal Server Error' })
})

export default app
