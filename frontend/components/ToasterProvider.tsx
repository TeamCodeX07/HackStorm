'use client';

import { Toaster } from 'react-hot-toast';

export default function ToasterProvider() {
  return (
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    /* @ts-ignore */
    <Toaster 
      position="bottom-right"
      toastOptions={{
        style: {
          background: '#1f2937',
          color: '#fff',
          border: '1px solid rgba(255,255,255,0.1)',
          backdropFilter: 'blur(10px)',
        },
      }}
    />
  );
}
