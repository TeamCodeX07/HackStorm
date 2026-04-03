const HIGH_CREDIBILITY = [
  'reuters.com',
  'apnews.com',
  'bbc.com',
  'bbc.co.uk',
  'nytimes.com',
  'theguardian.com',
  'washingtonpost.com',
  'nature.com',
  'science.org',
  'ncbi.nlm.nih.gov',
  'who.int',
  'cdc.gov',
  'nasa.gov',
  'noaa.gov',
  'snopes.com',
  'politifact.com',
  'factcheck.org',
  'fullfact.org',
  'afpfactcheck.com',
];

const FACT_CHECKERS = [
  'snopes.com',
  'politifact.com',
  'factcheck.org',
  'fullfact.org',
  'afpfactcheck.com',
  'reuters.com/fact-check',
];

const LOW_CREDIBILITY = [
  'naturalnews.com',
  'infowars.com',
  'breitbart.com',
  'beforeitsnews.com',
  'worldnewsdailyreport.com',
];

export function scoreSource(url: string): {
  credibility: 'high' | 'medium' | 'low';
  isFactChecker: boolean;
  domain: string;
} {
  const normalizedUrl = url.toLowerCase();
  const domain = new URL(url).hostname.replace('www.', '');

  const isFactChecker = FACT_CHECKERS.some((fc) =>
    fc.includes('/') ? normalizedUrl.includes(fc) : domain.includes(fc)
  );
  const isHigh = HIGH_CREDIBILITY.some((h) => domain.includes(h));
  const isLow = LOW_CREDIBILITY.some((l) => domain.includes(l));

  return {
    credibility: isHigh ? 'high' : isLow ? 'low' : 'medium',
    isFactChecker,
    domain,
  };
}

export function enrichSources(results: any[]) {
  return results.map((result) => ({
    ...result,
    sources: result.sources.map((source: any) => {
      try {
        const score = scoreSource(source.link);
        return { ...source, ...score };
      } catch {
        return { ...source, credibility: 'medium', isFactChecker: false };
      }
    }),
  }));
}
