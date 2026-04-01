'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import TextResultCard from '@/components/TextResultCard';
import MediaResultCard from '@/components/MediaResultCard';

export default function ScanDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const router = useRouter();
  const [scan, setScan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchScanDetails = async () => {
      if (!user || !id) return;
      try {
        const idToken = await user.getIdToken();
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
        const response = await fetch(`${backendUrl}/api/scans/${id}`, {
          headers: {
            'Authorization': `Bearer ${idToken}`,
          },
        });
        const data = await response.json();
        if (response.ok) {
          setScan(data);
        } else {
          setError(data.error || 'Failed to load scan details');
        }
      } catch (err) {
        setError('An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchScanDetails();
  }, [user, id]);

  const handleDelete = async () => {
    if (!user || !id || deleting) return;
    if (!confirm('Are you sure you want to delete this scan permanently?')) return;

    setDeleting(true);
    try {
      const idToken = await user.getIdToken();
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
      const response = await fetch(`${backendUrl}/api/scans/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${idToken}`,
        },
      });

      if (response.ok) {
        router.push('/history');
      } else {
        alert('Failed to delete scan');
        setDeleting(false);
      }
    } catch (err) {
      alert('Error deleting scan');
      setDeleting(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="flex min-h-screen items-center justify-center bg-gray-950">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/10 border-t-blue-500"></div>
        </div>
      </ProtectedRoute>
    );
  }

  if (error || !scan) {
    return (
      <ProtectedRoute>
        <div className="flex min-h-screen items-center justify-center bg-gray-950 p-8 text-center">
          <div>
            <h1 className="text-2xl font-bold text-white">Oops!</h1>
            <p className="mt-2 text-gray-400">{error || 'Scan not found'}</p>
            <Link href="/history" className="mt-6 inline-block text-blue-500 hover:underline">
              Back to History
            </Link>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black p-4 py-8 md:p-8">
        <div className="mx-auto max-w-4xl">
          {/* Breadcrumb */}
          <nav className="mb-8 flex items-center gap-2 text-sm font-medium text-gray-500">
            <Link href="/history" className="hover:text-white transition-colors">History</Link>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
            <span className="text-white truncate max-w-[200px]">Scan Details</span>
          </nav>

          <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
            <h1 className="text-3xl font-black text-white">
              Scan <span className="text-blue-500">Result</span>
            </h1>
            
            <div className="flex gap-3">
              <button
                onClick={copyLink}
                className="flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 text-xs font-bold text-white transition-all hover:bg-white/10"
              >
                {copied ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                    </svg>
                    <span>Share Link</span>
                  </>
                )}
              </button>
              
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-2 rounded-full bg-rose-500/10 px-4 py-2 text-xs font-bold text-rose-400 transition-all hover:bg-rose-500/20 disabled:opacity-50"
              >
                {deleting ? (
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-rose-500/20 border-t-rose-400"></div>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                )}
                <span>Delete</span>
              </button>
            </div>
          </div>

          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            {scan.mediaType === 'text' ? (
              <TextResultCard result={scan} />
            ) : (
              <MediaResultCard result={scan} />
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
