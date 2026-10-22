import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, LayoutDashboard, Phone, Share, SquarePlus, Smartphone } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { Card, Loading, Page, PageTitle } from '@/components/Page'
import { buttonClass } from '@/components/ui/button'
import { WhatsAppIcon } from '@/components/ui/WhatsAppIcon'
import { BUSINESS, whatsappLink } from '@/lib/business'
import { formatPhone, normalizePhone } from '@/lib/format'
import { useStaff } from '@/lib/auth'
import { promptInstall, useInstallState } from '@/lib/install'
import { useSession } from '@/lib/session'
import { supabase } from '@/lib/supabase'

const field =
  'h-12 w-full rounded-field bg-lagoon-50 px-4 text-base ring-1 ring-lagoon-200 outline-none focus:ring-2 focus:ring-turquoise-400'

type ProfileDetails = { full_name: string | null; phone: string | null; email: string | null }

function DetailsCard({ uid }: { uid: string }) {
  const { data: profile, isPending, isError } = useQuery({
    queryKey: ['profile', uid],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('full_name, phone, email').eq('id', uid).single()
      if (error) throw error
      return data
    },
  })

  if (isPending) return <Card><Loading /></Card>
  if (isError) return <Card><p role="alert" className="text-coral-600">לא הצלחנו לטעון את הפרטים.</p></Card>
  return <DetailsForm uid={uid} profile={profile} />
}

function DetailsForm({ uid, profile }: { uid: string; profile: ProfileDetails }) {
  const queryClient = useQueryClient()
  const [name, setName] = useState(profile.full_name ?? '')
  const [phone, setPhone] = useState(profile.phone ? formatPhone(profile.phone) : '')

  const normalized = normalizePhone(phone)
  const phoneInvalid = phone.trim() !== '' && normalized === null
  const dirty = (name.trim() !== (profile.full_name ?? '') || (normalized ?? '') !== (profile.phone ?? ''))

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
    <Card>
      <h2 className="mb-4 text-lg font-semibold">הפרטים שלי</h2>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          if (dirty && !phoneInvalid) save.mutate()
        }}
      >
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-ink-soft">שם</span>
          <input className={field} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-ink-soft">טלפון נייד</span>
          <input
            className={`${field} text-end ${phoneInvalid ? 'ring-coral-500' : ''}`}
            type="tel"
            inputMode="tel"
            dir="ltr"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            aria-invalid={phoneInvalid}
          />
          {phoneInvalid && <span className="mt-1.5 block text-sm text-coral-600">צריך מספר נייד, למשל 050-123-4567</span>}
        </label>
        {profile.email && <p className="text-sm text-ink-soft">מייל: <span dir="ltr">{profile.email}</span></p>}
        <div className="flex items-center gap-3">
          <button type="submit" disabled={!dirty || phoneInvalid || save.isPending} className={buttonClass('secondary', 'md')}>
            שמירת הפרטים
          </button>
          {save.isSuccess && !dirty && (
            <span className="inline-flex items-center gap-1 text-sm font-medium text-ocean-700" role="status">
              <Check className="size-4" /> נשמר
            </span>
          )}
          {save.isError && <span className="text-sm text-coral-600" role="alert">השמירה נכשלה. נסו שוב.</span>}
        </div>
      </form>
      <p className="mt-5 border-t border-lagoon-200 pt-4 text-sm leading-relaxed text-ink-soft">
        הבקשות שלכם שמורות בדפדפן הזה. בשלב התשלום תוכלו לחבר חשבון Google או מייל, ואז תראו אותן מכל מכשיר.
      </p>
    </Card>
  )
}

function InstallCard() {
  const { canPrompt, installed, ios } = useInstallState()
  return (
    <Card>
      <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold">
        <Smartphone className="size-5 text-turquoise-500" />
        האפליקציה במסך הבית
      </h2>
      {installed ? (
        <p className="text-ink-soft">האפליקציה מותקנת. תקבלו בה עדכונים על ההצעות וההזמנות.</p>
      ) : canPrompt ? (
        <>
          <p className="mb-4 text-ink-soft">פותחים בלחיצה, ומקבלים התראה כשההצעה או הוואוצ׳ר מוכנים.</p>
          <button type="button" onClick={() => void promptInstall()} className={buttonClass('secondary', 'md')}>
            התקנת האפליקציה
          </button>
        </>
      ) : ios ? (
        <ol className="space-y-2 text-ink-soft">
          <li className="flex items-center gap-2">
            1. בספארי, לוחצים על <Share className="inline size-5 text-ocean-700" aria-label="שיתוף" />
          </li>
          <li className="flex items-center gap-2">
            2. בוחרים ״הוספה למסך הבית״ <SquarePlus className="inline size-5 text-ocean-700" aria-hidden="true" />
          </li>
        </ol>
      ) : (
        <p className="text-ink-soft">פתחו את האתר בכרום או בספארי בטלפון, והוסיפו אותו למסך הבית מתפריט הדפדפן.</p>
      )}
    </Card>
  )
}

export function ProfilePage() {
  const { session, ready } = useSession()
  const { isStaff } = useStaff()

  return (
    <Page>
      <PageTitle title="פרופיל" />
      {isStaff && (
        <Link to="/admin" className={buttonClass('primary', 'md', 'mb-5')}>
          <LayoutDashboard className="size-5" /> לממשק הצוות
        </Link>
      )}
      <div className="grid gap-5 md:grid-cols-2">
        {!ready ? (
          <Card><Loading /></Card>
        ) : session ? (
          <DetailsCard uid={session.user.id} />
        ) : (
          <Card>
            <h2 className="mb-2 text-lg font-semibold">הפרטים שלי</h2>
            <p className="mb-5 text-ink-soft">השם והטלפון יופיעו כאן אחרי שתשלחו בקשה ראשונה.</p>
            <Link to="/search" className={buttonClass('primary', 'md')}>
              לחיפוש מלון
            </Link>
          </Card>
        )}

        <div className="space-y-5">
          <InstallCard />
          <Card>
            <h2 className="mb-2 text-lg font-semibold">צריכים עזרה?</h2>
            <p className="mb-4 text-ink-soft">הצוות זמין בוואטסאפ, גם כשאתם כבר בחו״ל.</p>
            <div className="flex flex-wrap gap-3">
              <a href={whatsappLink()} target="_blank" rel="noreferrer" className={buttonClass('whatsapp', 'md')}>
                <WhatsAppIcon /> וואטסאפ
              </a>
              <a href={`tel:${BUSINESS.phoneE164}`} className={buttonClass('secondary', 'md')}>
                <Phone className="size-5" />
                <span dir="ltr">{BUSINESS.phoneDisplay}</span>
              </a>
            </div>
          </Card>
        </div>
      </div>
    </Page>
  )
}
