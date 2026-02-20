"use client";

import { useState } from "react";
import { Logo } from "@/components/Logo";

export default function WaitlistModal({ open, onClose, initialSuccess }: { open: boolean; onClose: (added?: boolean) => void; initialSuccess?: boolean }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false || initialSuccess);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const validate = (e: string) => /\S+@\S+\.\S+/.test(e);

  const submit = async () => {
    setError(null);
    if (!validate(email)) {
      setError("Please enter a valid email");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setSuccess(true);
        setEmail("");
        try { localStorage.setItem('waitlist:joined', '1'); } catch (e) {}
        // Keep the modal open on the thank-you screen — do not auto-close
      } else {
        setError("Failed to join waitlist. Try again later.");
      }
    } catch (e) {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-linear-to-br from-black/80 to-black/70 backdrop-blur-lg" />
      <div className="relative z-10 max-w-xl w-full mx-4">
        <div className="bg-linear-to-b from-white/6 to-white/4 border border-white/8 rounded-3xl p-8 shadow-[0_20px_60px_rgba(2,6,23,0.7)]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 flex items-center justify-center rounded-lg bg-white/6 p-2">
              <Logo />
            </div>
            <div>
              <h3 className="text-2xl font-extrabold">AutoEditor is launching soon</h3>
              <p className="text-sm text-white/70 mt-1">We're opening access in the coming weeks — join the waitlist to be notified.</p>
            </div>
          </div>

          {success ? (
            <div className="mt-6 text-center text-green-400 font-medium">Thanks — you're on the list! We'll notify you soon.</div>
          ) : (
            <div className="mt-6">
              <input
                aria-label="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl bg-black/30 border border-white/10 px-4 py-3 text-white placeholder:text-white/40"
              />
              {error && <div className="mt-3 text-sm text-rose-400">{error}</div>}

              <div className="mt-6 flex items-center gap-3">
                <button
                  onClick={submit}
                  disabled={loading}
                  className="flex-1 rounded-full px-5 py-3 bg-linear-to-r from-pink-500 to-yellow-400 text-black font-semibold shadow-lg hover:scale-[1.01] transition-transform disabled:opacity-60"
                >
                  {loading ? "Joining..." : "Join Waitlist — Notify Me"}
                </button>
              </div>
              <p className="mt-3 text-xs text-white/60">We respect your privacy. We'll only use your email to notify you about AutoEditor.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
