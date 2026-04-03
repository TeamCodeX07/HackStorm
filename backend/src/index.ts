import dotenv from 'dotenv';
dotenv.config({ override: true });

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import scanRoutes from './routes/scan';
import historyRoutes from './routes/history';
import uploadRoutes from './routes/upload';
import statsRoutes from './routes/stats';

async function startServer() {
  try {
    const REQUIRED = [
      'MONGODB_URI',
      'CEREBRAS_API_KEY',
      'SERP_API_KEY'
    ];

    let allSet = true;
    REQUIRED.forEach(key => {
      if (!process.env[key]) {
        console.error(`[Startup] ❌ MISSING: ${key}`);
        allSet = false;
      } else {
        console.log(`[Startup] ✅ ${key.slice(0,20)}... is set`);
      }
    });
    if (!allSet) process.exit(1);



    // 2. Setup Express app
    const app = express();
    const PORT = process.env.PORT || 5000;
    const isProd = process.env.NODE_ENV === 'production';

    // CORS configuration
    const allowedOrigins = [
      'http://localhost:3000',
      process.env.FRONTEND_URL
    ].filter(Boolean) as string[];

    app.use(cors({
      origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        if (!origin || allowedOrigins.indexOf(origin) !== -1 || !isProd) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
    }));

    app.use(express.json());

    // Global Rate Limit
    const globalRateLimit = rateLimit({
      windowMs: 60 * 1000,
      max: 5,
      // Use UID when authenticated, fallback to socket address (avoids ERR_ERL_KEY_GEN_IPV6)
      keyGenerator: (req: Request) =>
        (req as any).user?.uid ||
        req.socket?.remoteAddress ||
        'unknown',
      validate: { xForwardedForHeader: false }, // suppress IPv6 validation crash
      handler: (req: Request, res: Response, next: NextFunction, options: any) => {
        res.status(429).json({
          error: "Rate limit exceeded",
          code: "RATE_LIMIT",
          retryAfter: Math.ceil(options.windowMs / 1000)
        });
      },
      standardHeaders: true,
      legacyHeaders: false,
    });

    // Public health check route
    app.get('/api/health', (req: Request, res: Response) => {
      res.json({ 
        status: 'ok', 
        message: 'TruthLens API is running',
        uptime: process.uptime(),
        dbState: mongoose.connection.readyState,
        timestamp: new Date()
      });
    });

    // Registered routes
    app.use('/api/stats', statsRoutes);

    // Triggered nodemon restart to load fixed Firebase credentials
    app.use('/api/scan', globalRateLimit, scanRoutes);
    app.use('/api/scans', globalRateLimit, historyRoutes);
    app.use('/api/upload', globalRateLimit, uploadRoutes);



    // Global Error Handler
    app.use((err: any, req: Request, res: Response, next: NextFunction) => {
      console.error('Unhandled Error:', err);
      const status = err.status || 500;
      const message = isProd ? 'An unexpected error occurred' : err.message;
      res.status(status).json({
        error: message,
        code: err.code || "INTERNAL_ERROR",
        status
      });
    });

    // 3. Connect to MongoDB in background — server starts immediately (Fix: resilient startup)
    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) {
      console.warn('⚠️  MONGODB_URI not set — DB features will be unavailable');
    } else {
      console.log('🔌 Connecting to MongoDB Atlas...');
      mongoose.connect(MONGODB_URI, {
        serverSelectionTimeoutMS: 15000,
        socketTimeoutMS: 45000,
        connectTimeoutMS: 15000,
        bufferCommands: false,  // disables buffering — queries fail fast if DB not ready
      })
        .then(() => console.log('✅ MongoDB connected'))
        .catch((err) => {
          // Log but don't crash — stats route will return fallback values
          console.error('❌ MongoDB connection failed:', err.message);
          console.error('⚠️  Hint: Make sure your IP is whitelisted in MongoDB Atlas Network Access.');
          console.error('   https://cloud.mongodb.com/v2 → Network Access → Add IP Address');
        });
    }

    // Start accepting requests immediately — DB connects async in background
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`CORS enabled for: ${allowedOrigins.join(', ')}`);
    });

  } catch (error) {
    console.error('❌ Fatal startup error:', error);
    process.exit(1);
  }
}

startServer();
