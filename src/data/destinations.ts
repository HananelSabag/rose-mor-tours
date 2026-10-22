// Popular hotel destinations for Israeli travellers. The questionnaire also accepts
// free text, so this list only needs to cover the common cases well.

export type Destination = { name: string; country: string; en: string }

export const DESTINATIONS: Destination[] = [
  // Greece
  { name: 'כרתים', country: 'יוון', en: 'Crete' },
  { name: 'רודוס', country: 'יוון', en: 'Rhodes' },
  { name: 'קוס', country: 'יוון', en: 'Kos' },
  { name: 'זקינתוס', country: 'יוון', en: 'Zakynthos' },
  { name: 'קורפו', country: 'יוון', en: 'Corfu' },
  { name: 'סנטוריני', country: 'יוון', en: 'Santorini' },
  { name: 'מיקונוס', country: 'יוון', en: 'Mykonos' },
  { name: 'נקסוס', country: 'יוון', en: 'Naxos' },
  { name: 'פארוס', country: 'יוון', en: 'Paros' },
  { name: 'אתונה', country: 'יוון', en: 'Athens' },
  { name: 'סלוניקי', country: 'יוון', en: 'Thessaloniki' },
  { name: 'חלקידיקי', country: 'יוון', en: 'Halkidiki' },
  // Cyprus
  { name: 'לרנקה', country: 'קפריסין', en: 'Larnaca' },
  { name: 'פאפוס', country: 'קפריסין', en: 'Paphos' },
  { name: 'איה נאפה', country: 'קפריסין', en: 'Ayia Napa' },
  { name: 'לימסול', country: 'קפריסין', en: 'Limassol' },
  { name: 'פרוטאראס', country: 'קפריסין', en: 'Protaras' },
  // Balkans & Eastern Europe
  { name: 'ורנה', country: 'בולגריה', en: 'Varna' },
  { name: 'סאני ביץ׳', country: 'בולגריה', en: 'Sunny Beach' },
  { name: 'סופיה', country: 'בולגריה', en: 'Sofia' },
  { name: 'באנסקו', country: 'בולגריה', en: 'Bansko' },
  { name: 'בודווה', country: 'מונטנגרו', en: 'Budva' },
  { name: 'טיבט', country: 'מונטנגרו', en: 'Tivat' },
  { name: 'טירנה', country: 'אלבניה', en: 'Tirana' },
  { name: 'סרנדה', country: 'אלבניה', en: 'Sarande' },
  { name: 'דוברובניק', country: 'קרואטיה', en: 'Dubrovnik' },
  { name: 'ספליט', country: 'קרואטיה', en: 'Split' },
  { name: 'בטומי', country: 'גאורגיה', en: 'Batumi' },
  { name: 'טביליסי', country: 'גאורגיה', en: 'Tbilisi' },
  { name: 'בודפשט', country: 'הונגריה', en: 'Budapest' },
  { name: 'פראג', country: 'צ׳כיה', en: 'Prague' },
  { name: 'קרקוב', country: 'פולין', en: 'Krakow' },
  { name: 'ורשה', country: 'פולין', en: 'Warsaw' },
  { name: 'בוקרשט', country: 'רומניה', en: 'Bucharest' },
  { name: 'בלד', country: 'סלובניה', en: 'Bled' },
  { name: 'לובליאנה', country: 'סלובניה', en: 'Ljubljana' },
  // Western Europe
  { name: 'רומא', country: 'איטליה', en: 'Rome' },
  { name: 'מילאנו', country: 'איטליה', en: 'Milan' },
  { name: 'ונציה', country: 'איטליה', en: 'Venice' },
  { name: 'פירנצה', country: 'איטליה', en: 'Florence' },
  { name: 'חוף אמלפי', country: 'איטליה', en: 'Amalfi Coast' },
  { name: 'סיציליה', country: 'איטליה', en: 'Sicily' },
  { name: 'סרדיניה', country: 'איטליה', en: 'Sardinia' },
  { name: 'אגם גארדה', country: 'איטליה', en: 'Lake Garda' },
  { name: 'אגם קומו', country: 'איטליה', en: 'Lake Como' },
  { name: 'דולומיטים', country: 'איטליה', en: 'Dolomites' },
  { name: 'ברצלונה', country: 'ספרד', en: 'Barcelona' },
  { name: 'מדריד', country: 'ספרד', en: 'Madrid' },
  { name: 'מיורקה', country: 'ספרד', en: 'Mallorca' },
  { name: 'איביזה', country: 'ספרד', en: 'Ibiza' },
  { name: 'טנריפה', country: 'ספרד', en: 'Tenerife' },
  { name: 'מלגה', country: 'ספרד', en: 'Malaga' },
  { name: 'ליסבון', country: 'פורטוגל', en: 'Lisbon' },
  { name: 'פורטו', country: 'פורטוגל', en: 'Porto' },
  { name: 'מדיירה', country: 'פורטוגל', en: 'Madeira' },
  { name: 'פריז', country: 'צרפת', en: 'Paris' },
  { name: 'ניס', country: 'צרפת', en: 'Nice' },
  { name: 'לונדון', country: 'אנגליה', en: 'London' },
  { name: 'אמסטרדם', country: 'הולנד', en: 'Amsterdam' },
  { name: 'ברלין', country: 'גרמניה', en: 'Berlin' },
  { name: 'מינכן', country: 'גרמניה', en: 'Munich' },
  { name: 'היער השחור', country: 'גרמניה', en: 'Black Forest' },
  { name: 'וינה', country: 'אוסטריה', en: 'Vienna' },
  { name: 'זלצבורג', country: 'אוסטריה', en: 'Salzburg' },
  { name: 'טירול', country: 'אוסטריה', en: 'Tyrol' },
  { name: 'ציריך', country: 'שווייץ', en: 'Zurich' },
  { name: 'אינטרלאקן', country: 'שווייץ', en: 'Interlaken' },
  { name: 'לוצרן', country: 'שווייץ', en: 'Lucerne' },
  { name: 'מלטה', country: 'מלטה', en: 'Malta' },
  // Further away
  { name: 'דובאי', country: 'איחוד האמירויות', en: 'Dubai' },
  { name: 'אבו דאבי', country: 'איחוד האמירויות', en: 'Abu Dhabi' },
  { name: 'בנגקוק', country: 'תאילנד', en: 'Bangkok' },
  { name: 'פוקט', country: 'תאילנד', en: 'Phuket' },
  { name: 'קוסמוי', country: 'תאילנד', en: 'Koh Samui' },
  { name: 'קופנגן', country: 'תאילנד', en: 'Koh Phangan' },
  { name: 'צ׳יאנג מאי', country: 'תאילנד', en: 'Chiang Mai' },
  { name: 'האיים המלדיביים', country: 'מלדיביים', en: 'Maldives' },
  { name: 'סיישל', country: 'סיישל', en: 'Seychelles' },
  { name: 'זנזיבר', country: 'טנזניה', en: 'Zanzibar' },
  { name: 'מאוריציוס', country: 'מאוריציוס', en: 'Mauritius' },
  { name: 'מרקש', country: 'מרוקו', en: 'Marrakech' },
  { name: 'גואה', country: 'הודו', en: 'Goa' },
  { name: 'טוקיו', country: 'יפן', en: 'Tokyo' },
  { name: 'ניו יורק', country: 'ארצות הברית', en: 'New York' },
  { name: 'מיאמי', country: 'ארצות הברית', en: 'Miami' },
  { name: 'לאס וגאס', country: 'ארצות הברית', en: 'Las Vegas' },
  { name: 'אורלנדו', country: 'ארצות הברית', en: 'Orlando' },
  { name: 'לוס אנג׳לס', country: 'ארצות הברית', en: 'Los Angeles' },
]

export const POPULAR_DESTINATIONS = ['כרתים', 'רודוס', 'פאפוס', 'ברצלונה', 'רומא', 'בודפשט']

export function destinationLabel(d: Destination): string {
  return d.name === d.country ? d.name : `${d.name}, ${d.country}`
}

// Folds geresh/quote variants and spacing so "צ'יאנג" matches "צ׳יאנג".
function fold(value: string): string {
  return value
    .toLowerCase()
    .replace(/[׳'`"״]/g, '')
    .replace(/[-־]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function searchDestinations(query: string, limit = 8): Destination[] {
  const q = fold(query)
  if (!q) return []
  const scored: { d: Destination; score: number }[] = []
  for (const d of DESTINATIONS) {
    const name = fold(d.name)
    const en = fold(d.en)
    const country = fold(d.country)
    let score = 0
    if (name.startsWith(q) || en.startsWith(q)) score = 3
    else if (name.split(' ').some((w) => w.startsWith(q)) || en.split(' ').some((w) => w.startsWith(q))) score = 2
    else if (country.startsWith(q)) score = 1
    if (score) scored.push({ d, score })
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, limit).map((s) => s.d)
}
