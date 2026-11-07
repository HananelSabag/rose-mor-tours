// Hotels Israeli travellers book often, by destination (`destination` is the `en` key in
// destinations.ts). A starting point for the staff autocomplete; offers the team already sent
// are suggested first and carry their photos.

export type CatalogHotel = { name: string; destination: string; area: string; stars: number | null }

export const HOTELS: CatalogHotel[] = []
