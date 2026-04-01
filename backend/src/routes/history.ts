import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { Scan } from '../lib/db';
import { adminStorage } from '../lib/firebaseAdmin';

const router = Router();

/**
 * @route GET /api/scans
 * @desc Get paginated scan history for the authenticated user
 */
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.uid;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Count total scans for the user
    const total = await Scan.countDocuments({ userId });
    
    // Fetch paginated scans
    const scans = await Scan.find({ userId })
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit);

    return res.status(200).json({
      scans,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error: any) {
    console.error('Error fetching scan history:', error);
    return res.status(500).json({ error: 'Failed to fetch scan history' });
  }
});

/**
 * @route GET /api/scans/:id
 * @desc Get full details for a specific scan
 */
router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.uid;
    const scanId = req.params.id;

    const scan = await Scan.findOne({ 
      _id: scanId,
      userId 
    });

    if (!scan) {
      return res.status(404).json({ error: 'Scan not found or unauthorized' });
    }

    return res.status(200).json(scan);
  } catch (error: any) {
    console.error('Error fetching scan details:', error);
    return res.status(500).json({ error: 'Failed to fetch scan details' });
  }
});

/**
 * @route DELETE /api/scans/:id
 * @desc Delete a scan and its associated file in storage
 */
router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.uid;
    const scanId = req.params.id;

    // 1. Find the scan to get the URL
    const scan = await Scan.findOne({ 
      _id: scanId,
      userId 
    });

    if (!scan) {
      return res.status(404).json({ error: 'Scan not found' });
    }

    // 2. Delete file from Firebase Storage if it exists
    if (scan.sourceUrl && (scan.mediaType === 'image' || scan.mediaType === 'video' || scan.mediaType === 'audio')) {
      try {
        const urlObj = new URL(scan.sourceUrl);
        if (urlObj.hostname.includes('firebasestorage.googleapis.com')) {
          const pathStart = urlObj.pathname.indexOf('/o/') + 3;
          const encodedPath = urlObj.pathname.substring(pathStart).split('?')[0];
          const fullPath = decodeURIComponent(encodedPath);
          
          console.log(`Deleting file from Firebase Storage: ${fullPath}`);
          const bucket = adminStorage().bucket();
          await bucket.file(fullPath).delete();
        }
      } catch (storageError) {
        console.warn('Firebase Storage file deletion failed:', storageError);
      }
    }

    // 3. Delete from MongoDB
    await Scan.deleteOne({ _id: scanId, userId });

    return res.status(200).json({ success: true, message: 'Scan deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting scan:', error);
    return res.status(500).json({ error: 'Failed to delete scan' });
  }
});

export default router;
