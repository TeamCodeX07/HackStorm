'use client';

import React from 'react';

interface MediaResultCardProps {
  result: {
    mediaType: 'image' | 'video' | 'audio';
    sourceUrl: string;
    verdict: 'authentic' | 'manipulated' | 'uncertain';
    confidence: number;
    reasoning: string;
    isMock: boolean;
    timestamp: string | Date;
    fileName?: string;
    detectedRegions?: any[];
    detectedTimestamps?: any[];
  };
}

export default function MediaResultCard({ result }: MediaResultCardProps) {
  const { 
    mediaType, 
    sourceUrl, 
    verdict, 
    confidence, 
    reasoning, 
    isMock, 
    timestamp, 
    fileName,
    detectedRegions,
    detectedTimestamps 
  } = result;

  const getVerdictStyles = () => {
    switch (verdict) {
      case 'authentic':
        return {
          text: 'text-emerald-400',
          bg: 'bg-emerald-500/10',
          border: 'border-emerald-500/50',
          bar: 'bg-emerald-500'
        };
      case 'manipulated':
        return {
          text: 'text-rose-400',
          bg: 'bg-rose-500/10',
          border: 'border-rose-500/50',
          bar: 'bg-rose-500'
        };
      default:
        return {
          text: 'text-amber-400',
          bg: 'bg-amber-500/10',
          border: 'border-amber-500/50',
          bar: 'bg-amber-500'
        };
    }
  };

  const styles = getVerdictStyles();

  return (
    <div className="mt-8 overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-5 duration-700">
      {isMock && (
        <div className="flex items-center justify-center gap-2 bg-amber-500/20 py-2 text-center text-xs font-bold uppercase tracking-widest text-amber-500">
          <span>⚠️ Demo mode — result is simulated</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2">
        {/* Media Preview Section */}
        <div className="relative aspect-square md:aspect-auto h-full min-h-[300px] bg-black/40 overflow-hidden group">
          {mediaType === 'image' ? (
            <>
              <img 
                src={sourceUrl} 
                alt="Uploaded media" 
                className="h-full w-full object-contain transition-transform duration-700 group-hover:scale-105"
              />
              {/* Highlight regions if any */}
              {detectedRegions?.map((region, idx) => (
                <div 
                  key={idx}
                  className="absolute border-2 border-rose-500 bg-rose-500/20 animate-pulse"
                  style={{
                    left: `${region.x}%`,
                    top: `${region.y}%`,
                    width: `${region.width}%`,
                    height: `${region.height}%`
                  }}
                />
              ))}
            </>
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-4 text-gray-500">
              {mediaType === 'video' ? (
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m22 8-6 4 6 4V8Z"></path>
                  <rect width="14" height="12" x="2" y="6" rx="2" ry="2"></rect>
                </svg>
              ) : (
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18V5l12-2v13"></path>
                  <circle cx="6" cy="18" r="3"></circle>
                  <circle cx="18" cy="16" r="3"></circle>
                </svg>
              )}
              <span className="font-bold uppercase tracking-widest text-sm">{mediaType} File</span>
              <a 
                href={sourceUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="rounded-full bg-white/10 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-white/20"
              >
                View Original
              </a>
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="p-6 md:p-8">
          <div className="flex items-center justify-between">
            <span className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${styles.text} ${styles.border} ${styles.bg}`}>
              {verdict}
            </span>
            <span className="text-xs text-gray-500">
              {new Date(timestamp).toLocaleString()}
            </span>
          </div>

          <h2 className="mt-6 text-2xl font-bold text-white break-words">
            {fileName || 'Media Analysis'}
          </h2>

          <div className="mt-8">
            <div className="flex items-end justify-between">
              <span className="text-sm font-semibold text-gray-400 uppercase tracking-widest">
                Manipulation Probability
              </span>
              <span className={`text-2xl font-black ${styles.text}`}>
                {confidence}%
              </span>
            </div>
            <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-white/5">
              <div 
                className={`h-full transition-all duration-1000 ease-out ${styles.bar}`}
                style={{ width: `${confidence}%` }}
              />
            </div>
          </div>

          <div className="mt-8 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-white">AI Reasoning</h3>
            <p className="text-sm leading-relaxed text-gray-400">
              {reasoning}
            </p>
          </div>

          {detectedTimestamps && detectedTimestamps.length > 0 && (
            <div className="mt-8 space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-widest text-white">Timestamp Markers</h3>
              <div className="flex flex-wrap gap-2">
                {detectedTimestamps.map((t, idx) => (
                  <span key={idx} className="rounded-lg bg-rose-500/20 px-2 py-1 text-xs font-medium text-rose-400">
                    {t.start}s - {t.end}s
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
