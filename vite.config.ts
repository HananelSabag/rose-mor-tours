import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

const shortcutIcon = [{ src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' }]

// `vite build` stops when .env lacks a value the site can't work without (see .env.example),
// so a deploy can never ship without the business's real WhatsApp number.
const requireEnv: Plugin = {
  name: 'require-env',
  configResolved({ command, env }) {
    if (command !== 'build') return
    const missing = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY', 'VITE_BUSINESS_PHONE'].filter((name) => !env[name])
    if (missing.length) throw new Error(`Missing ${missing.join(', ')} in .env (see .env.example)`)
    if (!/^\+[1-9]\d{7,14}$/.test(env.VITE_BUSINESS_PHONE)) throw new Error('VITE_BUSINESS_PHONE must be E.164, e.g. +972501234567')
  },
}

// https://vite.dev/config/
export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  plugins: [
    requireEnv,
    react(),
    tailwindcss(),
    VitePWA({
      // Custom service worker: precaching now, Web Push handlers for offer/voucher alerts.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      injectRegister: false,
      // Icons, maskable icon, favicon and iOS splash screens come from pwa-assets.config.ts.
      pwaAssets: {
        config: true,
        includeHtmlHeadLinks: true,
        overrideManifestIcons: true,
      },
      manifest: {
        id: '/',
        name: 'Rose&Mor tours',
        short_name: 'Rose&Mor',
        description: 'מלונות בחו״ל במחיר של ספקים סיטונאיים. שאלון של דקה, הצעה בוואטסאפ.',
        lang: 'he',
        dir: 'rtl',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        display_override: ['standalone', 'minimal-ui'],
        categories: ['travel'],
        // Launch splash (Android) blends into the full-bleed icon; the bar matches the app's light top.
        background_color: '#08727a',
        theme_color: '#eef8f7',
        // A WhatsApp link to an offer reuses the open app window instead of stacking new ones.
        launch_handler: { client_mode: ['navigate-existing', 'auto'] },
        shortcuts: [
          { name: 'חיפוש מלון', short_name: 'חיפוש', url: '/search', icons: shortcutIcon },
          { name: 'ההצעות שלי', short_name: 'הצעות', url: '/offers', icons: shortcutIcon },
          { name: 'ההזמנות שלי', short_name: 'הזמנות', url: '/bookings', icons: shortcutIcon },
        ],
        // Enables Android's richer install sheet.
        screenshots: [
          { src: '/screenshots/home-narrow.png', sizes: '780x1688', type: 'image/png', form_factor: 'narrow', label: 'אתם בוחרים יעד, אנחנו מוצאים מלון' },
          { src: '/screenshots/search-narrow.png', sizes: '780x1688', type: 'image/png', form_factor: 'narrow', label: 'שאלון של דקה' },
          { src: '/screenshots/home-wide.png', sizes: '1440x900', type: 'image/png', form_factor: 'wide', label: 'Rose&Mor tours' },
        ],
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        // Splash screens and store screenshots are fetched by the OS, never by the app.
        globIgnores: ['**/apple-splash-*.png', '**/screenshots/**', '**/og.png'],
      },
    }),
  ],
})
