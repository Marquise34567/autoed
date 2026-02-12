'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Global Error]', error.message, error);
  }, [error]);

  return (
    <html>
      <body className="bg-[#07090f] text-white">
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="max-w-md w-full p-8 bg-red-950/40 rounded-2xl border border-red-500/40">
            <h2 className="text-2xl font-bold text-red-400 mb-4">Critical Error</h2>
            
            <div className="mb-6">
              <p className="text-red-200/70 text-sm mb-3">
                A critical error occurred. Please try refreshing the page.
              </p>
              
              {process.env.NODE_ENV === 'development' && (
                <pre className="bg-slate-900/60 border border-red-500/20 rounded p-3 text-xs text-red-300 overflow-auto max-h-40 mb-4 font-mono">
                  {error.message}
                </pre>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={reset}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 rounded-full transition"
              >
                Reload
              </button>
              <button
                onClick={() => (window.location.href = '/')}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white font-semibold py-2 rounded-full transition border border-white/10"
              >
                Home
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
