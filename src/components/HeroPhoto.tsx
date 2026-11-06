import clsx from 'clsx'

// Unsplash License photos (free for commercial use). Portrait on phones, landscape from md up,
// mirrored there so the pool and umbrella sit opposite the (right-aligned) headline.
const PHOTO = {
  portrait: 'photo-1784334119005-e78aa24423d4', // Crete, Pascal Debrunner
  landscape: 'photo-1735770517146-e95c872226fc', // El Salvador, Meg von Haartman
}
const photoUrl = (id: string, w: number) => `https://images.unsplash.com/${id}?auto=format&fit=crop&q=70&w=${w}`
const srcSet = (id: string, widths: number[]) => widths.map((w) => `${photoUrl(id, w)} ${w}w`).join(', ')

/** The brand photo, filling its positioned parent (or the viewport with `fixed`). Decorative. */
export function HeroPhoto({ fixed = false }: { fixed?: boolean }) {
  return (
    <picture>
      <source media="(min-width: 768px)" srcSet={srcSet(PHOTO.landscape, [1280, 1920, 2560])} sizes="100vw" />
      <img
        src={photoUrl(PHOTO.portrait, 828)}
        srcSet={srcSet(PHOTO.portrait, [640, 828, 1170])}
        sizes="100vw"
        alt=""
        fetchPriority="high"
        className={clsx(fixed ? 'fixed' : 'absolute', 'inset-0 -z-20 size-full bg-ocean-800 object-cover md:-scale-x-100')}
      />
    </picture>
  )
}
