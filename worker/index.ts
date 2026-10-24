/**
 * The site itself is static assets. This Worker only adds a scheduled keep-alive today;
 * later it also injects OG tags on /o/* for WhatsApp previews (run_worker_first).
 */
export default {
  fetch(request, env) {
    return env.ASSETS.fetch(request)
  },

  async scheduled(_controller, env, ctx) {
    // Any real database call counts as activity; an unknown token simply returns null.
    ctx.waitUntil(
      fetch(`${env.SUPABASE_URL}/rest/v1/rpc/get_offer`, {
        method: 'POST',
        headers: { apikey: env.SUPABASE_PUBLISHABLE_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_token: 'keep-alive' }),
      }).then((res) => {
        if (!res.ok) throw new Error(`keep-alive failed: ${res.status}`)
      }),
    )
  },
} satisfies ExportedHandler<Env>
