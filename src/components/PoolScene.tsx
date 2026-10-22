import { useId } from 'react'

/**
 * Golden-hour infinity pool: the pool's edge dissolves into the sea at the horizon.
 * Drawn wide (1200x600) and sliced, so the sun and the edge stay in frame on a phone.
 */
export function PoolScene({ className }: { className?: string }) {
  const id = useId()
  const ref = (name: string) => `${id}-${name}`

  return (
    <svg
      className={className}
      viewBox="0 0 1200 600"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={ref('sky')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5fc4d3" />
          <stop offset="0.42" stopColor="#a9e2df" />
          <stop offset="0.78" stopColor="#ffe2b4" />
          <stop offset="1" stopColor="#ffbf8f" />
        </linearGradient>
        <radialGradient id={ref('glow')}>
          <stop offset="0" stopColor="#ffe7b0" stopOpacity="0.9" />
          <stop offset="1" stopColor="#ffd37a" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={ref('sun')} cx="0.5" cy="0.4">
          <stop offset="0" stopColor="#fff8e4" />
          <stop offset="0.55" stopColor="#ffd37a" />
          <stop offset="1" stopColor="#ffab5c" />
        </radialGradient>
        <linearGradient id={ref('sea')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4bb9c4" />
          <stop offset="1" stopColor="#1d97a8" />
        </linearGradient>
        <linearGradient id={ref('pool')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#35cdc5" />
          <stop offset="0.5" stopColor="#14adad" />
          <stop offset="1" stopColor="#0b8790" />
        </linearGradient>
        <clipPath id={ref('above-sea')}>
          <rect width="1200" height="378" />
        </clipPath>
      </defs>

      <rect width="1200" height="380" fill={`url(#${ref('sky')})`} />
      <circle cx="470" cy="360" r="190" fill={`url(#${ref('glow')})`} />
      <circle cx="470" cy="352" r="56" fill={`url(#${ref('sun')})`} clipPath={`url(#${ref('above-sea')})`} />

      {/* Islands on the horizon */}
      <path d="M760 378c48-30 92-44 150-30 34-16 92-16 140 2 50-12 100-6 150 10v18H760z" fill="#6aaab0" opacity="0.5" />
      <path d="M0 370c52-14 118-18 210 4v4H0z" fill="#6aaab0" opacity="0.4" />

      <rect y="376" width="1200" height="80" fill={`url(#${ref('sea')})`} />

      {/* Sun path on the water */}
      <g fill="#ffe6b8">
        <rect x="400" y="386" width="140" height="3" rx="1.5" className="animate-shimmer" />
        <rect x="420" y="398" width="100" height="3" rx="1.5" className="animate-shimmer [animation-delay:-2s]" />
        <rect x="436" y="411" width="68" height="3" rx="1.5" className="animate-shimmer [animation-delay:-4s]" />
        <rect x="448" y="425" width="44" height="3" rx="1.5" className="animate-shimmer [animation-delay:-1s]" />
        <rect x="458" y="439" width="24" height="3" rx="1.5" className="animate-shimmer [animation-delay:-3s]" />
      </g>

      {/* The infinity edge */}
      <rect y="454" width="1200" height="3" fill="#effffd" opacity="0.9" />
      <rect y="457" width="1200" height="143" fill={`url(#${ref('pool')})`} />

      {/* Caustics */}
      <g fill="none" stroke="#ffffff" strokeLinecap="round" className="animate-drift">
        <path d="M-40 492c60-12 110 10 170 0s120-14 180 0 120 12 190 0 130-14 200 0 140 12 200 0 120-10 160 0" strokeWidth="2" opacity="0.28" />
        <path d="M-40 532c80-14 140 12 210 0s130-12 200 2 140 10 210-4 140-10 210 4 130 10 190-2" strokeWidth="2" opacity="0.2" />
        <path d="M-40 572c70-10 130 12 200 0s140-14 210 0 130 12 200-2 150-10 220 2 130 8 190-2" strokeWidth="2" opacity="0.16" />
      </g>
    </svg>
  )
}
