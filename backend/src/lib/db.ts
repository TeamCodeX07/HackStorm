import mongoose, { Schema, model, Document } from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.warn('⚠️ MONGODB_URI is not defined — DB calls will fail!');
}

// NOTE: Connection is established in src/index.ts before the server starts.
// Do NOT call mongoose.connect() here — index.ts owns the connection lifecycle.


export interface IScan extends Document {
  userId: string;
  mediaType: 'text' | 'image' | 'video' | 'audio';
  inputType?: 'url' | 'text';
  sourceUrl?: string;
  originalText?: string;
  fileUrl?: string;
  verdict: 'authentic' | 'manipulated' | 'uncertain';
  confidence: number;
  flaggedText?: string[];
  reasoning: string;
  isMock: boolean;
  timestamp: Date;
  claims?: any[];
  searchResults?: any[];
  detectedRegions?: any[];
  detectedTimestamps?: any[];
  fileName?: string;
  latencyMs?: number;
  rdJobId?: string;
  rdRawResult?: any;
  signals?: {
    factCheckerCount?: number;
    highCredCount?: number;
    debunkSignals?: number;
    supportSignals?: number;
  };
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
  inputType: {
    type: String,
    enum: ['url', 'text'],
  },
  sourceUrl: { type: String },
  originalText: { type: String },
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
    default: Date.now
  },
  claims: { type: [String], default: undefined },
  searchResults: { type: [Object], default: undefined },
  detectedRegions: { type: Schema.Types.Mixed },
  detectedTimestamps: { type: Schema.Types.Mixed },
  fileName: { type: String },
  latencyMs: { type: Number },
  rdJobId: { type: String },
  rdRawResult: { type: Schema.Types.Mixed },
  signals: { type: Schema.Types.Mixed },
}, { 
  timestamps: false,
  versionKey: false
});

ScanSchema.index({ userId: 1, timestamp: -1 });
ScanSchema.index({ timestamp: -1 });
ScanSchema.index({ timestamp: 1 }, { expireAfterSeconds: 7776000 });

export const Scan = model<IScan>('Scan', ScanSchema);
export default mongoose;
