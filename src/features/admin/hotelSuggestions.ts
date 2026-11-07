import { useQuery } from '@tanstack/react-query'
import { DESTINATIONS } from '@/data/destinations'
import { HOTELS } from '@/data/hotels'
import { supabase } from '@/lib/supabase'

export type HotelSuggestion = {
  name: string
  city: string
  country: string
  stars: number | null
  /** Where it came from: an offer the team sent before (with its photos), or the catalog. */
  source: 'past' | 'catalog'
  area?: string
  room_type?: string
  images?: string[]
  highlights?: string[]
}

const norm = (s: string) => s.trim().toLowerCase()

/** Every hotel the team has offered, newest first, once per name. Grows with the business. */
export function usePastHotels() {
  return useQuery({
    queryKey: ['admin', 'past-hotels'],
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<HotelSuggestion[]> => {
      const { data, error } = await supabase
        .from('offers')
        .select('hotel_name, city, country, stars, room_type, images, highlights')
        .order('created_at', { ascending: false })
        .limit(400)
      if (error) throw error
      const seen = new Set<string>()
      const out: HotelSuggestion[] = []
      for (const o of data) {
        const key = norm(o.hotel_name)
        if (seen.has(key) || key.startsWith('test')) continue
        seen.add(key)
        out.push({ name: o.hotel_name, city: o.city, country: o.country, stars: o.stars, room_type: o.room_type, images: o.images, highlights: o.highlights, source: 'past' })
      }
      return out
    },
  })
}

/** The catalog entry's Hebrew city and country come from the destination list. */
function fromCatalog(): HotelSuggestion[] {
  return HOTELS.map((h) => {
    const d = DESTINATIONS.find((x) => x.en === h.destination)
    return { name: h.name, city: d?.name ?? h.area, country: d?.country ?? '', stars: h.stars, area: h.area, source: 'catalog' as const }
  })
}
const CATALOG = fromCatalog()

/**
 * Up to `limit` matches for what was typed. Hotels in the requested destination come first,
 * then hotels the team already offered, then the rest. With nothing typed, the destination's
 * hotels are suggested straight away.
 */
export function matchHotels(query: string, past: HotelSuggestion[], city: string, limit = 8): HotelSuggestion[] {
  const q = norm(query)
  const here = (h: HotelSuggestion) => norm(h.city) === norm(city)
  const pastNames = new Set(past.map((h) => norm(h.name)))
  const pool = [...past, ...CATALOG.filter((h) => !pastNames.has(norm(h.name)))]
  const hits = pool.filter((h) => (q ? norm(h.name).includes(q) || norm(h.area ?? '').includes(q) : here(h)))
  const score = (h: HotelSuggestion) => (here(h) ? 0 : 2) + (h.source === 'past' ? 0 : 1) + (q && norm(h.name).startsWith(q) ? 0 : 0.5)
  return hits.sort((a, b) => score(a) - score(b)).slice(0, limit)
}
