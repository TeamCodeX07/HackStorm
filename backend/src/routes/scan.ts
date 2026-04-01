import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticateToken } from '../middleware/auth';
import { fetchArticleText } from '../services/scraper';
import { extractClaims, verifyClaimsWithSources } from '../services/cerebras';
import { searchAllClaims } from '../services/serpapi';
import { Scan } from '../lib/db';
import { verifyMediaAuthenticity } from '../services/realityDefender';


const router = Router();

// Rate limit: 5 requests per minute per user UID
const scanRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 5,
  keyGenerator: (req: Request) => (req as any).user?.uid || req.ip,
  message: { error: 'Too many scan requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * @route POST /api/scan/text
 * @desc Scan text or a URL for factual authenticity
 */
router.post('/text', authenticateToken, scanRateLimit, async (req: Request, res: Response) => {
  // Existing text scan implementation...
  try {
    const { url, text } = req.body;
    const userId = (req as any).user?.uid;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!url && !text) {
      return res.status(400).json({ error: 'Either URL or text must be provided' });
    }

    let contentToAnalyze = '';
    let sourceUrl = url;

    // 1. Extract content
    if (url) {
      console.log(`Fetching article from URL: ${url}`);
      contentToAnalyze = await fetchArticleText(url);
    } else {
      contentToAnalyze = text;
    }

    if (!contentToAnalyze || contentToAnalyze.trim().length < 50) {
      return res.status(400).json({ error: 'Insufficient content to analyze' });
    }

    // 2. Extract claims via Cerebras
    console.log('Extracting claims with Cerebras...');
    const claims = await extractClaims(contentToAnalyze);
    
    if (claims.length === 0) {
      return res.status(200).json({
        verdict: 'uncertain',
        confidence: 0,
        flaggedText: [],
        reasoning: 'No verifiable factual claims were found in the provided content.',
        timestamp: new Date()
      });
    }

    // 3. Search facts via SerpAPI
    console.log(`Searching sources for ${claims.length} claims...`);
    const claimsWithSources = await searchAllClaims(claims);

    // 4. Final analysis via Cerebras
    console.log('Performing final fact-check with Cerebras...');
    const analysisResult = await verifyClaimsWithSources(claimsWithSources);

    // 5. Save to MongoDB
    // 5. Save to MongoDB
    console.log('Saving scan result to MongoDB...');
    const scanData = {
      userId,
      mediaType: 'text',
      sourceUrl,
      sourceText: text ? text.substring(0, 1000) : undefined,
      verdict: analysisResult.verdict,
      confidence: analysisResult.confidence,
      flaggedText: analysisResult.flaggedText,
      reasoning: analysisResult.reasoning,
      isMock: false,
      timestamp: new Date(),
      claims: claimsWithSources
    };

    const savedScan = await Scan.create(scanData);

    return res.status(200).json(savedScan);

  } catch (error: any) {
    console.error('Error in /api/scan/text:', error);
    return res.status(500).json({ error: 'Factual analysis failed. Please try again.' });
  }
});

/**
 * @route POST /api/scan/media
 * @desc Scan media (image/video/audio) for deepfake/manipulation
 */
router.post('/media', authenticateToken, scanRateLimit, async (req: Request, res: Response) => {
  try {
    const { fileUrl, mediaType, fileName } = req.body;
    const userId = (req as any).user?.uid;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!fileUrl || !mediaType) {
      return res.status(400).json({ error: 'File URL and media type must be provided' });
    }

    console.log(`Scanning ${mediaType} for manipulation: ${fileUrl}`);

    // Call Reality Defender
    const { probability, isMock, regions, timestamps } = await verifyMediaAuthenticity(fileUrl, mediaType);

    // probability: 0-1
    // confidence = probability * 100
    // verdict: >70% = "manipulated", <30% = "authentic", else "uncertain"
    const confidence = Math.round(probability * 100);
    let verdict: 'authentic' | 'manipulated' | 'uncertain';

    if (confidence > 70) {
      verdict = 'manipulated';
    } else if (confidence < 30) {
      verdict = 'authentic';
      // Recalculate confidence for authenticity (how certain we are it's real)
      // Actually, probability usually means "probability of manipulation".
      // So if prob=0.1, it's 10% chance of manipulation, hence 90% chance of authenticity.
      // We'll stick to what the prompt says: confidence = probability * 100.
    } else {
      verdict = 'uncertain';
    }

    const reasoning = verdict === 'manipulated' 
      ? `Our analysis has detected significant signs of digital manipulation in this ${mediaType}. Elevated levels of artificial patterns were found.`
      : verdict === 'authentic'
      ? `This ${mediaType} shows no signs of high-level digital manipulation or synthetic generation. It appears to be authentic.`
      : `The analysis of this ${mediaType} was inconclusive. Some patterns suggest minor editing, but not enough to definitively classify it as manipulated.`;

    const scanData = {
      userId,
      mediaType,
      sourceUrl: fileUrl,
      verdict,
      confidence,
      reasoning,
      isMock,
      timestamp: new Date(),
      detectedRegions: regions,
      detectedTimestamps: timestamps,
      fileName
    };

    console.log('Saving media scan result to MongoDB...');
    const savedScan = await Scan.create(scanData);

    return res.status(200).json(savedScan);

  } catch (error: any) {
    console.error('Error in /api/scan/media:', error);
    return res.status(500).json({ error: 'Media analysis failed. Please try again.' });
  }
});


export default router;

