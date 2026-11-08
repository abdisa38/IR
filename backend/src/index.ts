import express, { Request, Response } from 'express'
import cors from 'cors'
import { rateLimit } from 'express-rate-limit'
import dotenv from 'dotenv'
import path from 'path'
import { connectDB } from './config/db.js'
import menuRoutes from './routes/menu.js'
import orderRoutes from './routes/orders.js'
import staffRoutes from './routes/staff.js'
import analyticsRoutes from './routes/analytics.js'
import settingsRoutes from './routes/settings.js'
import authRoutes from './routes/auth.js'
import uploadRoutes from './routes/upload.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

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

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Request logger in dev
app.use((req: Request, _res: Response, next) => {
  console.log(`[${new Date().toISOString().split('T')[1].slice(0, 8)}] ${req.method} ${req.url}`)
  next()
})

// Root endpoint
app.get('/', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'Ilillii Bar & Restaurant API is Live 🚀',
    endpoints: {
      health: '/api/health',
      menu: '/api/menu',
      orders: '/api/orders',
      auth: '/api/auth'
    },
    timestamp: new Date().toISOString()
  })
})

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'Ilillii Bar & Restaurant API',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  })
})

// Static files for uploaded images with CORS and caching
app.use(
  '/uploads',
  express.static(path.join(process.cwd(), 'uploads'), {
    maxAge: '7d',
    setHeaders: (res) => {
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin')
    },
  })
)

// API Routes
app.use('/api/menu', menuRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/staff', staffRoutes)
app.use('/api/analytics', analyticsRoutes)
app.use('/api/settings', settingsRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/upload', uploadRoutes)

// 404 handler for API routes
app.use('/api/*', (req: Request, res: Response) => {
  res.status(404).json({ success: false, message: `Endpoint ${req.originalUrl} not found` })
})

// Global error handler
app.use((err: any, _req: Request, res: Response, _next: any) => {
  console.error('Unhandled server error:', err)
  res.status(500).json({ success: false, message: 'Internal server error' })
})

// Start server after connecting to MongoDB
async function startServer() {
  await connectDB()
  app.listen(PORT, () => {
    console.log(`🚀 Ilillii Backend API server running on http://localhost:${PORT}`)
    console.log(`📡 Health Check: http://localhost:${PORT}/api/health`)
  })
}

startServer()

export default app
