import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { Scan } from '../models/Scan';

const router = Router();

/**
 * @route GET /api/stats
 * @desc Get real-time platform statistics
 * @access Public (no auth required)
 */
router.get('/', async (req: Request, res: Response) => {
  // Connection guard — return safe defaults immediately if DB not ready yet
  if (mongoose.connection.readyState !== 1) {
    console.warn('⚠️  /api/stats: DB not ready (state:', mongoose.connection.readyState, ') — returning safe defaults');
    return res.status(200).json({
      totalScans: 0,
      avgLatency: 1.8,
      coreEngines: 5,
      isFree: true,
      _fallback: true
    });
  }

  try {
    // Fix 4: Run queries in parallel for speed, with safe fallback on failure
    const [totalScans, avgResult] = await Promise.all([
      Scan.countDocuments(),
      Scan.aggregate([
        { $group: { _id: null, avg: { $avg: '$latencyMs' } } }
      ])
    ]);

    const avgLatencyMs = avgResult.length > 0 && avgResult[0].avg != null
      ? avgResult[0].avg
      : 1800; // fallback: 1.8s in ms

    const avgLatency = parseFloat((avgLatencyMs / 1000).toFixed(1));

    return res.status(200).json({
      totalScans,
      avgLatency,
      coreEngines: 5,  // Cerebras, SerpAPI, Reality Defender, Firebase, MongoDB
      isFree: true
    });

  } catch (err: any) {
    // Fix 4: Never crash — return safe defaults so frontend always renders
    console.error('❌ Error fetching platform stats:', err.message);
    return res.status(200).json({
      totalScans: 0,
      avgLatency: 1.8,
      coreEngines: 5,
      isFree: true,
      _fallback: true
    });
  }
});

export default router;
