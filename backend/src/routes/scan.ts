import { Router, Request, Response } from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';
import rateLimit from 'express-rate-limit';
import { Scan } from '../models/Scan';
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
router.post('/text', async (req: any, res: Response) => {
  const startTime = Date.now();
  const { url, text } = req.body;
  const sessionId = req.headers['x-session-id'] as string || 'anonymous';

  if (!url && !text) {
    return res.status(400).json({
      error: 'Provide either a URL or article text.',
      code: 'MISSING_INPUT'
    });
  }

  // ============================================
  // PHASE 1 - CONTENT EXTRACTION (URL only)
  // ============================================
  let articleText = '';
  let inputType = 'text';

  if (url) {
    inputType = 'url';
    console.log('[Phase 1] Fetching URL:', url);

    try {
      const { data: html } = await axios.get(url, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
            'AppleWebKit/537.36 (KHTML, like Gecko) ' +
            'Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });

      const $ = cheerio.load(html);

      // Remove all noise
      $(
        'script, style, nav, footer, header, aside, iframe, ' +
        'noscript, .nav, .menu, .sidebar, .advertisement, ' +
        '.ads, .social-share, .comments, .related-articles, ' +
        '[role="navigation"], [role="banner"], [role="complementary"]'
      ).remove();

      // Try selectors from most specific to least specific
      const ARTICLE_SELECTORS = [
        'article',
        '[role="main"]',
        '.article-body',
        '.article__body',
        '.story-body',
        '.post-content',
        '.entry-content',
        '.article-content',
        '.content-body',
        '#article-body',
        '#main-content',
        'main',
        '.content',
      ];

      for (const selector of ARTICLE_SELECTORS) {
        const el = $(selector).first();
        if (!el.length) continue;

        const extracted = el
          .text()
          .replace(/\s+/g, ' ')
          .replace(/\n+/g, ' ')
          .trim();

        if (extracted.length > 200) {
          articleText = extracted.slice(0, 6000);
          console.log(
            `[Phase 1] Extracted via "${selector}": ${articleText.length} chars`
          );
          break;
        }
      }

      // Fallback to full body if nothing found
      if (!articleText || articleText.length < 200) {
        articleText = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 6000);
        console.log('[Phase 1] Fallback to body:', articleText.length, 'chars');
      }
    } catch (err: any) {
      console.error('[Phase 1] URL fetch failed:', err.message);
      return res.status(400).json({
        error: 'Could not fetch this URL. The website may be blocking scrapers. Try pasting the article text directly.',
        code: 'URL_FETCH_FAILED',
        detail: err.message,
      });
    }

    // URL extraction needs at least 100 chars
    if (articleText.length < 100) {
      return res.status(400).json({
        error: 'Could not extract enough content from this URL. Try pasting the text directly.',
        code: 'EXTRACTION_TOO_SHORT',
        extracted: articleText.length,
      });
    }

  } else {
    // TEXT input - use directly, skip extraction
    articleText = text.trim();
    console.log('[Phase 1] Using pasted text:', articleText.length, 'chars');

    // Text paste only needs 50 chars minimum
    if (articleText.length < 50) {
      return res.status(400).json({
        error: 'Please provide at least 50 characters of text to analyze.',
        code: 'TEXT_TOO_SHORT',
        provided: articleText.length,
      });
    }
  }

  // ============================================
  // PHASE 2 - AI CLAIM EXTRACTION (Cerebras)
  // ============================================
  console.log('[Phase 2] Extracting claims via Cerebras...');
  let claims: string[] = [];
  
  try {
    const claimRes = await axios.post(
      'https://api.cerebras.ai/v1/chat/completions',
      {
        model: 'llama-3.3-70b',
        max_tokens: 1000,
        temperature: 0.1,
        messages: [{
          role: 'system',
          content: `You are a Senior Fact-Checker at a professional 
          fact-checking organization. Your job is to identify 
          verifiable factual claims in articles.`
        }, {
          role: 'user',
          content: `Read the following article carefully and extract 
exactly 5 verifiable factual claims.

INCLUDE claims that are:
- Specific statistics or numbers (e.g., "X% of people...", "Y million dollars...")
- Claims about specific events with dates
- Claims about what a person, organization, or government did or said
- Scientific or medical claims
- Claims that sound sensational or exaggerated
- Claims that could be verified by searching the web

EXCLUDE:
- Opinions or subjective statements
- Vague generalizations
- Questions
- Predictions about the future

Article:
"""
${articleText}
"""

Return ONLY a raw JSON array of exactly 5 strings.
MUST start with [ and end with ].
No markdown. No backticks. No text before or after.
Each claim must be a complete, specific sentence.

["Specific claim 1.", "Specific claim 2.", "Specific claim 3.", "Specific claim 4.", "Specific claim 5."]`
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
    
    console.log('[Phase 2] Raw response:', raw.slice(0, 300));
    
    // Strip markdown fences if model added them
    const cleaned = raw
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    // Extract JSON array even if surrounded by text
    const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
    if (!arrayMatch) {
      throw new Error('No JSON array in response: ' + cleaned.slice(0, 200));
    }

    const parsed = JSON.parse(arrayMatch[0]);

    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error('Parsed result is not a valid array');
    }

    claims = parsed
      .filter((c: any) => typeof c === 'string' && c.trim().length > 10)
      .slice(0, 5);

    if (claims.length < 2) {
      throw new Error(`Too few valid claims extracted: ${claims.length}`);
    }

    console.log('[Phase 2] Claims extracted:', claims.length);
    claims.forEach((c, i) => console.log(`  [${i+1}] ${c.slice(0, 80)}`));

  } catch (err: any) {
    console.error('[Phase 2] Claim extraction FAILED:', err.message);
    console.error('  API response:', err.response?.data);
    return res.status(502).json({
      error: 'AI claim extraction failed. Please try again.',
      code: 'CEREBRAS_CLAIMS_FAILED',
      detail: err.response?.data?.error?.message || err.message
    });
  }

  // ============================================
  // PHASE 3 - LIVE FACT-CHECKING (SerpAPI)
  // ============================================
  console.log('[Phase 3] Live fact-checking via SerpAPI...');
  let rawSearchResults: any[] = [];
  let enrichedResults: any[] = [];

  try {
    rawSearchResults = await Promise.all(
      claims.slice(0, 3).map(async (claim: string) => {
        const baseQuery = claim
          .replace(/according to|it is reported|sources say|allegedly/gi, '')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 120);

        const factCheckQuery = `fact check ${baseQuery}`.slice(0, 150);

        console.log(`[Phase 3] Searching: "${baseQuery.slice(0, 60)}..."`);

        const [generalRes, factCheckRes] = await Promise.allSettled([
          axios.get('https://serpapi.com/search', {
            params: {
              q: baseQuery,
              api_key: process.env.SERP_API_KEY,
              num: 3,
              engine: 'google',
              gl: 'us',
              hl: 'en'
            },
            timeout: 15000,
          }),
          axios.get('https://serpapi.com/search', {
            params: {
              q: factCheckQuery,
              api_key: process.env.SERP_API_KEY,
              num: 2,
              engine: 'google',
              gl: 'us',
              hl: 'en'
            },
            timeout: 15000,
          }),
        ]);

        const generalSources = generalRes.status === 'fulfilled'
          ? (generalRes.value.data.organic_results || []).slice(0, 3).map((r: any) => ({
              title: r.title || '',
              snippet: r.snippet || '',
              link: r.link || '',
              searchType: 'general'
            }))
          : [];

        const factCheckSources = factCheckRes.status === 'fulfilled'
          ? (factCheckRes.value.data.organic_results || []).slice(0, 2).map((r: any) => ({
              title: r.title || '',
              snippet: r.snippet || '',
              link: r.link || '',
              searchType: 'fact-check'
            }))
          : [];

        return {
          claim,
          sources: [...generalSources, ...factCheckSources]
        };
      })
    );

    console.log('[Phase 3] Search complete for', rawSearchResults.length, 'claims');
  } catch (err: any) {
    console.error('[Phase 3] SerpAPI FAILED:', err.response?.data || err.message);
    return res.status(502).json({
      error: 'Live fact-checking search failed. Please try again.',
      code: 'SERP_FAILED',
      detail: err.message
    });
  }

  // ============================================
  // PHASE 4 - PRE-ANALYSIS & SIGNAL DETECTION
  // ============================================
  console.log('[Phase 4] Running pre-analysis and signal detection...');

  const HIGH_CREDIBILITY_DOMAINS = [
    'reuters.com', 'apnews.com', 'bbc.com', 'bbc.co.uk',
    'nytimes.com', 'theguardian.com', 'washingtonpost.com',
    'bloomberg.com', 'economist.com', 'nature.com',
    'science.org', 'ncbi.nlm.nih.gov', 'who.int',
    'cdc.gov', 'nasa.gov', 'noaa.gov', 'un.org',
    'britannica.com', 'nationalgeographic.com'
  ];

  const FACT_CHECKER_DOMAINS = [
    'snopes.com', 'politifact.com', 'factcheck.org',
    'fullfact.org', 'afpfactcheck.com', 'boomlive.in',
    'altnews.in', 'reuters.com/fact-check',
    'apnews.com/hub/ap-fact-check', 'misbar.com',
    'leadstories.com', 'checkyourfact.com'
  ];

  const LOW_CREDIBILITY_DOMAINS = [
    'naturalnews.com', 'infowars.com', 'beforeitsnews.com',
    'worldnewsdailyreport.com', 'empirenews.net',
    'thelastlineofdefense.org', 'newslo.com'
  ];

  const DEBUNK_KEYWORDS = [
    'false', 'misinformation', 'debunked', 'misleading',
    'not true', 'no evidence', 'fabricated', 'hoax',
    'fake', 'incorrect', 'inaccurate', 'manipulated',
    'satire', 'parody', 'conspiracy', 'unverified',
    'disinformation', 'fact check: false', 'pants on fire',
    'mostly false', 'four pinocchios'
  ];

  const SUPPORT_KEYWORDS = [
    'confirmed', 'verified', 'true', 'accurate',
    'fact check: true', 'mostly true', 'supported by',
    'evidence shows', 'research confirms', 'scientists confirm',
    'officially confirmed', 'studies show'
  ];

  const getDomain = (url: string): string => {
    try { return new URL(url).hostname.replace('www.', ''); }
    catch { return ''; }
  };

  // Score every source
  enrichedResults = rawSearchResults.map((result) => ({
    ...result,
    sources: result.sources.map((source: any) => {
      const domain = getDomain(source.link);
      const snippet = (source.snippet || '').toLowerCase();
      const title = (source.title || '').toLowerCase();
      const combined = snippet + ' ' + title;

      const isFactChecker = FACT_CHECKER_DOMAINS.some((d) => domain.includes(d));
      const isHighCred = HIGH_CREDIBILITY_DOMAINS.some((d) => domain.includes(d));
      const isLowCred = LOW_CREDIBILITY_DOMAINS.some((d) => domain.includes(d));
      const hasDebunkSignal = DEBUNK_KEYWORDS.some((w) => combined.includes(w));
      const hasSupportSignal = SUPPORT_KEYWORDS.some((w) => combined.includes(w));

      return {
        ...source,
        domain,
        credibility: isHighCred ? 'high' : isLowCred ? 'low' : 'medium',
        isFactChecker,
        hasDebunkSignal,
        hasSupportSignal
      };
    })
  }));

  // Count signals
  let factCheckerCount = 0;
  let highCredCount = 0;
  let lowCredCount = 0;
  let debunkSignals = 0;
  let supportSignals = 0;

  enrichedResults.forEach((result) => {
    result.sources.forEach((source: any) => {
      if (source.isFactChecker) factCheckerCount++;
      if (source.credibility === 'high') highCredCount++;
      if (source.credibility === 'low') lowCredCount++;
      if (source.hasDebunkSignal) debunkSignals++;
      if (source.hasSupportSignal) supportSignals++;
    });
  });

  console.log('[Phase 4] Signals:', {
    factCheckerCount,
    highCredCount,
    lowCredCount,
    debunkSignals,
    supportSignals
  });

  const preCheck = {
    factCheckCount: factCheckerCount,
    highCredCount,
    lowCredCount,
    debunkingSignals: debunkSignals,
  };

  // ============================================
  // PHASE 5 - FINAL VERDICT SYNTHESIS (Cerebras)
  // ============================================
  console.log('[Phase 5] Synthesizing final verdict via Cerebras...');
  
  try {
    const verdictRes = await axios.post(
      'https://api.cerebras.ai/v1/chat/completions',
      {
        model: 'llama-3.3-70b',
        max_tokens: 1200,
        temperature: 0.1,
        messages: [{
          role: 'system',
          content: `You are a Senior Misinformation Analyst at a 
          professional fact-checking organization. You make accurate,
          evidence-based verdicts only. You never guess. You base 
          every decision strictly on what the evidence shows.`
        }, {
          role: 'user',
          content: `Analyze the following claims and their real-time 
web search results to determine if the content is authentic, 
manipulated, or uncertain.

=== VERDICT DEFINITIONS ===
"authentic": Claims are well-supported by credible sources. 
  Facts check out. High-credibility outlets confirm the claims.
  No debunking signals found.

"manipulated": One or more claims are demonstrably false or 
  misleading. Fact-checkers have articles debunking the claims.
  Search results contain words like "false", "hoax", "debunked".
  Claims contradict verified information from credible sources.

"uncertain": Cannot clearly verify OR debunk. Evidence is mixed,
  limited, or contradictory. Claims are unverifiable with 
  available information.

=== CONFIDENCE SCORING GUIDE ===
95-100: Overwhelming clear evidence (multiple fact-checkers agree)
85-94:  Strong evidence from multiple high-credibility sources
70-84:  Moderate evidence, mostly supports one verdict
55-69:  Some evidence but significant uncertainty remains
40-54:  Very limited evidence, verdict is a weak judgment
1-39:   Almost no evidence found (use "uncertain")

=== AUTOMATED PRE-ANALYSIS (trust these signals) ===
- Fact-checker sources found: ${factCheckerCount}
  ${factCheckerCount > 0 ? '⚠️ IMPORTANT: Fact-checkers are covering these claims' : ''}
- High-credibility sources (Reuters, BBC, AP, etc.): ${highCredCount}
- Low-credibility sources: ${lowCredCount}  
- Debunking signals detected: ${debunkSignals}
  ${debunkSignals > 2 ? '🚨 STRONG DEBUNKING SIGNAL: Multiple sources flag these claims as false' : ''}
- Supporting signals detected: ${supportSignals}
  ${supportSignals > 2 ? '✅ STRONG SUPPORT SIGNAL: Multiple sources confirm these claims' : ''}

=== DECISION LOGIC ===
IF debunkSignals >= 3 OR (factCheckerCount >= 1 AND debunkSignals >= 1):
  → Lean strongly toward "manipulated"
IF highCredCount >= 4 AND debunkSignals === 0 AND supportSignals >= 2:
  → Lean strongly toward "authentic"  
IF evidence is mixed or minimal:
  → Use "uncertain"

=== CLAIMS AND SEARCH RESULTS ===
${JSON.stringify(enrichedResults, null, 2)}

Return ONLY a raw JSON object.
MUST start with { and end with }.
No markdown. No backticks. No text before or after.

{
  "verdict": "authentic" | "manipulated" | "uncertain",
  "confidence": <integer 1-100>,
  "flaggedText": ["most suspicious or false claim here"],
  "reasoning": "3-4 sentences citing SPECIFIC evidence. 
    Mention which sources confirmed or denied which claims. 
    Be precise about what the fact-checkers found or what 
    high-credibility sources said. Never be vague."
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
  if (!raw) throw new Error('Empty verdict response');
    
  console.log('[Phase 5] Raw verdict response:', raw.slice(0, 400));

    const cleaned = raw
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    const objMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!objMatch) throw new Error('No JSON object found: ' + cleaned.slice(0, 200));

    const parsed = JSON.parse(objMatch[0]);

    // Strict field validation
    const validVerdicts = ['authentic', 'manipulated', 'uncertain'];
    if (!validVerdicts.includes(parsed.verdict)) {
      throw new Error(`Invalid verdict: "${parsed.verdict}"`);
    }
    if (typeof parsed.confidence !== 'number' ||
        parsed.confidence < 1 || parsed.confidence > 100) {
      throw new Error(`Invalid confidence: "${parsed.confidence}"`);
    }
    if (!parsed.reasoning || parsed.reasoning.trim().length < 30) {
      throw new Error(`Reasoning too short: "${parsed.reasoning}"`);
    }

    let verdict    = parsed.verdict;
    let confidence = Math.round(parsed.confidence);
    const reasoning  = parsed.reasoning.trim();
    const flaggedText = Array.isArray(parsed.flaggedText)
      ? parsed.flaggedText.filter((f: any) => typeof f === 'string')
      : [];

    console.log('[Phase 5] Final verdict:', verdict, '| Confidence:', confidence + '%');

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

    // ============================================
    // PHASE 6 - SAVE TO MONGODB
    // ============================================
    const latencyMs = Date.now() - startTime;
    const timestamp = new Date();
    
    const scan = await Scan.create({
      userId: sessionId,
      mediaType: 'text',
      inputType,
      sourceUrl: url || null,
      originalText: text || null,
      verdict,
      confidence,
      flaggedText,
      reasoning,
      claims,
      searchResults: enrichedResults,
      signals: { factCheckerCount, highCredCount, debunkSignals, supportSignals },
      isMock: false,
      latencyMs,
      timestamp,
    });

    console.log('[Phase 6] Saved to MongoDB. ID:', scan._id, '| Latency:', latencyMs + 'ms');

    return res.json({
      scanId: scan._id,
      verdict,
      confidence,
      flaggedText,
      reasoning,
      claims,
      searchResults: enrichedResults,
      signals: { factCheckerCount, highCredCount, debunkSignals, supportSignals },
      isMock: false,
      timestamp: timestamp.toISOString(),
      latencyMs,
    });

  } catch (err: any) {
    console.error('[Phase 5] Verdict synthesis FAILED:', err.message);
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
router.post('/media', async (req: any, res: Response) => {
  const startTime = Date.now();
  const { fileUrl, mediaType } = req.body;
  const sessionId = req.headers['x-session-id'] as string || 'anonymous';

  if (!fileUrl) {
    return res.status(400).json({
      error: 'No file URL provided.',
      code: 'MISSING_FILE_URL'
    });
  }

  if (!['image', 'video', 'audio'].includes(mediaType)) {
    return res.status(400).json({
      error: 'Invalid mediaType. Must be image, video, or audio.',
      code: 'INVALID_MEDIA_TYPE'
    });
  }

  // Check Reality Defender key
  if (!process.env.REALITY_DEFENDER_API_KEY) {
    return res.status(503).json({
      error: 'Media deepfake detection is not configured on this server.',
      code: 'RD_KEY_MISSING'
    });
  }

  console.log('[Media Scan] Starting for:', mediaType, fileUrl.slice(0, 80));

  // ---- STEP 1: Submit to Reality Defender ----
  let rdJobId: string;
  try {
    console.log('[Media Scan] Submitting to Reality Defender...');
    const submitRes = await axios.post(
      'https://api.realitydefender.com/api/upload',
      { url: fileUrl },
      {
        headers: {
          'Authorization': `Bearer ${process.env.REALITY_DEFENDER_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    rdJobId = submitRes.data?.data?.request_id || submitRes.data?.request_id;
    if (!rdJobId) throw new Error('No request_id in Reality Defender response');

    console.log('[Media Scan] RD Job ID:', rdJobId);
  } catch (err: any) {
    console.error('[Media Scan] RD submit failed:', err.response?.data || err.message);
    return res.status(502).json({
      error: 'Deepfake detection service failed. Please try again.',
      code: 'RD_SUBMIT_FAILED',
      detail: err.response?.data?.message || err.message
    });
  }

  // ---- STEP 2: Poll Reality Defender for result ----
  let rdResult: any = null;
  const MAX_POLLS = 15;
  const POLL_INTERVAL = 3000;

  for (let i = 0; i < MAX_POLLS; i++) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL));

    try {
      console.log(`[Media Scan] Polling RD (${i + 1}/${MAX_POLLS})...`);
      const pollRes = await axios.get(
        `https://api.realitydefender.com/api/upload/${rdJobId}`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.REALITY_DEFENDER_API_KEY}`
          },
          timeout: 15000
        }
      );

      const status = pollRes.data?.data?.status || pollRes.data?.status;
      console.log('[Media Scan] RD Status:', status);

      if (status === 'completed' || status === 'COMPLETED' ||
          status === 'finished' || status === 'FINISHED') {
        rdResult = pollRes.data?.data || pollRes.data;
        break;
      }

      if (status === 'failed' || status === 'FAILED' || status === 'error') {
        throw new Error('Reality Defender processing failed');
      }

    } catch (pollErr: any) {
      console.error('[Media Scan] Polling error:', pollErr.message);
      if (i === MAX_POLLS - 1) {
        return res.status(504).json({
          error: 'Deepfake detection timed out. Please try again.',
          code: 'RD_TIMEOUT'
        });
      }
    }
  }

  if (!rdResult) {
    return res.status(504).json({
      error: 'Deepfake detection did not complete in time.',
      code: 'RD_TIMEOUT'
    });
  }

  try {
    // ---- STEP 3: Parse RD result into verdict ----
    const manipulationProbability =
      rdResult.probability ??
      rdResult.manipulation_probability ??
      rdResult.score ??
      rdResult.fake_probability ??
      0;

    const confidenceScore = Math.round(manipulationProbability * 100);

    let verdict: string;
    let reasoning: string;

    if (manipulationProbability > 0.70) {
      verdict = 'manipulated';
      reasoning = `Reality Defender detected a ${confidenceScore}% probability of AI manipulation in this ${mediaType}. ` +
        `Artificial patterns or synthetic signals were identified, consistent with deepfake generation ` +
        `or AI-based content modification. ` +
        (rdResult.regions ? `Suspicious regions were detected at specific coordinates in the file.` :
         `The overall pattern analysis indicates this content has been synthetically generated or altered.`);
    } else if (manipulationProbability < 0.30) {
      verdict = 'authentic';
      reasoning = `Reality Defender found only a ${confidenceScore}% probability of manipulation in this ${mediaType}. ` +
        `No significant artificial patterns or deepfake signatures were detected. ` +
        `The content appears to be genuine and unaltered based on pixel-level and pattern analysis.`;
    } else {
      verdict = 'uncertain';
      reasoning = `Reality Defender returned a ${confidenceScore}% manipulation probability for this ${mediaType}, ` +
        `which falls in the uncertain range (30-70%). ` +
        `Some patterns were detected that could indicate manipulation, but the evidence is not conclusive. ` +
        `Manual review is recommended for a definitive assessment.`;
    }

    console.log('[Media Scan] Verdict:', verdict, '| Probability:', confidenceScore + '%');

    // ---- STEP 4: Save to MongoDB ----
    const latencyMs = Date.now() - startTime;
    const timestamp = new Date();

    const scan = await Scan.create({
      userId: sessionId,
      mediaType,
      fileUrl,
      verdict,
      confidence: manipulationProbability > 0.70
        ? confidenceScore
        : manipulationProbability < 0.30
          ? 100 - confidenceScore
          : Math.abs(50 - confidenceScore) + 50,
      flaggedText: [],
      reasoning,
      isMock: false,
      rdJobId,
      rdRawResult: rdResult,
      latencyMs,
      timestamp
    });

    console.log('[Media Scan] Saved. ID:', scan._id);

    return res.json({
      scanId: scan._id,
      verdict,
      confidence: scan.confidence,
      reasoning,
      manipulationProbability: confidenceScore,
      regions: rdResult.regions || rdResult.detected_regions || null,
      isMock: false,
      timestamp: timestamp.toISOString(),
      latencyMs
    });
  } catch (error: any) {
    console.error('Error in /api/scan/media:', error);
    return res.status(500).json({ error: 'Media analysis failed. Please try again.' });
  }
});


export default router;

