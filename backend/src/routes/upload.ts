import express, { Request, Response } from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';


const router = express.Router();

const cloudinaryConfig = {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
};

const hasCloudinaryConfig =
  Boolean(cloudinaryConfig.cloud_name) &&
  Boolean(cloudinaryConfig.api_key) &&
  Boolean(cloudinaryConfig.api_secret);

// Cloudinary Configuration
cloudinary.config(cloudinaryConfig);

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

// GET /api/upload
router.get('/', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    message: 'Upload endpoint is ready. Use POST with multipart/form-data and field name "file".',
    cloudinaryConfigured: hasCloudinaryConfig,
  });
});

// POST /api/upload
router.post('/', upload.single('file'), async (req: MulterRequest, res: Response) => {
  try {
    if (!hasCloudinaryConfig) {
      return res.status(503).json({
        error: 'Cloudinary is not configured on the backend',
        code: 'CLOUDINARY_NOT_CONFIGURED',
        details: 'Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in backend .env',
      });
    }

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
            folder: `hackstorm_scans/${req.headers['x-session-id'] as string || 'guest'}`,
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
    const rawMessage = String(error?.message || 'Unknown Cloudinary upload error');
    const lower = rawMessage.toLowerCase();

    console.error('Cloudinary upload error:', rawMessage);

    if (lower.includes('invalid cloud_name')) {
      return res.status(502).json({
        error: 'Cloudinary configuration is invalid',
        code: 'CLOUDINARY_INVALID_CLOUD_NAME',
        details: 'CLOUDINARY_CLOUD_NAME is invalid. Update backend .env with your actual Cloudinary cloud name.',
      });
    }

    if (lower.includes('invalid api key') || lower.includes('api key')) {
      return res.status(502).json({
        error: 'Cloudinary configuration is invalid',
        code: 'CLOUDINARY_INVALID_API_KEY',
        details: 'CLOUDINARY_API_KEY is invalid. Update backend .env with your Cloudinary API key.',
      });
    }

    if (lower.includes('invalid signature') || lower.includes('api secret')) {
      return res.status(502).json({
        error: 'Cloudinary configuration is invalid',
        code: 'CLOUDINARY_INVALID_SIGNATURE',
        details: 'CLOUDINARY_API_SECRET appears invalid. Update backend .env with your Cloudinary API secret.',
      });
    }

    return res.status(500).json({
      error: 'Failed to upload file to Cloudinary',
      code: 'CLOUDINARY_UPLOAD_FAILED',
      details: rawMessage,
    });
  }
});

export default router;
