import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { connectDB } from './config/db.js';
import menuRoutes from './routes/menu.js';
import orderRoutes from './routes/orders.js';
import staffRoutes from './routes/staff.js';
import analyticsRoutes from './routes/analytics.js';
import settingsRoutes from './routes/settings.js';
import authRoutes from './routes/auth.js';
import uploadRoutes from './routes/upload.js';
dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;
// Middleware
// Universal CORS configuration supporting credentials and preflight requests
app.use(cors({
    origin: (_origin, callback) => {
        // Allow all incoming web origins (ilillii-restauarant.pro.et, ilillihotel.com, localhost, etc.)
        callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    maxAge: 86400,
}));
// Explicit handler for CORS preflight OPTIONS requests
app.options('*', cors({ origin: true, credentials: true }));
// In-memory rate limiting to protect auth endpoints against brute-force attacks
const authAttempts = new Map();
const rateLimitAuth = (req, res, next) => {
    if (req.method === 'OPTIONS')
        return next(); // Never rate-limit CORS preflight!
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const windowMs = 15 * 60 * 1000; // 15 mins
    const maxAttempts = 50;
    const record = authAttempts.get(ip);
    if (!record || now > record.resetTime) {
        authAttempts.set(ip, { count: 1, resetTime: now + windowMs });
        return next();
    }
    if (record.count >= maxAttempts) {
        return res.status(429).json({
            success: false,
            message: 'Too many authentication attempts. Please wait 15 minutes before trying again.',
        });
    }
    record.count++;
    next();
};
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
// Request logger in dev
app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString().split('T')[1].slice(0, 8)}] ${req.method} ${req.url}`);
    next();
});
// Root endpoint
app.get('/', (_req, res) => {
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
    });
});
// Health check endpoint
app.get('/api/health', (_req, res) => {
    res.json({
        status: 'ok',
        service: 'Ilillii Bar & Restaurant API',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
});
// Static files for uploaded images with CORS and caching
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads'), {
    maxAge: '7d',
    setHeaders: (res) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    },
}));
// API Routes
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/auth', rateLimitAuth, authRoutes);
app.use('/api/upload', uploadRoutes);
// 404 handler for API routes
app.use('/api/*', (req, res) => {
    res.status(404).json({ success: false, message: `Endpoint ${req.originalUrl} not found` });
});
// Global error handler
app.use((err, _req, res, _next) => {
    console.error('Unhandled server error:', err);
    res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
});
// Start server after connecting to MongoDB
async function startServer() {
    await connectDB();
    app.listen(PORT, () => {
        console.log(`🚀 Ilillii Backend API server running on http://localhost:${PORT}`);
        console.log(`📡 Health Check: http://localhost:${PORT}/api/health`);
    });
}
startServer();
export default app;
