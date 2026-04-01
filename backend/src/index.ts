import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import './lib/db'; // Initializes Mongoose connection
import { initializeFirebaseAdmin } from './lib/firebaseAdmin';
import { authenticateToken } from './middleware/auth';

import scanRoutes from './routes/scan';
import historyRoutes from './routes/history';

dotenv.config();

// Initialize Services
async function startServer() {
  try {
    // 1. Initialize Firebase Admin
    initializeFirebaseAdmin();
    console.log('Firebase Admin initialized');

    // 2. Database is being connected via lib/db.ts
    console.log('Firebase and DB initialization procedures complete');


    const app = express();
    const PORT = process.env.PORT || 5000;
    const isProd = process.env.NODE_ENV === 'production';

    // CORS configuration
    const allowedOrigins = [
      'http://localhost:3000',
      process.env.FRONTEND_URL
    ].filter(Boolean) as string[];

    app.use(cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.indexOf(origin) !== -1 || !isProd) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
    }));

    app.use(express.json());

    // Global Rate Limit (applied mostly to authenticated routes)
    const globalRateLimit = rateLimit({
      windowMs: 60 * 1000, // 1 minute
      max: 5,
      keyGenerator: (req: Request) => (req as any).user?.uid || req.ip,
      handler: (req, res, next, options) => {
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
        timestamp: new Date()
      });
    });


    // Registered routes (Auth + Rate Limit)
    app.use('/api/scan', authenticateToken, globalRateLimit, scanRoutes);
    app.use('/api/scans', authenticateToken, globalRateLimit, historyRoutes);

    // Protected routes - require authentication
    app.get('/api/user/profile', authenticateToken, (req: Request, res: Response) => {
      res.json({
        success: true,
        user: {
          uid: req.user?.uid,
          email: req.user?.email,
          emailVerified: req.user?.email_verified,
        },
      });
    });

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

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`CORS enabled for: ${allowedOrigins.join(', ')}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();


