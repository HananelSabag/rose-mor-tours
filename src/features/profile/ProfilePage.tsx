import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import { Check, LayoutDashboard, LoaderCircle, LogIn, LogOut, Phone, Smartphone, UserRound } from 'lucide-react'
import { useState } from 'react'
import { AppBar } from '@/components/AppBar'
import { GroupedList, ListRow, Page, SectionLabel } from '@/components/Page'
import { buttonClass } from '@/components/ui/button'
import { WhatsAppIcon } from '@/components/ui/WhatsAppIcon'
import { useStaff } from '@/lib/auth'
import { BUSINESS, whatsappLink } from '@/lib/business'
import { formatPhone, normalizePhone } from '@/lib/format'
import { promptInstall, useInstallState } from '@/lib/install'
import { useSession } from '@/lib/session'
import { supabase } from '@/lib/supabase'

type ProfileDetails = { full_name: string | null; phone: string | null; email: string | null }

function useProfile(uid: string | undefined) {
  return useQuery({
    queryKey: ['profile', uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('full_name, phone, email').eq('id', uid!).single()
      if (error) throw error
      return data as ProfileDetails
    },
  })
}

function Identity({ profile, email }: { profile: ProfileDetails | undefined; email: string | null }) {
  const name = profile?.full_name?.trim()
  return (
    <div className="flex items-center gap-4 px-1">
      <span className="grid size-16 shrink-0 place-items-center rounded-full bg-linear-to-br from-turquoise-400 to-ocean-700 text-2xl font-bold text-white shadow-lift">
        {name ? name[0] : <UserRound className="size-7" />}
      </span>
      <div className="min-w-0">
        <p className="truncate text-[19px] font-semibold text-ocean-950">{name || 'אורח'}</p>
        <p className="text-[15px] text-ink-soft">{profile?.phone ? <span dir="ltr">{formatPhone(profile.phone)}</span> : email ? <span dir="ltr">{email}</span> : 'בלי חשבון'}</p>
      </div>
    </div>
  )
}

const rowField = 'flex min-h-14 items-center gap-3 px-4 focus-within:ring-2 focus-within:ring-ocean-700 focus-within:ring-inset'

function DetailsForm({ uid, profile }: { uid: string; profile: ProfileDetails }) {
  const queryClient = useQueryClient()
  const [name, setName] = useState(profile.full_name ?? '')
  const [phone, setPhone] = useState(profile.phone ? formatPhone(profile.phone) : '')

  const normalized = normalizePhone(phone)
  const phoneInvalid = phone.trim() !== '' && normalized === null
  const dirty = name.trim() !== (profile.full_name ?? '') || (normalized ?? '') !== (profile.phone ?? '')

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: name.trim() || null, phone: normalized })
        .eq('id', uid)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profile', uid] }),
  })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (dirty && !phoneInvalid) save.mutate()
      }}
    >
      <div className="divide-y divide-lagoon-100 overflow-hidden rounded-sheet bg-white shadow-lift">
        <label className={rowField}>
          <span className="w-20 shrink-0 text-[15px] text-ink-soft">שם</span>
          <input
            className="h-12 min-w-0 flex-1 bg-transparent outline-none placeholder:text-ink-faint"
            autoComplete="name"
            placeholder="השם שלכם"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className={rowField}>
          <span className="w-20 shrink-0 text-[15px] text-ink-soft">טלפון</span>
          <input
            className={clsx('h-12 min-w-0 flex-1 bg-transparent text-end outline-none placeholder:text-ink-faint', phoneInvalid && 'text-coral-700')}
            type="tel"
            inputMode="tel"
            dir="ltr"
            autoComplete="tel"
            placeholder="050-123-4567"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            aria-invalid={phoneInvalid}
          />
        </label>
        {profile.email && (
          <div className="flex min-h-14 items-center gap-3 px-4">
            <span className="w-20 shrink-0 text-[15px] text-ink-soft">מייל</span>
            <span className="min-w-0 flex-1 truncate text-end" dir="ltr">
              {profile.email}
            </span>
          </div>
        )}
      </div>
      {phoneInvalid && <p className="mt-2 px-1 text-[13px] text-coral-700">צריך מספר נייד, למשל 050-123-4567</p>}
      {dirty && !phoneInvalid && (
        <button type="submit" disabled={save.isPending} className={buttonClass('primary', 'md', 'animate-rise mt-3 w-full')}>
          {save.isPending && <LoaderCircle className="size-4 animate-spin" />}
          שמירת הפרטים
        </button>
      )}
      {save.isSuccess && !dirty && (
        <p className="mt-2 flex items-center gap-1 px-1 text-[13px] font-medium text-ocean-700" role="status">
          <Check className="size-4" /> נשמר
        </p>
      )}
      {save.isError && (
        <p className="mt-2 px-1 text-[13px] text-coral-700" role="alert">
          השמירה נכשלה. נסו שוב.
        </p>
      )}
    </form>
  )
}

function InstallRow() {
  const { canPrompt, installed, ios } = useInstallState()
  if (installed) return <ListRow icon={Smartphone} title="האפליקציה מותקנת" detail="תקבלו כאן עדכונים על ההצעות וההזמנות" trailing={<Check className="size-5 text-ocean-700" />} />
  if (canPrompt) return <ListRow icon={Smartphone} title="התקנה למסך הבית" detail="פתיחה בלחיצה, והתראה כשההצעה מוכנה" onClick={() => void promptInstall()} />
  if (ios) return <ListRow icon={Smartphone} title="הוספה למסך הבית" detail="בספארי: כפתור השיתוף, ואז ״הוספה למסך הבית״" />
  return <ListRow icon={Smartphone} title="הוספה למסך הבית" detail="מהתפריט של הדפדפן בטלפון" />
}

export function ProfilePage() {
  const { session, ready } = useSession()
  const { isStaff, email } = useStaff()
  const uid = session?.user.id
  const signedIn = !!session && !session.user.is_anonymous
  const { data: profile, isPending } = useProfile(uid)

  return (
    <>
      <AppBar title="פרופיל" />
      <Page className="space-y-7 md:grid md:grid-cols-2 md:items-start md:gap-x-10 md:gap-y-8 md:space-y-0">
        <div className="md:col-span-2">
          <Identity profile={profile} email={signedIn ? email : null} />
        </div>

        {isStaff && (
          <GroupedList>
            <ListRow icon={LayoutDashboard} title="ממשק הצוות" detail="בקשות, הצעות, הזמנות וצוות" to="/admin" />
          </GroupedList>
        )}

        {!ready || (uid && isPending) ? (
          <div className="skeleton h-28 rounded-sheet!" role="status" aria-label="טוען" />
        ) : (
          uid &&
          profile && (
            <section>
              <SectionLabel>הפרטים שלי</SectionLabel>
              <DetailsForm uid={uid} profile={profile} />
            </section>
          )
        )}

        <section>
          <SectionLabel>החשבון</SectionLabel>
          <GroupedList>
            {signedIn ? (
              <ListRow icon={LogOut} tone="coral" title="התנתקות" onClick={() => void supabase.auth.signOut()} />
            ) : (
              <ListRow icon={LogIn} title="כניסה עם Google" detail="כדי לראות את הבקשות שלכם מכל מכשיר" to="/login" />
            )}
          </GroupedList>
        </section>

        <section>
          <SectionLabel>האפליקציה</SectionLabel>
          <GroupedList>
            <InstallRow />
          </GroupedList>
        </section>

        <section>
          <SectionLabel>צריכים עזרה?</SectionLabel>
          <GroupedList>
            <ListRow icon={WhatsAppIcon} tone="whatsapp" title="וואטסאפ לצוות" detail="זמינים גם כשאתם כבר בחו״ל" href={whatsappLink()} />
            <ListRow icon={Phone} title="שיחת טלפון" detail={<span dir="ltr">{BUSINESS.phoneDisplay}</span>} href={`tel:${BUSINESS.phoneE164}`} />
          </GroupedList>
        </section>
      </Page>
    </>
  )
}
