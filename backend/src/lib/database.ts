import { MongoClient, Db, Collection } from 'mongodb';

let client: MongoClient;
let db: Db;

export async function connectToDatabase() {
  if (db) {
    return { db, client };
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI environment variable is not set');
  }

  try {
    client = new MongoClient(uri);
    await client.connect();
    db = client.db();
    console.log('Connected to MongoDB successfully');
    return { db, client };
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    throw error;
  }
}

export function getDatabase(): Db {
  if (!db) {
    throw new Error('Database not initialized. Call connectToDatabase first.');
  }
  return db;
}

export async function closeDatabaseConnection() {
  if (client) {
    await client.close();
    console.log('MongoDB connection closed');
  }
}

// Scan document interface
export interface ScanDocument {
  userId: string;
  mediaType: 'text' | 'image' | 'video' | 'audio';
  sourceUrl?: string;
  sourceText?: string;
  verdict: 'authentic' | 'manipulated' | 'uncertain';
  confidence: number;
  flaggedText?: string[];
  reasoning: string;
  isMock: boolean;
  timestamp: Date;
  fileName?: string;
  detectedRegions?: {
    x: number;
    y: number;
    width: number;
    height: number;
  }[];
  detectedTimestamps?: {
    start: number;
    end: number;
    description?: string;
  }[];
  claims?: {

    claim: string;
    sources: {
      title: string;
      snippet: string;
      link: string;
    }[];
  }[];
}

export function getScansCollection(): Collection<ScanDocument> {
  const database = getDatabase();
  return database.collection<ScanDocument>('scans');
}
