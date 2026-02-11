'use client';

import React, { ReactNode, useEffect, useState } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, { error: Error | null }> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error) {
    console.error('[ErrorBoundary] Caught error:', error.message, error.stack);
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] componentDidCatch:', error, errorInfo);
  }

  resetError = () => {
    console.log('[ErrorBoundary] Resetting error state');
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.resetError);
      }

      // Default fallback UI
      return (
        <div className="min-h-screen bg-[#07090f] text-white flex items-center justify-center p-4">
          <div className="max-w-md w-full p-6 bg-red-950/40 border border-red-500/40 rounded-2xl">
            <h2 className="text-2xl font-bold text-red-400 mb-4">Pricing Failed to Load</h2>
            <pre className="bg-slate-900 rounded p-3 text-xs text-red-200 overflow-auto max-h-48 mb-4 font-mono">
              {this.state.error.message}
            </pre>
            <p className="text-red-300 text-sm mb-4">
              Check the browser console for full error details.
            </p>
            <button
              onClick={this.resetError}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2 rounded-full transition"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
