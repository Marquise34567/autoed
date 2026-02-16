"use client";

import { useState } from "react";

export default function WaitlistModal({ open, onClose }: { open: boolean; onClose: (added?: boolean) => void }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const validate = (e: string) => {
    return /\S+@\S+\.\S+/.test(e);
  };

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
        setTimeout(() => {
          onClose(true);
        }, 1200);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => onClose()} />
      <div className="relative z-10 max-w-md w-full mx-4">
        <div className="bg-[#0b0d12] border border-white/10 rounded-2xl p-6 shadow-2xl">
          <h3 className="text-lg font-semibold">Join the waitlist</h3>
          <p className="text-sm text-white/70 mt-1">Get notified when we launch premium access.</p>

          {success ? (
            <div className="mt-6 text-center text-green-400 font-medium">Thanks — you're on the list!</div>
          ) : (
            <div className="mt-4">
              <input
                aria-label="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-2 text-white/90 placeholder:text-white/40"
              />
              {error && <div className="mt-2 text-sm text-rose-400">{error}</div>}

              <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={submit}
                  disabled={loading}
                  className="rounded-full px-4 py-2 bg-gradient-to-r from-pink-500 to-yellow-400 text-black font-semibold shadow-md hover:brightness-105 transition disabled:opacity-60"
                >
                  {loading ? "Joining..." : "Join Waitlist"}
                </button>
                <button onClick={() => onClose()} className="text-sm text-white/60 hover:text-white">Cancel</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
