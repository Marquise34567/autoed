// Prefer `NEXT_PUBLIC_API_URL` (Railway or production). Fall back to older var or localhost.
export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"
