import { useRef, useState } from 'react'
import { PoolScene } from '@/components/PoolScene'
import { hotelImageUrl } from '@/lib/storage'

/** Swipeable hotel photos (scroll-snap, no library). Falls back to the brand scene. */
export function Gallery({ images, alt }: { images: string[]; alt: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)

  if (images.length === 0) {
    return (
      <div className="relative aspect-[4/3] overflow-hidden bg-lagoon-100 md:aspect-[16/9] md:rounded-sheet">
        <PoolScene className="absolute inset-0 size-full" />
      </div>
    )
  }

  return (
    <div className="relative md:overflow-hidden md:rounded-sheet">
      <div
        ref={ref}
        onScroll={(e) => {
          const el = e.currentTarget
          // RTL scrollLeft is negative in Chromium/Firefox and positive in old Safari.
          setIndex(Math.round(Math.abs(el.scrollLeft) / el.clientWidth))
        }}
        className="flex aspect-[4/3] snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] md:aspect-[16/9] [&::-webkit-scrollbar]:hidden"
        aria-label={`תמונות של ${alt}`}
        role="region"
        tabIndex={0}
      >
        {images.map((path, i) => (
          <img
            key={path}
            src={hotelImageUrl(path)}
            alt={i === 0 ? alt : ''}
            loading={i === 0 ? 'eager' : 'lazy'}
            fetchPriority={i === 0 ? 'high' : 'auto'}
            decoding="async"
            className="size-full shrink-0 snap-center object-cover"
          />
        ))}
      </div>
      {images.length > 1 && (
        <span className="tabular absolute bottom-3 start-3 rounded-full bg-ocean-950/60 px-2.5 py-1 text-sm font-medium text-white backdrop-blur" aria-hidden="true">
          {index + 1}/{images.length}
        </span>
      )}
    </div>
  )
}
