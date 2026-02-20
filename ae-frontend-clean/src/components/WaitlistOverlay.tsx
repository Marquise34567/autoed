"use client";

import { useEffect, useState } from "react";
import WaitlistModal from "@/components/WaitlistModal";
import { Logo } from "@/components/Logo";

export default function WaitlistOverlay() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Force show the overlay — nobody proceeds without joining.
    // If the user already joined, show the thank-you screen persistently.
    try {
      const joined = localStorage.getItem('waitlist:joined');
      if (joined === '1') {
        // open and show success state
        setOpen(true);
      } else {
        setTimeout(() => setOpen(true), 200);
      }
    } catch (e) {
      setTimeout(() => setOpen(true), 200);
    }
  }, []);

  return (
    <>
      {open && (
        <div>
          <WaitlistModal
            open={open}
            initialSuccess={(() => { try { return localStorage.getItem('waitlist:joined') === '1' } catch(e){ return false } })()}
            onClose={(added?: boolean) => {
              // Keep overlay persistent — don't close unless we explicitly want to
              if (added) {
                try { localStorage.setItem('waitlist:joined', '1'); } catch (e) {}
                // still keep it visible on the thank-you screen
              }
            }}
          />
          {/* small floating logo in lower-left while modal is open (for brand) */}
          <div className="fixed left-6 bottom-6 z-50 pointer-events-none hidden sm:block">
            <div className="bg-white/5 border border-white/10 rounded-full p-2 backdrop-blur-sm">
              <div className="w-10 h-10 flex items-center justify-center">
                <Logo />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
