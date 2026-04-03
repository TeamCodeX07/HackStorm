import mongoose from 'mongoose';

const ScanSchema = new mongoose.Schema({
  userId:          { type: String, required: true },
  mediaType:       { type: String, enum: ['text', 'image', 'video', 'audio'], required: true },
  inputType:       { type: String, enum: ['url', 'text'], default: 'text' },
  sourceUrl:       { type: String, default: null },
  originalText:    { type: String, default: null },
  fileUrl:         { type: String, default: null },
  verdict:         { type: String, enum: ['authentic', 'manipulated', 'uncertain'], required: true },
  confidence:      { type: Number, required: true, min: 0, max: 100 },
  flaggedText:     { type: [String], default: [] },
  reasoning:       { type: String, required: true },
  claims:          { type: [String], default: [] },
  searchResults:   { type: [Object], default: [] },
  signals: {
    factCheckerCount: Number,
    highCredCount:    Number,
    debunkSignals:    Number,
    supportSignals:   Number
  },
  isMock:          { type: Boolean, required: true, default: false },
  latencyMs:       { type: Number },
  rdJobId:         { type: String, default: null },
  rdRawResult:     { type: Object, default: null },
  timestamp:       { type: Date, default: Date.now }
});

ScanSchema.index({ userId: 1, timestamp: -1 });
ScanSchema.index({ timestamp: -1 });
ScanSchema.index({ timestamp: 1 }, { expireAfterSeconds: 7776000 });

const Scan = mongoose.models.Scan || mongoose.model('Scan', ScanSchema);

export { Scan };
export default Scan;
