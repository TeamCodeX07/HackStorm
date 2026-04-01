'use client';

import React from 'react';
import Link from 'next/link';

export default function LandingPage() {
  const scrollToFeatures = () => {
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 selection:bg-blue-500/30">
      {/* Navigation */}
      <nav className="fixed top-0 z-50 w-full border-b border-white/5 bg-gray-950/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center font-black italic text-white">T</div>
            <span className="text-xl font-bold tracking-tight text-white">Truth<span className="text-blue-500">Lens</span></span>
          </div>
          <div className="hidden items-center gap-8 text-sm font-medium text-gray-400 md:flex">
            <button onClick={scrollToFeatures} className="hover:text-white transition-colors">Features</button>
            <Link href="/scan" className="hover:text-white transition-colors">Scan Now</Link>
            <Link href="/history" className="hover:text-white transition-colors">History</Link>
          </div>
          <Link 
            href="/auth" 
            className="rounded-full bg-white px-5 py-2 text-sm font-bold text-black transition-all hover:bg-gray-200 active:scale-95"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 pt-20 text-center">
        {/* Background glow effects */}
        <div className="absolute top-1/4 -z-10 h-96 w-96 rounded-full bg-blue-600/20 blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-1/4 -z-10 h-96 w-96 rounded-full bg-indigo-600/10 blur-[120px] animate-pulse delay-700"></div>

        <div className="max-w-4xl animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <div className="mb-6 inline-block rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-blue-400">
            Powered by Llama 3.3 & Reality Defender
          </div>
          <h1 className="text-5xl font-black tracking-tighter text-white md:text-7xl lg:text-8xl">
            Detect <span className="bg-gradient-to-r from-blue-500 to-indigo-400 bg-clip-text text-transparent">Misinformation</span> in Seconds.
          </h1>
          <p className="mt-8 text-lg text-gray-400 md:text-xl md:leading-relaxed max-w-2xl mx-auto">
            The world's first unified platform for factual verification and deepfake detection. 
            Protect your truth with enterprise-grade AI analysis.
          </p>
          <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link 
              href="/auth" 
              className="w-full rounded-full bg-blue-600 px-8 py-4 text-lg font-bold text-white transition-all hover:bg-blue-500 hover:shadow-[0_0_30px_rgba(37,99,235,0.4)] active:scale-95 sm:w-auto"
            >
              Try it Free
            </Link>
            <button 
              onClick={scrollToFeatures}
              className="w-full rounded-full border border-white/10 bg-white/5 px-8 py-4 text-lg font-bold text-white transition-all hover:bg-white/10 active:scale-95 sm:w-auto"
            >
              See How It Works
            </button>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="mt-24 grid w-full max-w-6xl grid-cols-2 gap-8 border-y border-white/5 bg-white/[0.02] p-8 backdrop-blur-sm md:grid-cols-4 md:rounded-3xl md:border-x">
          <div className="flex flex-col items-center gap-1">
            <span className="text-3xl font-black text-white">4</span>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">Content Types</span>
          </div>
          <div className="flex flex-col items-center gap-1 border-white/5 md:border-l">
            <span className="text-3xl font-black text-white">&lt;3s</span>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">Avg Latency</span>
          </div>
          <div className="flex flex-col items-center gap-1 border-white/5 md:border-l">
            <span className="text-3xl font-black text-white">5+</span>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">AI Integrations</span>
          </div>
          <div className="flex flex-col items-center gap-1 border-white/5 md:border-l">
            <span className="text-3xl font-black text-white">100%</span>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">Free Tier</span>
          </div>
        </div>
      </section>

      {/* Feature Cards Section */}
      <section id="features" className="py-32 px-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-20 text-center">
            <h2 className="text-3xl font-black text-white md:text-5xl">Engineered for Accuracy</h2>
            <p className="mt-4 text-gray-400">Advanced tools to navigate the digital wasteland.</p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {/* Factual Analysis */}
            <div className="group rounded-3xl border border-white/10 bg-white/5 p-8 transition-all hover:bg-white/[0.08] hover:shadow-2xl">
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600/10 text-blue-500 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white">Advanced Factual Analysis</h3>
              <p className="mt-3 text-gray-400 leading-relaxed">
                Our AI scans billions of data points in real-time to verify claims from any article or text snippet. 
                Full source citations included.
              </p>
            </div>

            {/* Deepfake Detection */}
            <div className="group rounded-3xl border border-white/10 bg-white/5 p-8 transition-all hover:bg-white/[0.08] hover:shadow-2xl">
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600/10 text-indigo-500 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <circle cx="8.5" cy="8.5" r="1.5"></circle>
                  <polyline points="21 15 16 10 5 21"></polyline>
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white">Neural Deepfake Detection</h3>
              <p className="mt-3 text-gray-400 leading-relaxed">
                Scan images, video, and audio for synthetic manipulation. 
                Uses multi-layer probability models to detect high-end digital forgery.
              </p>
            </div>

            {/* Scan History */}
            <div className="group rounded-3xl border border-white/10 bg-white/5 p-8 transition-all hover:bg-white/[0.08] hover:shadow-2xl">
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-600/10 text-teal-500 group-hover:bg-teal-600 group-hover:text-white transition-colors">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 8v4l3 3"></path>
                  <circle cx="12" cy="12" r="9"></circle>
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white">Full Audit History</h3>
              <p className="mt-3 text-gray-400 leading-relaxed">
                Never lose a scan. Every analysis is saved to your private dashboard 
                with full records of reasoning, sources, and manipulation markers.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="bg-white/[0.01] py-32 px-6">
        <div className="mx-auto max-w-5xl">
          <div className="mb-20 text-center">
            <h2 className="text-3xl font-black text-white md:text-5xl">How It Works</h2>
            <p className="mt-4 text-gray-400">A seamless flow from uncertainty to clarity.</p>
          </div>

          <div className="flex flex-col gap-12 md:flex-row md:items-center">
            <div className="flex flex-1 flex-col items-center text-center">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-gray-700 text-2xl font-black text-white">1</div>
              <h4 className="text-lg font-bold text-white">Submit Content</h4>
              <p className="mt-2 text-sm text-gray-500">Paste text, a URL, or upload your media files safely.</p>
            </div>
            
            <div className="hidden h-px flex-1 bg-gradient-to-r from-transparent via-gray-700 to-transparent md:block"></div>

            <div className="flex flex-1 flex-col items-center text-center">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-gray-700 text-2xl font-black text-white">2</div>
              <h4 className="text-lg font-bold text-white">AI Cross-Analysis</h4>
              <p className="mt-2 text-sm text-gray-500">Neural networks analyze patterns and verify sources instantly.</p>
            </div>

            <div className="hidden h-px flex-1 bg-gradient-to-r from-transparent via-gray-700 to-transparent md:block"></div>

            <div className="flex flex-1 flex-col items-center text-center">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-blue-500/50 bg-blue-500/10 text-2xl font-black text-blue-500 transition-transform hover:scale-110">3</div>
              <h4 className="text-lg font-bold text-white font-black italic">The Verdict</h4>
              <p className="mt-2 text-sm text-gray-500">Receive a clear authenticity score and reasoning report.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-16 px-6">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-8 md:flex-row">
          <div className="flex items-center gap-2 grayscale group-hover:grayscale-0 transition-all">
            <div className="h-6 w-6 rounded bg-gray-800 flex items-center justify-center font-bold text-[10px] text-white">T</div>
            <span className="text-sm font-bold text-gray-500 tracking-widest">TRUTHLENS v1.0</span>
          </div>
          <div className="text-center text-[10px] font-medium uppercase tracking-[0.3em] text-gray-700">
            Built for HackStorm 2026 • AI Safety & Integrity Track
          </div>
          <a 
            href="https://github.com/sayim/hackstorm" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-white transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
            </svg>
            GitHub
          </a>
        </div>
      </footer>
    </div>
  );
}
