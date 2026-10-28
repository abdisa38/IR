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

// Allow all origins (Vercel, localhost, custom domains)
app.use(
  cors({
    origin: '*',
    credentials: true,
  })
)

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Middleware to ensure DB connection before every request
app.use(async (_req: Request, _res: Response, next) => {
  try {
    await connectDB()
    next()
  } catch (err: any) {
    console.error('Database connection middleware error:', err.message)
    _res.status(500).json({
      success: false,
      message: 'Database connection failed. Please ensure MongoDB Atlas Network Access whitelist allows 0.0.0.0/0.',
      error: err.message,
    })
  }
})

// Health check endpoint
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
  res.status(500).json({ success: false, message: 'Internal Server Error', error: err.message })
})

export default app
