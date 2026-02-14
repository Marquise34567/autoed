export default function PremiumBadge({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  const px = size === 'md' ? 'px-3 py-1.5 text-sm' : 'px-2 py-1 text-xs'
  return (
    <span className={`inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-yellow-400/10 to-pink-500/10 border border-pink-500/20 text-amber-300 font-semibold ${px}`}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <path d="M12 2l2.09 4.24L19 7.27l-3.5 3.41L16.18 18 12 15.27 7.82 18l1.68-7.32L5.99 7.27l4.91-.99L12 2z" fill="currentColor" />
      </svg>
      Pro
    </span>
  )
}
