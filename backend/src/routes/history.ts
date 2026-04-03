import { Router, Request, Response } from 'express';
import { Scan } from '../models/Scan';
import { v2 as cloudinary } from 'cloudinary';

// Cloudinary Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const router = Router();

/**
 * @route GET /api/scans
 * @desc Get paginated scan history for the session
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const sessionId = req.headers['x-session-id'] as string || 'anonymous';
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Count total scans for the session
    const total = await Scan.countDocuments({ userId: sessionId });
    
    // Fetch paginated scans
    const scans = await Scan.find({ userId: sessionId })
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
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const scanId = req.params.id;

    // Anyone with the ID can view
    const scan = await Scan.findById(scanId);

    if (!scan) {
      return res.status(404).json({ error: 'Scan not found' });
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
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const scanId = req.params.id;

    const scan = await Scan.findByIdAndDelete(scanId);

    if (!scan) {
      return res.status(404).json({ error: 'Scan not found' });
    }

    // Delete file from Cloudinary if it exists
    if (scan.sourceUrl && (scan.mediaType === 'image' || scan.mediaType === 'video' || scan.mediaType === 'audio')) {
      try {
        const publicId = scan.sourceUrl
          .split('/').slice(-2).join('/')
          .replace(/\.[^/.]+$/, '');
        console.log(`Deleting file from Cloudinary: ${publicId}`);
        await cloudinary.uploader.destroy(publicId, { resource_type: 'auto' });
      } catch (storageError) {
        console.warn('Cloudinary file deletion failed:', storageError);
      }
    }

    return res.status(200).json({ success: true, message: 'Scan deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting scan:', error);
    return res.status(500).json({ error: 'Failed to delete scan' });
  }
});

export default router;
