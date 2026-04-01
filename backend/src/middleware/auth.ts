import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebaseAdmin';

// Extend Express Request type to include user property
declare global {
  namespace Express {
    interface Request {
      user?: {
        uid: string;
        email?: string;
        email_verified?: boolean;
        [key: string]: any;
      };
    }
  }
}

export async function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Get the Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing or invalid authorization header',
      });
      return;
    }

    // Extract the token
    const token = authHeader.split('Bearer ')[1];

    if (!token) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'No token provided',
      });
      return;
    }

    try {
      // Verify the token using Firebase Admin
      const decodedToken = await adminAuth().verifyIdToken(token);

      // Attach user info to request object
      req.user = {
        ...decodedToken,
      };

      // Continue to next middleware/route handler
      next();
    } catch (verifyError: any) {
      console.error('Token verification error:', verifyError);

      // Handle specific Firebase Auth errors
      if (verifyError.code === 'auth/id-token-expired') {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'Token has expired',
        });
      } else if (verifyError.code === 'auth/argument-error') {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid token format',
        });
      } else {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'Token verification failed',
        });
      }
      return;
    }
  } catch (error) {
    console.error('Authentication middleware error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Error processing authentication',
    });
    return;
  }
}
