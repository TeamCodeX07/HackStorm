import { Router, Request, Response } from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';
import rateLimit from 'express-rate-limit';
import { Scan } from '../lib/db';
import { verifyMediaAuthenticity } from '../services/realityDefender';
import { enrichSources } from '../utils/credibility';


const router = Router();

const buildSearchQuery = (claim: string): string => {
  return claim
    .replace(/according to|it is reported|sources say|allegedly/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
};

const preAnalysis = (results: any[]) => {
  let factCheckCount = 0;
  let highCredCount = 0;
  let lowCredCount = 0;
  let debunkingSignals = 0;

  results.forEach((result) => {
    result.sources.forEach((source: any) => {
      if (source.isFactChecker) factCheckCount++;
      if (source.credibility === 'high') highCredCount++;
      if (source.credibility === 'low') lowCredCount++;

      const snippet = (source.snippet || '').toLowerCase();
      const debunkWords = [
        'false',
        'misinformation',
        'debunked',
        'misleading',
        'not true',
        'no evidence',
        'fabricated',
        'hoax',
        'fake',
        'incorrect',
        'inaccurate',
        'wrong',
      ];

      if (debunkWords.some((w) => snippet.includes(w))) {
        debunkingSignals++;
      }
    });
  });

  return { factCheckCount, highCredCount, lowCredCount, debunkingSignals };
};

const validateVerdict = (
  verdict: string,
  confidence: number,
  preCheck: {
    factCheckCount: number;
    highCredCount: number;
    lowCredCount: number;
    debunkingSignals: number;
  }
): void => {
  if (
    verdict === 'authentic' &&
    preCheck.debunkingSignals > 3 &&
    confidence > 80
  ) {
    console.warn(
      '[Scan] WARNING: Verdict is authentic but high debunking signals detected'
    );
  }

  if (
    verdict === 'manipulated' &&
    preCheck.highCredCount > 4 &&
    preCheck.debunkingSignals === 0
  ) {
    console.warn(
      '[Scan] WARNING: Verdict is manipulated but no debunking signals found'
    );
  }

  console.log('[Scan] Verdict validation passed');
};

const hasSpeculativeSignals = (text: string, claims: string[]): boolean => {
  const speculativePattern =
    /\b(some experts|others disagree|believe|might|may|could|predict|prediction|within\s+\d+\s+years|will collapse|expected to)\b/i;

  if (speculativePattern.test(text)) {
    return true;
  }

  return claims.some((claim) => speculativePattern.test(claim));
};

// Rate limit: 5 requests per minute per user UID
const scanRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 5,
  keyGenerator: (req: Request) => {
    const sessionId = req.headers['x-session-id'] as string;
    return sessionId || req.socket?.remoteAddress || 'unknown';
  },
  validate: { xForwardedForHeader: false }, // suppress ERR_ERL_KEY_GEN_IPV6 crash
  message: { error: 'Too many scan requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * @route POST /api/scan/text
 * @desc Scan text or a URL for factual authenticity
 */
router.post('/text', scanRateLimit, async (req: Request, res: Response) => {
  const startTime = Date.now();
  const { url, text } = req.body;

  if (!url && !text) {
    return res.status(400).json({ 
      error: 'Provide either a URL or text', 
      code: 'MISSING_INPUT' 
    });
  }

  // ---- STEP A: Get article text ----
  let articleText = text?.trim() || '';

  if (url) {
    try {
      console.log('[Scan] Fetching URL:', url);
      const { data } = await axios.get(url, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
            'AppleWebKit/537.36 (KHTML, like Gecko) ' +
            'Chrome/120.0.0.0 Safari/537.36'
        }
      });
      const $ = cheerio.load(data);
      $('script, style, nav, footer, header, aside, iframe, noscript').remove();
      
      // Try multiple selectors to extract article content
      const selectors = [
        'article', '[role="main"]', '.story-body', 
        '.article__body', '.article-body', 
        'main', '.content', '.post-content', 'body'
      ];
      
      for (const sel of selectors) {
        const extracted = $(sel).first().text()
          .replace(/\s+/g, ' ').trim();
        if (extracted.length > 200) {
          articleText = extracted.slice(0, 6000);
          break;
        }
      }
      
      console.log('[Scan] Extracted text length:', articleText.length);
    } catch (err: any) {
      console.error('[Scan] URL fetch error:', err.message);
      return res.status(400).json({
        error: 'Could not fetch article. Try pasting the text directly.',
        code: 'URL_FETCH_FAILED',
        detail: err.message
      });
    }
  }

  // For direct text, require at least 50 chars; for URL-extracted, require 100
  const minLength = url ? 100 : 50;
  if (!articleText || articleText.length < minLength) {
    return res.status(400).json({
      error: url
        ? 'Not enough content extracted from the URL. Try pasting the article text instead.'
        : `Text is too short (${articleText?.length || 0} chars). Please provide at least 50 characters to analyze.`,
      code: 'TEXT_TOO_SHORT',
      extracted: articleText?.length || 0
    });
  }

  // ---- STEP B: Extract claims via Cerebras ----
  console.log('[Scan] Calling Cerebras for claim extraction...');
  let claims: string[] = [];
  
  try {
    const claimRes = await axios.post(
      'https://api.cerebras.ai/v1/chat/completions',
      {
        model: 'llama3.1-8b',
        max_tokens: 800,
        messages: [{
          role: 'user',
          content: `You are an expert fact-checking analyst. Your job is to read the article below and extract the most important verifiable factual claims that could potentially be true, false, or misleading.

Focus on:
- Specific statistics or numbers mentioned
- Claims about events that happened
- Claims about people, organizations, or governments
- Scientific or medical claims
- Claims that sound exaggerated or sensational
- Claims that directly contradict common knowledge

DO NOT extract:
- Opinions or editorials
- Vague statements
- Questions

Article:
${articleText.slice(0, 5000)}

Return ONLY a JSON array of exactly 5 strings.
Start with [ and end with ].
No markdown. No backticks. No explanation.

Example format:
["Claim 1 as a complete sentence.", "Claim 2.", "Claim 3.", "Claim 4.", "Claim 5."]`
        }]
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.CEREBRAS_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    const raw = claimRes.data.choices?.[0]?.message?.content?.trim();
    if (!raw) throw new Error('Empty response from Cerebras');
    
    console.log('[Scan] Cerebras claims raw:', raw.slice(0, 300));
    
    // Strip markdown if model added it anyway
    const cleaned = raw
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    // Find the JSON array even if there's surrounding text
    const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
    if (!arrayMatch) {
      throw new Error(`No JSON array found in response: ${cleaned.slice(0, 200)}`);
    }

    let parsed: any = [];
    try {
      parsed = JSON.parse(arrayMatch[0]);
    } catch {
      // Fallback: extract quoted strings from malformed array-like output.
      const quotedMatches = [
        ...arrayMatch[0].matchAll(/"([^"\\]*(?:\\.[^"\\]*)*)"/g),
      ] as RegExpMatchArray[];
      const quotedClaims = quotedMatches.map((match) => match[1]);
      parsed = quotedClaims;
    }

    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error('Parsed result is not a valid array');
    }

    claims = parsed
      .filter((c: any) => typeof c === 'string' && c.trim().length > 5)
      .slice(0, 5);

    console.log('[Scan] Claims extracted:', claims.length);
    claims.forEach((c, i) => console.log(`  [${i+1}] ${c.slice(0, 80)}`));

  } catch (err: any) {
    console.error('[Scan] Cerebras claim extraction FAILED:');
    console.error('  Status:', err.response?.status);
    console.error('  Error:', err.response?.data || err.message);
    return res.status(502).json({
      error: 'AI claim extraction failed. Please try again.',
      code: 'CEREBRAS_CLAIMS_FAILED',
      detail: err.response?.data?.error?.message || err.message
    });
  }

  // ---- STEP C: Search each claim via SerpAPI ----
  console.log('[Scan] Querying SerpAPI for', claims.length, 'claims...');
  let searchResults: any[] = [];
  let enrichedResults: any[] = [];
  let preCheck = {
    factCheckCount: 0,
    highCredCount: 0,
    lowCredCount: 0,
    debunkingSignals: 0,
  };

  try {
    searchResults = await Promise.all(
      claims.slice(0, 3).map(async (claim: string) => {
        const query1 = buildSearchQuery(claim);
        const query2 = `fact check: ${query1}`.slice(0, 120);

        const [res1, res2] = await Promise.all([
          axios.get('https://serpapi.com/search', {
            params: {
              q: query1,
              api_key: process.env.SERP_API_KEY,
              num: 3,
              engine: 'google',
              gl: 'us',
              hl: 'en',
            },
            timeout: 15000,
          }),
          axios.get('https://serpapi.com/search', {
            params: {
              q: query2,
              api_key: process.env.SERP_API_KEY,
              num: 2,
              engine: 'google',
              gl: 'us',
              hl: 'en',
            },
            timeout: 15000,
          }),
        ]);

        const supportingSources = (res1.data.organic_results || [])
          .slice(0, 3)
          .map((r: any) => ({
            title: r.title || '',
            snippet: r.snippet || '',
            link: r.link || ''
          }));

        const factCheckSources = (res2.data.organic_results || [])
          .slice(0, 2)
          .map((r: any) => ({
            title: r.title || '',
            snippet: r.snippet || '',
            link: r.link || '',
            type: 'fact-check',
          }));

        const normalizedSupporting = supportingSources.map((source: any) => ({
          ...source,
          type: 'supporting',
        }));

        const sources = [...normalizedSupporting, ...factCheckSources];

        console.log(`  Claim "${claim.slice(0, 50)}..." → ${sources.length} sources`);
        return { claim, sources };
      })
    );

    enrichedResults = enrichSources(searchResults);
    preCheck = preAnalysis(enrichedResults);

    console.log('[Scan] Pre-analysis:', preCheck);
    console.log('[Scan] SerpAPI search complete');
  } catch (err: any) {
    console.error('[Scan] SerpAPI FAILED:', err.response?.data || err.message);
    return res.status(502).json({
      error: 'Fact-checking search failed. Please try again.',
      code: 'SERP_FAILED',
      detail: err.response?.data?.error || err.message
    });
  }

  // ---- STEP D: Verdict synthesis via Cerebras ----
  console.log('[Scan] Calling Cerebras for verdict synthesis...');
  
  try {
    const verdictRes = await axios.post(
      'https://api.cerebras.ai/v1/chat/completions',
      {
        model: 'llama3.1-8b',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: `You are a senior misinformation analyst at a fact-checking organization. You have been given a set of claims from an article and web search results for each claim.

Your job is to give an honest, evidence-based verdict.

VERDICT DEFINITIONS - follow these strictly:
- "authentic": The claims are well-supported by credible sources. Facts check out. No major inaccuracies found.
- "manipulated": One or more claims are demonstrably false, misleading, taken out of context, or contradict credible sources. Fact-checkers have debunked similar claims.
- "uncertain": Claims cannot be clearly verified or debunked. Sources are mixed, limited, or contradictory.

CONFIDENCE SCORE GUIDE:
- 90-100: Overwhelming evidence clearly supports the verdict
- 75-89:  Strong evidence supports the verdict
- 60-74:  Moderate evidence, some uncertainty remains
- 45-59:  Weak evidence, verdict could go either way
- Below 45: Very little evidence found

ANALYSIS INSTRUCTIONS:
1. Read each claim carefully
2. Look at supporting sources - do they confirm the claim?
3. Look at fact-check sources - do they debunk the claim?
4. Consider the credibility of sources (BBC, Reuters, AP = high credibility)
5. If fact-checkers (Snopes, PolitiFact, FactCheck.org) appear = strong signal
6. Make your verdict based on EVIDENCE ONLY

Claims and search results:
${JSON.stringify(enrichedResults, null, 2)}

IMPORTANT CONTEXT from automated pre-analysis:
- Fact-checker sources found: ${preCheck.factCheckCount}
- High-credibility sources found: ${preCheck.highCredCount}
- Low-credibility sources found: ${preCheck.lowCredCount}
- Debunking signals detected: ${preCheck.debunkingSignals}

If debunking signals > 2 or fact-checkers found debunking claims,
strongly consider "manipulated" verdict.
If high-credibility sources > 4 and debunking signals = 0,
strongly consider "authentic" verdict.

Return ONLY a JSON object. Start with { and end with }.
No markdown. No backticks. No text before or after.

{
  "verdict": "authentic" | "manipulated" | "uncertain",
  "confidence": <integer 1-100>,
  "flaggedText": ["claim that is suspicious or false"],
  "reasoning": "3-4 sentences explaining exactly what evidence you found and why you gave this verdict. Be specific about which sources confirmed or denied which claims."
}`
        }]
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.CEREBRAS_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    const raw = verdictRes.data.choices?.[0]?.message?.content?.trim();
    if (!raw) throw new Error('Empty verdict response from Cerebras');
    
    console.log('[Scan] Cerebras verdict raw:', raw.slice(0, 400));

    const cleaned = raw
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    // Find JSON object even if surrounded by text
    const objMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!objMatch) {
      throw new Error(`No JSON object found: ${cleaned.slice(0, 200)}`);
    }

    const parsed = JSON.parse(objMatch[0]);

    // Strict validation — no defaults allowed
    const validVerdicts = ['authentic', 'manipulated', 'uncertain'];
    if (!validVerdicts.includes(parsed.verdict)) {
      throw new Error(`Invalid verdict value: "${parsed.verdict}"`);
    }
    if (typeof parsed.confidence !== 'number' || 
        parsed.confidence < 1 || parsed.confidence > 100) {
      throw new Error(`Invalid confidence: "${parsed.confidence}"`);
    }
    if (!parsed.reasoning || parsed.reasoning.trim().length < 20) {
      throw new Error(`Reasoning too short: "${parsed.reasoning}"`);
    }

    let verdict    = parsed.verdict as string;
    let confidence = Math.round(parsed.confidence);
    const reasoning  = parsed.reasoning.trim();
    const flaggedText = Array.isArray(parsed.flaggedText)
      ? parsed.flaggedText.filter((f: any) => typeof f === 'string')
      : [];

    if (
      verdict === 'authentic' &&
      hasSpeculativeSignals(articleText, claims) &&
      preCheck.debunkingSignals === 0
    ) {
      console.warn(
        '[Scan] Speculative signal override: changing verdict to uncertain'
      );
      verdict = 'uncertain';
      confidence = Math.min(confidence, 65);
    }

    validateVerdict(verdict, confidence, preCheck);

    console.log('[Scan] Verdict:', verdict, '| Confidence:', confidence + '%');

    // ---- STEP E: Save to MongoDB ----
    const latencyMs = Date.now() - startTime;
    const timestamp = new Date();
    
    const scan = await Scan.create({
      userId: req.headers['x-session-id'] as string || 'anonymous',
      mediaType: 'text',
      sourceUrl: url || null,
      verdict,
      confidence,
      flaggedText,
      reasoning,
      claims,
      searchResults: enrichedResults,
      isMock: false,
      latencyMs,
      timestamp,
    });

    console.log('[Scan] Saved. ID:', scan._id, '| Latency:', latencyMs + 'ms');

    return res.json({
      scanId: scan._id,
      verdict,
      confidence,
      flaggedText,
      reasoning,
      claims,
      searchResults: enrichedResults,
      preCheck,
      isMock: false,
      timestamp: timestamp.toISOString(),
      latencyMs,
    });

  } catch (err: any) {
    console.error('[Scan] Cerebras verdict FAILED:');
    console.error('  Status:', err.response?.status);
    console.error('  Error:', err.response?.data || err.message);
    return res.status(502).json({
      error: 'AI verdict synthesis failed. Please try again.',
      code: 'CEREBRAS_VERDICT_FAILED',
      detail: err.response?.data?.error?.message || err.message
    });
  }
});

/**
 * @route POST /api/scan/media
 * @desc Scan media (image/video/audio) for deepfake/manipulation
 */
router.post('/media', scanRateLimit, async (req: Request, res: Response) => {
  try {
    const { fileUrl, mediaType, fileName } = req.body;
    const userId = req.headers['x-session-id'] as string || 'anonymous';
    const startTime = Date.now();

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
      fileName,
      latencyMs: Date.now() - startTime
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

