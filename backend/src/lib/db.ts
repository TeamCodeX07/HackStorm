import mongoose, { Schema, model, Document } from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.warn('⚠️ MONGODB_URI is not defined, database calls will fail!');
} else {
  mongoose.connect(MONGODB_URI)
    .then(() => console.log('✅ Connected to MongoDB Atlas with Mongoose'))
    .catch((err) => console.error('❌ MongoDB Atlas connection error:', err));
}

export interface IScan extends Document {
  userId: string;
  mediaType: 'text' | 'image' | 'video' | 'audio';
  sourceUrl?: string;
  fileUrl?: string;
  verdict: 'authentic' | 'manipulated' | 'uncertain';
  confidence: number;
  flaggedText?: string[];
  reasoning: string;
  isMock: boolean;
  timestamp: Date;
  claims?: any[];
  detectedRegions?: any[];
  detectedTimestamps?: any[];
  fileName?: string;
}

const ScanSchema = new Schema<IScan>({
  userId: { 
    type: String, 
    required: true, 
    index: true 
  },
  mediaType: { 
    type: String, 
    enum: ['text', 'image', 'video', 'audio'], 
    required: true 
  },
  sourceUrl: { type: String },
  fileUrl: { type: String },
  verdict: { 
    type: String, 
    enum: ['authentic', 'manipulated', 'uncertain'], 
    required: true 
  },
  confidence: { 
    type: Number, 
    min: 0, 
    max: 100, 
    required: true 
  },
  flaggedText: { 
    type: [String], 
    default: [] 
  },
  reasoning: { 
    type: String, 
    required: true 
  },
  isMock: { 
    type: Boolean, 
    default: false 
  },
  timestamp: { 
    type: Date, 
    default: Date.now,
    index: true
  },
  claims: { type: Schema.Types.Mixed },
  detectedRegions: { type: Schema.Types.Mixed },
  detectedTimestamps: { type: Schema.Types.Mixed },
  fileName: { type: String },
}, { 
  timestamps: false,
  versionKey: false
});

ScanSchema.index({ userId: 1, timestamp: -1 });
ScanSchema.index({ timestamp: -1 });
ScanSchema.index({ timestamp: 1 }, { expireAfterSeconds: 7776000 });

export const Scan = model<IScan>('Scan', ScanSchema);
export default mongoose;
