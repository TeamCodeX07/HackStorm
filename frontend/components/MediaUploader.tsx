'use client';

import React, { useState, useRef } from 'react';
import { uploadToCloudinary } from '@/lib/cloudinary';

interface MediaUploaderProps {
  onSuccess: (url: string, type: 'image' | 'video' | 'audio', name: string) => void;
}

const ACCEPTED_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/webp'],
  video: ['video/mp4', 'video/quicktime'], // quicktime is .mov
  audio: ['audio/mpeg', 'audio/wav', 'audio/x-wav'],
};

const MAX_SIZES = {
  image: 100 * 1024 * 1024, // 100MB
  video: 100 * 1024 * 1024, // 100MB
  audio: 50 * 1024 * 1024,  // 50MB
};

export default function MediaUploader({ onSuccess }: MediaUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): { valid: boolean; error?: string; type?: 'image' | 'video' | 'audio' } => {
    let type: 'image' | 'video' | 'audio' | undefined;

    if (ACCEPTED_TYPES.image.includes(file.type)) type = 'image';
    else if (ACCEPTED_TYPES.video.includes(file.type)) type = 'video';
    else if (ACCEPTED_TYPES.audio.includes(file.type)) type = 'audio';

    if (!type) {
      return { valid: false, error: 'Invalid file type. Please upload an image, video, or audio file.' };
    }

    if (file.size > MAX_SIZES[type]) {
      const sizeLabel = type === 'audio' ? '50MB' : '100MB';
      return { valid: false, error: `File is too large. Max size for ${type} is ${sizeLabel}.` };
    }

    return { valid: true, type };
  };

  const handleUpload = async (file: File) => {
    const validation = validateFile(file);
    if (!validation.valid || !validation.type) {
      setError(validation.error || 'Invalid file');
      return;
    }


    setError(null);
    setUploading(true);
    setProgress(0);

    try {
      const secureUrl = await uploadToCloudinary(file, (pct) => setProgress(pct));
      setUploading(false);
      onSuccess(secureUrl, validation.type, file.name);
    } catch (uploadError: any) {
      console.error('Upload failed:', uploadError);
      setError(uploadError.message || 'Upload failed. Please try again.');
      setUploading(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  };

  return (
    <div className="w-full">
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
        className={`relative cursor-pointer overflow-hidden rounded-3xl border-2 border-dashed p-12 text-center transition-all duration-300 ${
          isDragging ? 'border-blue-500 bg-blue-500/10' : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
        } ${uploading ? 'pointer-events-none' : ''}`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={onFileChange}
          accept=".jpg,.jpeg,.png,.webp,.mp4,.mov,.mp3,.wav"
          className="hidden"
        />

        <div className="flex flex-col items-center gap-4">
          <div className={`rounded-full p-4 transition-colors ${isDragging ? 'bg-blue-500 text-white' : 'bg-white/5 text-gray-400'}`}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
          </div>
          
          <div>
            <p className="text-xl font-bold text-white">
              {uploading ? 'Uploading...' : 'Drop media file here'}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              or click to browse from your device
            </p>
          </div>

          <div className="flex gap-4 text-[10px] font-bold uppercase tracking-widest text-gray-600">
            <span>Images (100MB)</span>
            <span>Video (100MB)</span>
            <span>Audio (50MB)</span>
          </div>
        </div>

        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity duration-300">
            <div className="w-full max-w-xs px-8 text-center">
              <div className="mb-4 text-2xl font-black text-white">{progress}%</div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                <div 
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-blue-400">
                Processing Secure Upload
              </p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-rose-400 animate-in shake duration-300">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <span className="text-xs font-semibold">{error}</span>
        </div>
      )}
    </div>
  );
}
