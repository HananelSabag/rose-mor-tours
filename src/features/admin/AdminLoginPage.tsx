import { useMutation, useQuery } from '@tanstack/react-query'
import { LoaderCircle, Mail } from 'lucide-react'
import { useState } from 'react'
import { Logo } from '@/components/Logo'
import { HeroPhoto } from '@/components/HeroPhoto'
import { buttonClass } from '@/components/ui/button'
import { useStaff } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

const field =
  'h-14 w-full rounded-field bg-white px-4 text-lg ring-1 ring-lagoon-200 outline-none placeholder:text-ink-faint focus:ring-2 focus:ring-ocean-700'

/** Which sign-in methods are switched on in Supabase Auth (public endpoint). */
function useAuthProviders() {
  return useQuery({
    queryKey: ['auth-settings'],
    staleTime: Infinity,
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/auth/v1/settings`, {
        headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
      })
      const json = (await res.json()) as { external?: Record<string, boolean> }
      return { google: !!json.external?.google, email: !!json.external?.email }
    },
  })
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.7z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9h-4v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.4 14.4a7.2 7.2 0 0 1 0-4.6V6.7h-4a12 12 0 0 0 0 10.7l4-3z" />
      <path fill="#EA4335" d="M12 4.8c1.7 0 3.3.6 4.5 1.8l3.4-3.4A11.5 11.5 0 0 0 12 0 12 12 0 0 0 1.4 6.7l4 3.1C6.3 6.9 8.9 4.8 12 4.8z" />
    </svg>
  )
}

export function AdminLoginPage() {
  const { ready, session, email: signedInEmail } = useStaff()
  const providers = useAuthProviders()
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [codeSent, setCodeSent] = useState(false)

  const sendCode = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: true } })
      if (error) throw error
    },
    onSuccess: () => setCodeSent(true),
  })

  const verify = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' })
      if (error) throw error
    },
  })

  const google = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/admin` } })
      if (error) throw error
    },
  })

  const refresh = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.refreshSession()
      if (error) throw error
    },
  })

  const signedInNotStaff = ready && session && !session.user.is_anonymous

  return (
    <div className="relative isolate grid min-h-dvh place-items-center px-4 py-10">
      <HeroPhoto fixed />
      <div className="fixed inset-0 -z-10 bg-ocean-950/45" />
      <div className="w-full max-w-md rounded-dock bg-white p-6 shadow-glass md:p-8">
        <Logo />
        <h1 className="mt-6 text-[22px] font-bold text-ocean-950">כניסה לצוות</h1>

        {signedInNotStaff ? (
          <div className="mt-4 space-y-4">
            <p className="text-ink">
              החשבון <span dir="ltr" className="font-semibold">{signedInEmail}</span> מחובר, אבל אין לו הרשאת צוות.
            </p>
            <p className="text-sm text-ink-soft">אם הרגע קיבלתם הרשאה, רעננו אותה. אחרת, בקשו מבעל החשבון להוסיף אתכם.</p>
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={() => refresh.mutate()} disabled={refresh.isPending} className={buttonClass('primary', 'md')}>
                רענון הרשאות
              </button>
              <button type="button" onClick={() => void supabase.auth.signOut()} className={buttonClass('secondary', 'md')}>
                התנתקות
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            {providers.data?.google && (
              <>
                <button type="button" onClick={() => google.mutate()} disabled={google.isPending} className={buttonClass('secondary', 'lg', 'w-full')}>
                  <GoogleIcon /> כניסה עם Google
                </button>
                <div className="flex items-center gap-3 text-sm text-ink-faint">
                  <span className="h-px flex-1 bg-lagoon-200" />
                  או עם קוד למייל
                  <span className="h-px flex-1 bg-lagoon-200" />
                </div>
              </>
            )}

            {!codeSent ? (
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault()
                  if (email.includes('@')) sendCode.mutate()
                }}
              >
                <label className="block">
                  <span className="mb-2 block font-medium">מייל</span>
                  <input type="email" required autoComplete="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} className={`${field} text-end`} />
                </label>
                {sendCode.isError && <p role="alert" className="text-sm text-coral-700">לא הצלחנו לשלוח קוד. נסו שוב בעוד דקה.</p>}
                <button type="submit" disabled={sendCode.isPending} className={buttonClass('primary', 'lg', 'w-full')}>
                  {sendCode.isPending ? <LoaderCircle className="size-5 animate-spin" /> : <Mail className="size-5" />}
                  שליחת קוד
                </button>
              </form>
            ) : (
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault()
                  if (code.trim().length >= 6) verify.mutate()
                }}
              >
                <p className="text-ink-soft">
                  שלחנו קוד ל־<span dir="ltr" className="font-medium text-ink">{email}</span>
                </p>
                <label className="block">
                  <span className="mb-2 block font-medium">הקוד מהמייל</span>
                  <input
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    dir="ltr"
                    maxLength={8}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                    className={`${field} tabular text-center text-2xl tracking-[0.4em]`}
                    autoFocus
                  />
                </label>
                {verify.isError && <p role="alert" className="text-sm text-coral-700">הקוד לא נכון או שפג תוקפו.</p>}
                <button type="submit" disabled={verify.isPending} className={buttonClass('primary', 'lg', 'w-full')}>
                  {verify.isPending && <LoaderCircle className="size-5 animate-spin" />}
                  כניסה
                </button>
                <button type="button" onClick={() => setCodeSent(false)} className={buttonClass('ghost', 'md', 'w-full')}>
                  שינוי מייל
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
