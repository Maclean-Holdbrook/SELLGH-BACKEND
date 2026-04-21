import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import vendorRoutes from './routes/vendorRoutes.js';
import productRoutes from './routes/productRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import payoutRoutes from './routes/payoutRoutes.js';
import userRoutes from './routes/userRoutes.js';
import logger from './config/logger.js';
import { httpLogger } from './middleware/httpLogger.js';


// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Vercel and other reverse proxies forward client IPs via X-Forwarded-For.
// Express must trust the proxy so rate limiting and request IP detection work correctly.
app.set('trust proxy', 1);

// Security Middleware - PHASE 8 SECURITY HARDENING

// 0. HTTP Request Logging - MUST be before routes
app.use(httpLogger);

// 1. Helmet - Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false, // Allow embedding for Paystack
}));

// 2. CORS - Restrict origins
const allowedOrigins = [
  'http://localhost:5173',           // Development frontend
  'http://localhost:3000',           // Alternative dev port
  'https://sellgh.vercel.app',       // Primary production URL
  process.env.FRONTEND_URL,          // Environment variable
].filter(Boolean).flatMap(origin => origin.split(',').map(o => o.trim()));

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    // Check if origin matches allowed list or is a sub-domain of what's allowed
    const isAllowed = allowedOrigins.some(allowed => {
      return origin === allowed || (allowed && origin.startsWith(allowed));
    });

    if (isAllowed || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      console.warn(`Blocked by CORS: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// 3. Rate Limiting - Prevent brute force and DDoS
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false,
});

// Apply rate limiting to all routes
app.use('/api/', limiter);

// Stricter rate limiting for authentication routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 attempts per 15 minutes
  message: 'Too many login attempts, please try again later.',
});

// 4. Request size limits - Prevent large payload attacks
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 5. Input validation - Using Joi schemas in routes (see validators/ directory)
// Note: Removed express-mongo-sanitize due to Express 5 incompatibility
// We're protected by: Supabase query builder + Joi validation + RLS policies

// Health check route
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'SellGH API is running' });
});

// API Routes will be added here
// app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/payouts', payoutRoutes);

// Error handling middleware - SECURITY FIX: Don't expose details in production
app.use((err, req, res, next) => {
  // Log error with Winston
  logger.error(`${err.status || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);

  // SECURITY: Only send detailed errors in development
  if (process.env.NODE_ENV === 'development') {
    res.status(err.status || 500).json({
      error: err.message || 'Something went wrong!',
      details: err.stack,
    });
  } else {
    // Production: Generic error message
    res.status(err.status || 500).json({
      error: 'An error occurred. Please try again later.',
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  app.listen(PORT, () => {
    logger.info(`🚀 SellGH API server running on port ${PORT}`);
    logger.info(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`📋 Routes loaded successfully`);
  });
}

export default app;
