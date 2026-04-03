'use client';

import React, { useState } from 'react';

import TextResultCard from '@/components/TextResultCard';
import MediaUploader from '@/components/MediaUploader';
import MediaResultCard from '@/components/MediaResultCard';
import ScanSkeleton from '@/components/ScanSkeleton';
import { toast } from 'react-hot-toast';
import { apiFetch } from '@/lib/apiFetch';

type ScanType = 'text' | 'media';
type TextScanMode = 'url' | 'text';

export default function ScanPage() {

  const [scanType, setScanType] = useState<ScanType>('text');
  const [textMode, setTextMode] = useState<TextScanMode>('url');
  const [textValue, setTextValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [textResult, setTextResult] = useState<any>(null);
  const [mediaResult, setMediaResult] = useState<any>(null);

  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textValue.trim()) return;

    setLoading(true);
    setError(null);
    setTextResult(null);
    setMediaResult(null);

    const toastId = toast.loading('Analyzing content...');

    try {


      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

      const response = await apiFetch(`${backendUrl}/api/scan/text`, {
        method: 'POST',
        body: JSON.stringify({
          [textMode]: textValue,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error(`Rate limit exceeded. Please wait ${data.retryAfter}s.`);
        }
        const messages: Record<string, string> = {
          'URL_FETCH_FAILED': 'Could not fetch the article. Try pasting the text directly.',
          'TEXT_TOO_SHORT': textMode === 'url'
            ? 'Not enough content found at this URL. Try pasting the text directly.'
            : 'Text is too short. Please paste at least 50 characters to analyze.',
          'CEREBRAS_CLAIMS_FAILED': 'AI analysis failed. Check your Cerebras API key.',
          'CEREBRAS_VERDICT_FAILED': 'AI verdict synthesis failed. Please try again.',
          'SERP_FAILED': 'Fact-checking search failed. Please try again.',
          'UNKNOWN_ERROR': 'Something went wrong. Check backend logs.',
        };
        throw new Error(messages[data.code] || data.error || data.message || 'Analysis failed');
      }

      setTextResult(data);
      toast.success('Scan complete', { id: toastId });
      
      // Update session scan count
      const count = parseInt(sessionStorage.getItem('session_scan_count') || '0');
      sessionStorage.setItem('session_scan_count', (count + 1).toString());
    } catch (err: any) {

      console.error('Scan error:', err);
      setError(err.message || 'An unexpected error occurred.');
      toast.error(err.message, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const handleMediaSuccess = async (url: string, type: 'image' | 'video' | 'audio', name: string) => {
    setLoading(true);
    setError(null);
    setTextResult(null);
    setMediaResult(null);

    const toastId = toast.loading(`Processing ${type} analysis...`);

    try {


      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

      const response = await apiFetch(`${backendUrl}/api/scan/media`, {
        method: 'POST',
        body: JSON.stringify({
          fileUrl: url,
          mediaType: type,
          fileName: name
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error(`Rate limit exceeded. Please wait ${data.retryAfter}s.`);
        }
        throw new Error(data.error || 'Media analysis failed.');
      }

      setMediaResult(data);
      toast.success('Analysis complete', { id: toastId });

      // Update session scan count
      const count = parseInt(sessionStorage.getItem('session_scan_count') || '0');
      sessionStorage.setItem('session_scan_count', (count + 1).toString());
    } catch (err: any) {

      setError(err.message);
      toast.error(err.message, { id: toastId });
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black p-4 py-8 md:p-8">
        <div className="mx-auto max-w-4xl">
          <div className="mb-12 text-center animate-in fade-in slide-in-from-top-4 duration-700">
            <h1 className="text-4xl font-black tracking-tight text-white md:text-5xl lg:text-6xl">
              Truth<span className="text-blue-500">Lens</span> Scan
            </h1>
            <p className="mt-4 text-lg text-gray-400">
              Verify the authenticity of any content using state-of-the-art AI.
            </p>
          </div>

          <div className="flex justify-center gap-4 mb-8">
            <button 
              onClick={() => setScanType('text')}
              className={`rounded-full px-8 py-3 text-sm font-bold uppercase tracking-widest transition-all ${
                scanType === 'text' ? 'bg-blue-600 text-white' : 'bg-white/5 text-gray-500 hover:text-white'
              }`}
            >
              Factual Scan
            </button>
            <button 
              onClick={() => setScanType('media')}
              className={`rounded-full px-8 py-3 text-sm font-bold uppercase tracking-widest transition-all ${
                scanType === 'media' ? 'bg-blue-600 text-white' : 'bg-white/5 text-gray-500 hover:text-white'
              }`}
            >
              Media Deepfake
            </button>
          </div>

          {scanType === 'text' ? (
            <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-500">
              <div className="flex border-b border-white/10">
                <button
                  onClick={() => setTextMode('url')}
                  className={`flex-1 py-4 text-sm font-bold uppercase tracking-widest transition-all ${
                    textMode === 'url' ? 'bg-white/10 text-blue-400' : 'text-gray-500 hover:text-white'
                  }`}
                >
                  Paste URL
                </button>
                <button
                  onClick={() => setTextMode('text')}
                  className={`flex-1 py-4 text-sm font-bold uppercase tracking-widest transition-all ${
                    textMode === 'text' ? 'bg-white/10 text-blue-400' : 'text-gray-500 hover:text-white'
                  }`}
                >
                  Paste Text
                </button>
              </div>

              <form onSubmit={handleTextSubmit} className="p-6 md:p-8">
                <div className="relative group">
                  {textMode === 'url' ? (
                    <input
                      type="url"
                      placeholder="https://example.com/article-to-verify"
                      value={textValue}
                      onChange={(e) => setTextValue(e.target.value)}
                      className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 text-white placeholder-gray-600 outline-none transition-all focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 group-hover:border-white/20"
                      required
                    />
                  ) : (
                    <textarea
                      placeholder="Paste the article content here (min 50 characters)..."
                      value={textValue}
                      onChange={(e) => setTextValue(e.target.value)}
                      rows={8}
                      minLength={50}
                      className="w-full resize-none rounded-2xl border border-white/10 bg-black/40 p-4 text-white placeholder-gray-600 outline-none transition-all focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 group-hover:border-white/20"
                      required
                    />
                  )}
                </div>

                {error && (
                  <div className="mt-6 flex items-center gap-3 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-rose-400 animate-in shake duration-300">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="8" x2="12" y2="12"></line>
                      <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    <span className="text-sm font-medium">{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !textValue.trim()}
                  className={`mt-8 w-full rounded-2xl py-4 text-lg font-bold text-white transition-all duration-300 ${
                    loading || !textValue.trim()
                      ? 'cursor-not-allowed bg-gray-800 text-gray-500'
                      : 'bg-blue-600 hover:bg-blue-500 hover:shadow-[0_0_20px_rgba(37,99,235,0.4)] active:scale-[0.98]'
                  }`}
                >
                  {loading ? (
                    <div className="flex items-center justify-center gap-3">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white"></div>
                      <span>Analyzing Content...</span>
                    </div>
                  ) : (
                    'Start Factual Analysis'
                  )}
                </button>
              </form>
            </div>
          ) : (
            <div className="animate-in fade-in zoom-in-95 duration-500">
              <MediaUploader onSuccess={handleMediaSuccess} />
              
              {error && (
                <div className="mt-6 flex items-center gap-3 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-rose-400 animate-in shake duration-300">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                  </svg>
                  <span className="text-sm font-medium">{error}</span>
                </div>
              )}
            </div>
          )}

          {loading && !textResult && !mediaResult && <ScanSkeleton />}

          {textResult && <TextResultCard result={textResult} />}

          {mediaResult && <MediaResultCard result={mediaResult} />}
        </div>
      </div>
  );
}

