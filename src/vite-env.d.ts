/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string
  /** The business's WhatsApp number, E.164 (+9725XXXXXXXX). */
  readonly VITE_BUSINESS_PHONE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
