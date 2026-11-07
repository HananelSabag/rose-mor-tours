import { useMutation } from '@tanstack/react-query'
import { LoaderCircle } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router'
import { HeroPhoto } from '@/components/HeroPhoto'
import { Loading } from '@/components/Page'
import { Logo } from '@/components/Logo'
import { buttonClass } from '@/components/ui/button'
import { useStaff } from '@/lib/auth'
import { beginGuestClaim } from '@/lib/session'
import { supabase } from '@/lib/supabase'

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

/** Only same-site paths, so a crafted ?next= can't bounce someone to another site. */
function safeNext(value: string | null): string | null {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : null
}

/**
 * The one sign-in, for staff and customers alike. After Google, the role in the token decides
 * where to go: staff to the staff app, everyone else back to where they were (or the profile).
 */
export function LoginPage() {
  const { ready, session, isStaff, email } = useStaff()
  const [params] = useSearchParams()
  const next = safeNext(params.get('next'))
  const wantsStaff = next?.startsWith('/admin') ?? false
  const signedIn = !!session && !session.user.is_anonymous

  // A role granted after this token was issued only shows up in a fresh one, so refresh once
  // before deciding that a signed-in account isn't staff.
  const [checked, setChecked] = useState(false)
  const refreshing = useRef(false)
  useEffect(() => {
    if (!signedIn || isStaff || refreshing.current) return
    refreshing.current = true
    void supabase.auth.refreshSession().finally(() => setChecked(true))
  }, [signedIn, isStaff])

  const google = useMutation({
    mutationFn: async () => {
      await beginGuestClaim()
      const back = `${window.location.origin}/login${next ? `?next=${encodeURIComponent(next)}` : ''}`
      const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: back } })
      if (error) throw error
    },
  })

  if (!ready) return <Loading />
  if (signedIn && isStaff) return <Navigate to={wantsStaff ? next! : '/admin'} replace />
  if (signedIn && !checked) return <Loading />
  if (signedIn && !wantsStaff) return <Navigate to={next ?? '/profile'} replace />

  return (
    <div className="relative isolate grid min-h-dvh place-items-center px-4 py-10">
      <HeroPhoto fixed />
      <div className="fixed inset-0 -z-10 bg-ocean-950/45" />
      <div className="w-full max-w-sm rounded-dock bg-white p-6 shadow-glass md:p-8">
        <Link to="/" aria-label="לדף הבית" className="inline-block rounded-xl">
          <Logo />
        </Link>

        {signedIn ? (
          // Signed in, but the staff page they asked for isn't theirs (yet).
          <>
            <h1 className="mt-6 text-[22px] font-bold text-ocean-950">אין עדיין גישת צוות</h1>
            <p className="mt-2 text-[15px] text-ink-soft">
              החשבון{' '}
              <span dir="ltr" className="font-medium text-ink">
                {email}
              </span>{' '}
              מחובר. אחרי שבעל העסק יאשר אותו בלשונית ״צוות״, נכנסים שוב.
            </p>
            <div className="mt-6 grid gap-3">
              <Link to="/" className={buttonClass('primary', 'lg')}>
                לאתר
              </Link>
              <button type="button" onClick={() => void supabase.auth.signOut()} className={buttonClass('ghost', 'md')}>
                כניסה עם חשבון אחר
              </button>
            </div>
          </>
        ) : (
          <>
            <h1 className="mt-6 text-[22px] font-bold text-ocean-950">כניסה</h1>
            <p className="mt-2 text-[15px] text-ink-soft">עם חשבון Google. בקשות שכבר שלחתם מהמכשיר הזה יעברו לחשבון.</p>
            <button type="button" onClick={() => google.mutate()} disabled={google.isPending} className={buttonClass('secondary', 'lg', 'mt-6 w-full')}>
              {google.isPending ? <LoaderCircle className="size-5 animate-spin" /> : <GoogleIcon />}
              המשך עם Google
            </button>
            {google.isError && (
              <p role="alert" className="mt-3 text-[13px] text-coral-700">
                הכניסה לא הצליחה. נסו שוב.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
