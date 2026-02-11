'use client';

import { useState, useEffect } from 'react';

import { Logo } from './Logo';
import { BetaBadge } from './BetaBadge';

/**
 * MobileNav - Responsive navigation component
 * 
 * Desktop: Horizontal navigation with links
 * Mobile: Hamburger menu with slide-out drawer
 */
export function MobileNav({ children }: { children?: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <>
      {/* Desktop Navigation - Hidden on mobile */}
      <nav className="hidden lg:flex items-center gap-8 text-sm text-white/70">
        {children}
      </nav>

      {/* Mobile Menu Button - Visible on mobile only */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden flex flex-col gap-1.5 w-6 h-6 justify-center relative z-9999"
        aria-label="Toggle menu"
      >
        <span className={`w-full h-0.5 bg-white transition-all ${isOpen ? 'rotate-45 translate-y-2' : ''}`} />
        <span className={`w-full h-0.5 bg-white transition-all ${isOpen ? 'opacity-0' : ''}`} />
        <span className={`w-full h-0.5 bg-white transition-all ${isOpen ? '-rotate-45 -translate-y-2' : ''}`} />
      </button>

      {/* Mobile Menu Panel */}
      {isOpen && (
        <div className="fixed inset-0 z-9999 lg:hidden">
          {/* Backdrop */}
          <button
            aria-label="Close menu"
            onClick={() => setIsOpen(false)}
            className="absolute inset-0 bg-black/60"
          />

          {/* Panel */}
          <div className="absolute right-0 top-0 h-full w-[80%] max-w-xs bg-[#0b0f1a] border-l border-white/10 p-6">
            <button
              aria-label="Close menu"
              onClick={() => setIsOpen(false)}
              className="absolute right-4 top-4 text-white/80 hover:text-white"
            >
              ✕
            </button>

            <nav className="mt-14 space-y-8 text-white/80 text-xl">
              <a href="#features" onClick={() => setIsOpen(false)} className="block hover:text-white">
                Features
              </a>
              <a href="#pricing" onClick={() => setIsOpen(false)} className="block hover:text-white">
                Pricing
              </a>
              <a href="#faq" onClick={() => setIsOpen(false)} className="block hover:text-white">
                FAQ
              </a>
              <div className="border-t border-white/10 pt-8 mt-8">
                {children}
              </div>
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
