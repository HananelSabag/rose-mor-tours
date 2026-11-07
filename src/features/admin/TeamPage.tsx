import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import { Check, Copy, ShieldCheck, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { Card, ListSkeleton, Pill } from '@/components/Page'
import { buttonClass } from '@/components/ui/button'
import { useStaff } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { timeAgo } from '@/lib/time'
import type { Profile } from '@/lib/types'

type Person = Pick<Profile, 'id' | 'full_name' | 'email' | 'role' | 'created_at'>
type Role = Person['role']

const ROLE_LABEL: Record<Role, string> = { owner: 'בעלים', admin: 'צוות', customer: 'בלי גישה' }

function Avatar({ email }: { email: string | null }) {
  return (
    <span className="grid size-11 shrink-0 place-items-center rounded-full bg-lagoon-100 text-lg font-bold text-ocean-800 uppercase">
      {email?.[0] ?? '?'}
    </span>
  )
}

function StaffLoginLink() {
  const url = `${window.location.origin}/login`
  const [copied, setCopied] = useState(false)
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-field bg-lagoon-100 px-4 py-3">
      <span className="min-w-0 flex-1 truncate font-medium text-ocean-900" dir="ltr">
        {url}
      </span>
      <button
        type="button"
        onClick={() => {
          void navigator.clipboard.writeText(url).then(() => {
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
          })
        }}
        className={buttonClass('secondary', 'md', 'h-10')}
      >
        {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        {copied ? 'הועתק' : 'העתקת הקישור'}
      </button>
    </div>
  )
}

export function TeamPage() {
  const queryClient = useQueryClient()
  const { role: myRole, session } = useStaff()
  const isOwner = myRole === 'owner'
  const myId = session?.user.id

  // Only people who signed in with a real account have an email; anonymous customers do not.
  const { data, isPending, isError } = useQuery({
    queryKey: ['admin', 'team'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, created_at')
        .not('email', 'is', null)
        .order('created_at', { ascending: false })
        .limit(200)
      if (error) throw error
      return data as Person[]
    },
  })

  const setRole = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: Role }) => {
      const { error } = await supabase.from('profiles').update({ role }).eq('id', id)
      if (error) throw error
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['admin', 'team'] }),
  })

  const team = (data ?? []).filter((p) => p.role !== 'customer')
  const others = (data ?? []).filter((p) => p.role === 'customer')

  return (
    <div className="space-y-6">
      <div className="hidden lg:block">
        <h1 className="text-3xl font-bold text-ocean-950">צוות</h1>
      </div>

      <Card>
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <UserPlus className="size-5 text-turquoise-500" /> איך מצרפים מישהי לצוות
        </h2>
        <ol className="mt-2 mb-4 list-inside list-decimal space-y-1 text-ink-soft">
          <li>שולחים לה את הקישור הזה. היא נכנסת עם חשבון ה־Google שלה.</li>
          <li>היא מופיעה כאן למטה, ב״נכנסו ומחכים לאישור״.</li>
          <li>{isOwner ? 'לוחצים ״אישור לצוות״, והיא לוחצת אצלה ״רענון הרשאות״.' : 'מי שמוגדר בעלים מאשר אותה.'}</li>
        </ol>
        <StaffLoginLink />
      </Card>

      {isPending ? (
        <ListSkeleton rows={2} />
      ) : isError ? (
        <p role="alert" className="rounded-field bg-coral-500/10 px-4 py-3 text-coral-700">לא הצלחנו לטעון את הרשימה.</p>
      ) : (
        <>
          <section>
            <h2 className="mb-3 text-lg font-semibold">בצוות</h2>
            <ul className="space-y-2">
              {team.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center gap-3 rounded-sheet bg-white p-4 shadow-lift">
                  <Avatar email={p.email} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold" dir="ltr">
                      {p.email}
                    </div>
                    {p.id === myId && <div className="text-sm text-ink-soft">זה את/ה</div>}
                  </div>
                  {isOwner && p.id !== myId ? (
                    <div className="flex gap-1 rounded-full bg-lagoon-50 p-1 ring-1 ring-lagoon-200" role="radiogroup" aria-label={`הרשאה של ${p.email}`}>
                      {(['admin', 'owner', 'customer'] as Role[]).map((r) => (
                        <button
                          key={r}
                          type="button"
                          role="radio"
                          aria-checked={p.role === r}
                          disabled={setRole.isPending}
                          onClick={() => setRole.mutate({ id: p.id, role: r })}
                          className={clsx(
                            'rounded-full px-3 py-1.5 text-sm font-medium transition',
                            p.role === r ? (r === 'customer' ? 'bg-coral-600 text-white' : 'bg-ocean-800 text-white') : 'text-ink-soft hover:bg-white',
                          )}
                        >
                          {r === 'customer' ? 'הסרה' : ROLE_LABEL[r]}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <Pill tone={p.role === 'owner' ? 'ocean' : 'lagoon'}>
                      <ShieldCheck className="me-1 size-4" /> {ROLE_LABEL[p.role]}
                    </Pill>
                  )}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="mb-1 text-lg font-semibold">נכנסו ומחכים לאישור</h2>
            <p className="mb-3 text-sm text-ink-soft">כל מי שהתחבר עם Google ועדיין אין לו גישה.</p>
            {others.length === 0 ? (
              <p className="rounded-sheet border-2 border-dashed border-lagoon-200 px-5 py-8 text-center text-ink-soft">אף אחד לא מחכה כרגע.</p>
            ) : (
              <ul className="space-y-2">
                {others.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center gap-3 rounded-sheet bg-white p-4 shadow-lift">
                    <Avatar email={p.email} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold" dir="ltr">
                        {p.email}
                      </div>
                      <div className="text-sm text-ink-soft">נכנס/ה {timeAgo(p.created_at)}</div>
                    </div>
                    {isOwner && (
                      <div className="flex gap-2">
                        <button type="button" disabled={setRole.isPending} onClick={() => setRole.mutate({ id: p.id, role: 'admin' })} className={buttonClass('primary', 'md', 'h-10')}>
                          אישור לצוות
                        </button>
                        <button type="button" disabled={setRole.isPending} onClick={() => setRole.mutate({ id: p.id, role: 'owner' })} className={buttonClass('secondary', 'md', 'h-10')}>
                          כבעלים
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
          {setRole.isError && <p role="alert" className="text-sm text-coral-700">השינוי לא נשמר. רק בעלים יכולים לשנות הרשאות.</p>}
        </>
      )}
    </div>
  )
}
