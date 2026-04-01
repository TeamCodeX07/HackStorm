'use client';

import React from 'react';

export default function ScanSkeleton() {
  return (
    <div className="mt-12 overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl animate-pulse">
      <div className="p-8">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div className="w-full md:w-2/3">
            <div className="flex items-center gap-3">
              <div className="h-6 w-24 rounded-full bg-white/10"></div>
              <div className="h-4 w-32 rounded-full bg-white/5"></div>
            </div>
            <div className="mt-6 h-10 w-full rounded-xl bg-white/10 md:w-3/4"></div>
          </div>
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white/10">
            <div className="h-16 w-16 rounded-full border-4 border-white/5"></div>
          </div>
        </div>

        <div className="mt-12 space-y-4">
          <div className="h-6 w-40 rounded-lg bg-white/10"></div>
          <div className="space-y-2">
            <div className="h-4 w-full rounded bg-white/5"></div>
            <div className="h-4 w-5/6 rounded bg-white/5"></div>
            <div className="h-4 w-4/6 rounded bg-white/5"></div>
          </div>
        </div>

        <div className="mt-12 rounded-2xl border border-white/5 bg-white/5 p-6">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-white/10"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 rounded bg-white/10"></div>
              <div className="h-3 w-full rounded bg-white/5"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
