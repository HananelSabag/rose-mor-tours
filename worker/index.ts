/**
 * The site itself is static assets. The Worker adds two things:
 *  - /o/<token>: injects the offer's hotel, image and price into the OG tags, so a link sent
 *    on WhatsApp shows a preview card (crawlers do not run the SPA).
 *  - a scheduled keep-alive so Supabase Free never pauses the project.
 */

type OfferPreview = {
  hotel_name: string
  city: string
  country: string
  stars: number | null
  check_in: string
  check_out: string
  price_ils: number
  image: string | null
}

const TOKEN = /^\/o\/([A-Za-z0-9_-]{10,40})\/?$/
const PREVIEW_TTL_SECONDS = 300

async function loadPreview(token: string, env: Env, ctx: ExecutionContext, origin: string): Promise<OfferPreview | null> {
  // Cache per token: a link pasted in a busy group gets crawled many times.
  const cache = caches.default
  const key = new Request(`${origin}/__og/${token}`)
  const hit = await cache.match(key)
  if (hit) return (await hit.json()) as OfferPreview | null

  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/get_offer_preview`, {
    method: 'POST',
    headers: { apikey: env.SUPABASE_PUBLISHABLE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_token: token }),
  })
  if (!res.ok) return null
  const preview = (await res.json()) as OfferPreview | null
  ctx.waitUntil(
    cache.put(key, new Response(JSON.stringify(preview), { headers: { 'Cache-Control': `max-age=${PREVIEW_TTL_SECONDS}` } })),
  )
  return preview
}

const ils = new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 })
const dayMonth = (iso: string) => {
  const [, m, d] = iso.split('-')
  return `${Number(d)}.${Number(m)}`
}
const nights = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000)

function setContent(value: string): HTMLRewriterElementContentHandlers {
  return {
    element(el) {
      el.setAttribute('content', value)
    },
  }
}

async function offerPage(request: Request, token: string, env: Env, ctx: ExecutionContext): Promise<Response> {
  const url = new URL(request.url)
  // The SPA shell, exactly as a navigation to "/" would get it.
  const shell = await env.ASSETS.fetch(new Request(new URL('/', url), request))
  const preview = await loadPreview(token, env, ctx, url.origin).catch(() => null)
  if (!preview) return shell

  const stars = preview.stars ? ` ${'⭐'.repeat(preview.stars)}` : ''
  const title = `${preview.hotel_name}${stars} | Rose&Mor tours`
  const place = preview.city === preview.country ? preview.city : `${preview.city}, ${preview.country}`
  const n = nights(preview.check_in, preview.check_out)
  const description = `${place}. ${dayMonth(preview.check_in)}–${dayMonth(preview.check_out)}, ${n} לילות. ${ils.format(preview.price_ils)} לכל השהייה. הצעה אישית מהצוות של Rose&Mor.`
  const image = preview.image
    ? `${env.SUPABASE_URL}/storage/v1/object/public/hotel-images/${preview.image.split('/').map(encodeURIComponent).join('/')}`
    : `${url.origin}/og.png`

  return new HTMLRewriter()
    .on('title', { element: (el) => void el.setInnerContent(title) })
    .on('meta[name="description"]', setContent(description))
    .on('meta[property="og:title"]', setContent(title))
    .on('meta[property="og:description"]', setContent(description))
    .on('meta[property="og:image"]', setContent(image))
    .on('meta[property="og:image:width"]', { element: (el) => void el.remove() })
    .on('meta[property="og:image:height"]', { element: (el) => void el.remove() })
    .on('head', { element: (el) => void el.append(`<meta property="og:url" content="${url.origin}${url.pathname}">`, { html: true }) })
    .transform(shell)
}

export default {
  fetch(request, env, ctx) {
    const match = TOKEN.exec(new URL(request.url).pathname)
    if (match && request.method === 'GET') return offerPage(request, match[1]!, env, ctx)
    return env.ASSETS.fetch(request)
  },

  async scheduled(_controller, env, ctx) {
    // Touch the Data API (a real query; an unknown token returns null) and Auth, so the
    // project shows activity on more than one service.
    const headers = { apikey: env.SUPABASE_PUBLISHABLE_KEY, 'Content-Type': 'application/json' }
    ctx.waitUntil(
      Promise.all([
        fetch(`${env.SUPABASE_URL}/rest/v1/rpc/get_offer`, { method: 'POST', headers, body: JSON.stringify({ p_token: 'keep-alive' }) }),
        fetch(`${env.SUPABASE_URL}/auth/v1/settings`, { headers }),
      ]).then((responses) => {
        const failed = responses.filter((r) => !r.ok).map((r) => r.status)
        console.log(JSON.stringify({ event: 'keep-alive', failed }))
        if (failed.length) throw new Error(`keep-alive failed: ${failed.join(',')}`)
      }),
    )
  },
} satisfies ExportedHandler<Env>
