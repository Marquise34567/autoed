"use client";

import { useEffect, useState } from "react";
import WaitlistModal from "@/components/WaitlistModal";
import { Logo } from "@/components/Logo";

export default function WaitlistOverlay() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Force show the overlay — nobody proceeds without joining
    setTimeout(() => setOpen(true), 200);
  }, []);

  return (
    <>
      {open && (
        <div>
          <WaitlistModal
            open={open}
            onClose={(added?: boolean) => {
              // Only close the overlay if the user actually joined (added === true)
              if (added) {
                try { localStorage.setItem('waitlist:joined', '1'); } catch (e) {}
                setOpen(false);
              }
              // otherwise keep it open — users cannot bypass
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
