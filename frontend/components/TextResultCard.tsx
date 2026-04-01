'use client';

import React from 'react';

interface Source {
  title: string;
  snippet: string;
  link: string;
}

interface Claim {
  claim: string;
  sources: Source[];
}

interface TextResultCardProps {
  result: {
    verdict: 'authentic' | 'manipulated' | 'uncertain';
    confidence: number;
    reasoning: string;
    flaggedText?: string[];
    timestamp: string | Date;
    claims?: Claim[];
  };
}

export default function TextResultCard({ result }: TextResultCardProps) {
  const { verdict, confidence, reasoning, flaggedText, timestamp, claims } = result;

  const getVerdictColor = () => {
    switch (verdict) {
      case 'authentic':
        return 'text-emerald-400 border-emerald-500/50 bg-emerald-500/10';
      case 'manipulated':
        return 'text-rose-400 border-rose-500/50 bg-rose-500/10';
      default:
        return 'text-amber-400 border-amber-500/50 bg-amber-500/10';
    }
  };

  const getVerdictLabel = () => {
    return verdict.charAt(0).toUpperCase() + verdict.slice(1);
  };

  return (
    <div className="mt-8 overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl transition-all duration-500 animate-in fade-in slide-in-from-bottom-5">
      <div className="p-6 md:p-8">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div>
            <div className="flex items-center gap-3">
              <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wider ${getVerdictColor()}`}>
                {getVerdictLabel()}
              </span>
              <span className="text-sm text-gray-400">
                {new Date(timestamp).toLocaleString()}
              </span>
            </div>
            <h2 className="mt-4 text-2xl font-bold text-white md:text-3xl">
              Scan Result
            </h2>
          </div>

          <div className="relative flex h-24 w-24 items-center justify-center">
            {/* Animated Confidence Ring */}
            <svg className="h-full w-full -rotate-90 transform">
              <circle
                cx="48"
                cy="48"
                r="40"
                stroke="currentColor"
                strokeWidth="8"
                fill="transparent"
                className="text-white/5"
              />
              <circle
                cx="48"
                cy="48"
                r="40"
                stroke="currentColor"
                strokeWidth="8"
                fill="transparent"
                strokeDasharray={251.2}
                strokeDashoffset={251.2 - (251.2 * confidence) / 100}
                strokeLinecap="round"
                className={`transition-all duration-1000 ease-out ${
                  verdict === 'authentic' ? 'text-emerald-500' : 
                  verdict === 'manipulated' ? 'text-rose-500' : 'text-amber-500'
                }`}
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-xl font-bold text-white">{confidence}%</span>
              <span className="text-[10px] uppercase text-gray-400">Confidence</span>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <h3 className="text-lg font-semibold text-white">Analysis Reasoning</h3>
          <p className="mt-3 text-gray-300 leading-relaxed">
            {reasoning}
          </p>
        </div>

        {flaggedText && flaggedText.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold text-rose-400">Flagged Claims</h3>
            <div className="mt-4 space-y-4">
              {claims?.filter(c => flaggedText.includes(c.claim)).map((claim, idx) => (
                <div key={idx} className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4">
                  <p className="font-medium text-white">{claim.claim}</p>
                  <div className="mt-3 space-y-2">
                    <p className="text-xs font-semibold uppercase text-gray-500">Sources:</p>
                    {claim.sources.map((source, sIdx) => (
                      <a 
                        key={sIdx}
                        href={source.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-start gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        <span className="mt-1 flex-shrink-0">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                            <polyline points="15 3 21 3 21 9"></polyline>
                            <line x1="10" y1="14" x2="21" y2="3"></line>
                          </svg>
                        </span>
                        <div>
                          <p className="font-medium group-hover:underline">{source.title}</p>
                          <p className="text-xs text-gray-500 line-clamp-1">{source.snippet}</p>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              ))}
              {/* Fallback if claims data isn't matched perfectly */}
              {(!claims || claims.length === 0) && flaggedText.map((text, idx) => (
                <div key={idx} className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 uppercase text-rose-400 text-sm">
                  {text}
                </div>
              ))}
            </div>
          </div>
        )}

        {(!flaggedText || flaggedText.length === 0) && verdict === 'authentic' && (
          <div className="mt-8 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-6 flex items-center gap-4 text-emerald-400">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            <div>
              <p className="font-semibold">Verification Successful</p>
              <p className="text-sm text-emerald-400/80">All claims found in the content appear to be consistent with verified sources.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
