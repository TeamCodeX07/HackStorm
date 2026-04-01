'use client';
/* eslint-disable react/no-unescaped-entities */


import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { updateProfile } from 'firebase/auth';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'react-hot-toast';

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [updating, setUpdating] = useState(false);
  const [sessionScans, setSessionScans] = useState(0);

  useEffect(() => {
    // In a real app, this might come from a context or session storage
    const count = sessionStorage.getItem('session_scan_count') || '0';
    setSessionScans(parseInt(count));
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || updating) return;

    setUpdating(true);
    const toastId = toast.loading('Updating profile...');
    
    try {
      await updateProfile(user, {
        displayName: displayName,
      });
      toast.success('Display name updated!', { id: toastId });
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile', { id: toastId });
    } finally {
      setUpdating(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await logout();
      toast.success('Signed out successfully');
      router.push('/');
    } catch (error) {
      toast.error('Failed to sign out');
    }
  };

  return (
    <ProtectedRoute>
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
                  <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Email Address</label>
                  <div className="w-full rounded-xl bg-white/5 p-4 text-gray-400 border border-white/5">
                    {user?.email}
                  </div>
                </div>

                <form onSubmit={handleUpdateProfile}>
                  <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Display Name</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Enter your name"
                      className="flex-1 rounded-xl border border-white/10 bg-black/40 p-4 text-white placeholder-gray-600 outline-none transition-all focus:border-blue-500/50"
                    />
                    <button
                      type="submit"
                      disabled={updating || displayName === (user?.displayName || '')}
                      className="rounded-xl bg-blue-600 px-6 font-bold text-white transition-all hover:bg-blue-50 hover:disabled:bg-blue-600 disabled:opacity-50"
                    >
                      {updating ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </form>
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

            {/* Logout */}
            <div className="pt-4 text-center">
              <button
                onClick={handleSignOut}
                className="group flex w-full items-center justify-center gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/5 py-4 font-bold text-rose-400 transition-all hover:bg-rose-500/10 active:scale-[0.98]"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                  <polyline points="16 17 21 12 16 7"></polyline>
                  <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
                Sign Out from TruthLens
              </button>
              <p className="mt-4 text-[10px] uppercase tracking-[0.2em] text-gray-700">TruthLens Secure Identity Management</p>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
