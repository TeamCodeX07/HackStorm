'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/apiFetch';

interface Scan {
  _id: string;
  mediaType: 'text' | 'image' | 'video' | 'audio';
  verdict: 'authentic' | 'manipulated' | 'uncertain';
  confidence: number;
  timestamp: string;
  sourceUrl?: string;
  sourceText?: string;
  fileName?: string;
}

export default function HistoryPage() {

  const router = useRouter();
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchHistory = async (p: number) => {

    setLoading(true);
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
      const response = await apiFetch(`${backendUrl}/api/scans?page=${p}&limit=10`);
      const data = await response.json();
      if (response.ok) {
        setScans(data.scans);
        setTotalPages(data.totalPages);
      }
    } catch (err) {
      console.error('Failed to fetch history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory(page);
  }, [page]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (deletingId) return;
    if (!confirm('Are you sure you want to delete this scan?')) return;

    setDeletingId(id);
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
      const response = await apiFetch(`${backendUrl}/api/scans/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Optimistic update
        setScans(scans.filter(s => s._id !== id));
        if (scans.length === 1 && page > 1) {
          setPage(page - 1);
        } else {
          fetchHistory(page);
        }
      }
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const getMediaTypeIcon = (type: string) => {
    switch (type) {
      case 'text':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
        );
      case 'image':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <circle cx="8.5" cy="8.5" r="1.5"></circle>
            <polyline points="21 15 16 10 5 21"></polyline>
          </svg>
        );
      case 'video':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="23 7 16 12 23 17 23 7"></polygon>
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
          </svg>
        );
      case 'audio':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 18V5l12-2v13"></path>
            <circle cx="6" cy="18" r="3"></circle>
            <circle cx="18" cy="16" r="3"></circle>
          </svg>
        );
      default:
        return null;
    }
  };

  const getVerdictBadge = (verdict: string) => {
    const colors = {
      authentic: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      manipulated: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
      uncertain: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    };
    return (
      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${colors[verdict as keyof typeof colors]}`}>
        {verdict}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black p-4 py-8 md:p-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 flex flex-col items-center justify-between gap-4 md:flex-row">
            <div>
              <h1 className="text-3xl font-black text-white md:text-4xl">
                Scan <span className="text-blue-500">History</span>
              </h1>
              <p className="mt-2 text-gray-400">Manage and review your past authenticity checks.</p>
            </div>
            <Link 
              href="/scan"
              className="rounded-full bg-blue-600 px-6 py-2.5 text-sm font-bold text-white transition-all hover:bg-blue-500 hover:shadow-[0_0_15px_rgba(37,99,235,0.4)]"
            >
              New Scan
            </Link>
          </div>

          <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl">
            {loading ? (
              <div className="p-20 text-center">
                <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-white/10 border-t-blue-500"></div>
                <p className="mt-4 font-medium text-gray-500">Loading your history...</p>
              </div>
            ) : scans.length === 0 ? (
              <div className="p-20 text-center">
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-white/5 text-gray-600">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M12 8v4l3 3"></path>
                    <circle cx="12" cy="12" r="9"></circle>
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white">No scans found</h3>
                <p className="mt-2 text-gray-500">Start by scanning some text or media to build your history.</p>
                <Link href="/scan" className="mt-6 inline-block text-sm font-bold text-blue-400 hover:underline">
                  Analyze your first content &rarr;
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/5 text-xs font-bold uppercase tracking-widest text-gray-500">
                      <th className="px-6 py-4">Type</th>
                      <th className="px-6 py-4">Content Excerpt / Filename</th>
                      <th className="px-6 py-4">Verdict</th>
                      <th className="px-6 py-4">Confidence</th>
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {scans.map((scan) => (
                      <tr 
                        key={scan._id}
                        onClick={() => router.push(`/history/${scan._id}`)}
                        className="group cursor-pointer transition-colors hover:bg-white/[0.02]"
                      >
                        <td className="px-6 py-4">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-gray-400 group-hover:bg-blue-500/10 group-hover:text-blue-400">
                            {getMediaTypeIcon(scan.mediaType)}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="max-w-xs truncate text-sm font-medium text-white md:max-w-md">
                            {scan.mediaType === 'text' 
                              ? (scan.sourceUrl || scan.sourceText || 'No text content')
                              : (scan.fileName || 'Media File')}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {getVerdictBadge(scan.verdict)}
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-bold text-white">{scan.confidence}%</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs text-gray-500">
                            {new Date(scan.timestamp).toLocaleDateString()}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={(e) => handleDelete(e, scan._id)}
                            disabled={deletingId === scan._id}
                            className="rounded-lg p-2 text-gray-600 transition-colors hover:bg-rose-500/10 hover:text-rose-400"
                          >
                            {deletingId === scan._id ? (
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/10 border-t-rose-500"></div>
                            ) : (
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                              </svg>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {totalPages > 1 && (
            <div className="mt-8 flex justify-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-white transition-all hover:bg-white/10 disabled:opacity-30"
              >
                Previous
              </button>
              <div className="flex items-center px-4 text-sm font-bold text-gray-500">
                Page {page} of {totalPages}
              </div>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-white transition-all hover:bg-white/10 disabled:opacity-30"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
  );
}
