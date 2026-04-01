import axios from 'axios';

interface SearchResult {
  title: string;
  snippet: string;
  link: string;
}

export async function searchClaim(claim: string): Promise<SearchResult[]> {
  const apiKey = process.env.SERP_API_KEY;
  if (!apiKey) {
    throw new Error('SERP_API_KEY environment variable is not set');
  }

  try {
    const response = await axios.get('https://serpapi.com/search', {
      params: {
        q: claim,
        api_key: apiKey,
        engine: 'google',
        num: 3,
      },
    });

    const organicResults = response.data.organic_results || [];
    
    return organicResults.slice(0, 3).map((result: any) => ({
      title: result.title || 'No title',
      snippet: result.snippet || 'No snippet available',
      link: result.link || '#',
    }));
  } catch (error) {
    console.error('Error searching with SerpAPI:', error);
    // Return empty array on error to allow processing to continue
    return [];
  }
}

export async function searchAllClaims(claims: string[]): Promise<
  {
    claim: string;
    sources: SearchResult[];
  }[]
> {
  // Search all claims in parallel
  const searchPromises = claims.map(async (claim) => {
    const sources = await searchClaim(claim);
    return { claim, sources };
  });

  return Promise.all(searchPromises);
}
