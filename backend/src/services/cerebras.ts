import OpenAI from 'openai';

// Cerebras uses OpenAI-compatible API
const cerebras = new OpenAI({
  apiKey: process.env.CEREBRAS_API_KEY,
  baseURL: 'https://api.cerebras.ai/v1',
});

export async function extractClaims(text: string): Promise<string[]> {
  try {
    const response = await cerebras.chat.completions.create({
      model: 'llama-3.3-70b',
      messages: [
        {
          role: 'system',
          content: 'You are a fact-checking assistant that extracts verifiable factual claims from text.',
        },
        {
          role: 'user',
          content: `Extract the top 5 verifiable factual claims from this article as a JSON array of strings. Return ONLY a valid JSON array, no other text.\n\nArticle:\n${text}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 1000,
    });

    const content = response.choices[0]?.message?.content || '[]';
    
    // Parse the JSON response
    try {
      const claims = JSON.parse(content);
      return Array.isArray(claims) ? claims.slice(0, 5) : [];
    } catch (parseError) {
      console.error('Failed to parse claims JSON:', content);
      // Try to extract JSON from markdown code block
      const jsonMatch = content.match(/```(?:json)?\n?([\s\S]*?)\n?```/);
      if (jsonMatch) {
        const claims = JSON.parse(jsonMatch[1]);
        return Array.isArray(claims) ? claims.slice(0, 5) : [];
      }
      return [];
    }
  } catch (error) {
    console.error('Error extracting claims from Cerebras:', error);
    throw new Error('Failed to extract claims from text');
  }
}

interface ClaimWithSources {
  claim: string;
  sources: {
    title: string;
    snippet: string;
    link: string;
  }[];
}

interface VerificationResult {
  verdict: 'authentic' | 'manipulated' | 'uncertain';
  confidence: number;
  flaggedText: string[];
  reasoning: string;
}

export async function verifyClaimsWithSources(
  claims: ClaimWithSources[]
): Promise<VerificationResult> {
  try {
    const claimsText = claims
      .map((c, i) => {
        const sourcesText = c.sources
          .map(
            (s, j) =>
              `   Source ${j + 1}: ${s.title}\n   Snippet: ${s.snippet}\n   Link: ${s.link}`
          )
          .join('\n\n');
        return `Claim ${i + 1}: ${c.claim}\nSources:\n${sourcesText}`;
      })
      .join('\n\n');

    const response = await cerebras.chat.completions.create({
      model: 'llama-3.3-70b',
      messages: [
        {
          role: 'system',
          content:
            'You are an expert fact-checker. Analyze claims and their sources to determine authenticity.',
        },
        {
          role: 'user',
          content: `Analyze these claims and their sources. Return ONLY a valid JSON object with this exact structure:
{
  "verdict": "authentic" | "manipulated" | "uncertain",
  "confidence": <number 0-100>,
  "flaggedText": [<array of suspicious claims as strings>],
  "reasoning": "<plain English explanation of your analysis>"
}

Claims to analyze:
${claimsText}

Consider:
- Do sources support or contradict the claims?
- Are sources credible?
- Is information consistent across sources?
- Are there red flags or inconsistencies?`,
        },
      ],
      temperature: 0.5,
      max_tokens: 1500,
    });

    const content = response.choices[0]?.message?.content || '{}';

    try {
      const result = JSON.parse(content);
      
      // Validate and normalize the result
      return {
        verdict: ['authentic', 'manipulated', 'uncertain'].includes(result.verdict)
          ? result.verdict
          : 'uncertain',
        confidence: Math.min(Math.max(result.confidence || 0, 0), 100),
        flaggedText: Array.isArray(result.flaggedText) ? result.flaggedText : [],
        reasoning: result.reasoning || 'Analysis could not be completed.',
      };
    } catch (parseError) {
      console.error('Failed to parse verification JSON:', content);
      // Try to extract JSON from markdown code block
      const jsonMatch = content.match(/```(?:json)?\n?([\s\S]*?)\n?```/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[1]);
        return {
          verdict: ['authentic', 'manipulated', 'uncertain'].includes(result.verdict)
            ? result.verdict
            : 'uncertain',
          confidence: Math.min(Math.max(result.confidence || 0, 0), 100),
          flaggedText: Array.isArray(result.flaggedText) ? result.flaggedText : [],
          reasoning: result.reasoning || 'Analysis could not be completed.',
        };
      }
      
      // Fallback
      return {
        verdict: 'uncertain',
        confidence: 0,
        flaggedText: [],
        reasoning: 'Unable to parse verification results.',
      };
    }
  } catch (error) {
    console.error('Error verifying claims with Cerebras:', error);
    throw new Error('Failed to verify claims');
  }
}
