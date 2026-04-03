'use client';
/* eslint-disable react/no-unescaped-entities */


import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSessionId } from '@/lib/session';
import { toast } from 'react-hot-toast';

export default function SettingsPage() {
  const router = useRouter();
  const [sessionId, setSessionId] = useState('');
  const [sessionScans, setSessionScans] = useState(0);

  useEffect(() => {
    // In a real app, this might come from a context or session storage
    const count = sessionStorage.getItem('session_scan_count') || '0';
    setSessionScans(parseInt(count));
    setSessionId(getSessionId());
  }, []);

  const handleClearHistory = () => {
    if (confirm('Are you sure you want to clear your strictly local session history? Note: Server history for this session is not deleted by this simple frontend action, but your session id will be regenerated.')) {
      localStorage.removeItem('tl_session_id');
      sessionStorage.removeItem('session_scan_count');
      setSessionId(getSessionId());
      setSessionScans(0);
      toast.success('Session reset successfully. Your identity has rolled over.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black p-4 py-8 md:p-8">
        <div className="mx-auto max-w-2xl">
          <div className="mb-10 animate-in fade-in slide-in-from-top-4 duration-700">
            <h1 className="text-3xl font-black text-white md:text-4xl">
              Account <span className="text-blue-500">Settings</span>
            </h1>
            <p className="mt-2 text-gray-400">Manage your profile and account preferences.</p>
          </div>

          <div className="space-y-6">
            {/* Profile Section */}
            <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-lg font-bold text-white uppercase tracking-widest border-b border-white/5 pb-4 mb-6">Your Profile</h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Session ID</label>
                  <div className="w-full rounded-xl bg-white/5 p-4 text-gray-400 border border-white/5 break-all">
                    {sessionId || 'Loading...'}
                  </div>
                  <p className="mt-2 text-xs text-gray-500">Your session ID acts as your anonymous identity. You do not need to sign in while using TruthLens.</p>
                </div>
              </div>
            </div>

            {/* Session Stats */}
            <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
              <h2 className="text-lg font-bold text-white uppercase tracking-widest border-b border-white/5 pb-4 mb-6">Session Usage</h2>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400">Content Scans</p>
                  <p className="text-xs text-gray-500">Lifetime usage available in history.</p>
                </div>
                <div className="text-3xl font-black text-blue-500">
                  {sessionScans} <span className="text-xs font-bold text-gray-600 uppercase tracking-tighter">scans</span>
                </div>
              </div>
              <div className="mt-6 h-2 w-full rounded-full bg-white/5 overflow-hidden">
                <div 
                  className="h-full bg-blue-500 transition-all duration-1000"
                  style={{ width: `${Math.min((sessionScans / 20) * 100, 100)}%` }}
                />
              </div>
            </div>

            {/* Footer / Reset Action */}
            <div className="pt-4 text-center">
              <button
                onClick={handleClearHistory}
                className="group flex w-full items-center justify-center gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/5 py-4 font-bold text-rose-400 transition-all hover:bg-rose-500/10 active:scale-[0.98]"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"></path>
                  <polyline points="21 3 21 8 16 8"></polyline>
                </svg>
                Reset Session Identity
              </button>
              <p className="mt-4 text-[10px] uppercase tracking-[0.2em] text-gray-700">TruthLens Anonymous Session Tracking</p>
            </div>
          </div>
        </div>
      </div>
  );
}
