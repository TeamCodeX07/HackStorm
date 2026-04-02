import express, { Request, Response } from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Cloudinary Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Multer Storage Configuration (Memory)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
});

interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

// POST /api/upload
router.post('/', authenticateToken, upload.single('file'), async (req: MulterRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Determine resource type based on mime type
    let resourceType: 'image' | 'video' | 'raw' | 'auto' = 'auto';
    const mimeType = req.file.mimetype;

    if (mimeType.startsWith('image/')) resourceType = 'image';
    else if (mimeType.startsWith('video/')) resourceType = 'video';
    else if (mimeType.startsWith('audio/')) resourceType = 'video'; // Cloudinary treats audio as video resource type

    // Upload to Cloudinary using a stream
    const uploadStream = (fileBuffer: Buffer) => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: `hackstorm_scans/${(req as any).user?.uid || 'guest'}`,
            resource_type: resourceType,
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        stream.end(fileBuffer);
      });
    };

    const result: any = await uploadStream(req.file.buffer);

    res.json({
      success: true,
      secure_url: result.secure_url,
      public_id: result.public_id,
      resource_type: result.resource_type,
      format: result.format,
      bytes: result.bytes,
    });
  } catch (error: any) {
    console.error('Cloudinary upload error:', error);
    res.status(500).json({
      error: 'Failed to upload file to Cloudinary',
      details: error.message,
    });
  }
});

export default router;
