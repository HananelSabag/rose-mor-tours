import { Phone } from 'lucide-react'
import { useRef } from 'react'
import { useNavigate } from 'react-router'
import { HeroPhoto } from '@/components/HeroPhoto'
import { GroupedList, ListRow, SectionLabel } from '@/components/Page'
import { HERO_END_ID } from '@/components/SiteHeader'
import { Chip } from '@/components/ui/Chip'
import { buttonClass } from '@/components/ui/button'
import { WhatsAppIcon } from '@/components/ui/WhatsAppIcon'
import { DESTINATIONS, POPULAR_DESTINATIONS, destinationLabel } from '@/data/destinations'
import { DestinationCombobox } from '@/features/search/DestinationCombobox'
import { updateDraft, useDraft } from '@/features/search/draft'
import { BUSINESS, whatsappLink } from '@/lib/business'

const HOW_IT_WORKS = [
  { title: 'ממלאים שאלון קצר', body: 'יעד, תאריכים ומי טס. לוקח בערך דקה, בלי הרשמה.' },
  { title: 'מקבלים הצעה בוואטסאפ', body: 'הצוות מחפש אצל ספקים סיטונאיים ושולח הצעה עם מחיר סגור בשקלים, בתוקף ל־24 שעות.' },
  { title: 'משלמים ומקבלים וואוצ׳ר', body: 'תשלום מאובטח באשראי, אפשר בתשלומים. הוואוצ׳ר מגיע לאפליקציה ולוואטסאפ.' },
]

export function HomePage() {
  const navigate = useNavigate()
  const draft = useDraft()

  const formRef = useRef<HTMLFormElement>(null)
  const start = (destination?: string) => {
    if (destination !== undefined) updateDraft({ destination })
    if (destination || draft.destination.trim().length >= 2) navigate('/search?step=dates')
    else formRef.current?.querySelector('input')?.focus()
  }

  return (
    <>
      <section className="relative isolate overflow-hidden bg-ocean-900">
        <HeroPhoto />
        {/* Scrims: light at the top for the header, deeper at the bottom for the headline. */}
        <div className="absolute inset-0 -z-10 bg-linear-to-b from-ocean-950/45 via-ocean-950/0 via-35% to-ocean-950/70" />
        {/* Wide screens: the headline sits on the start (right) side, so darken that edge too. */}
        <div className="absolute inset-0 -z-10 hidden bg-linear-to-l from-ocean-950/55 via-ocean-950/15 via-45% to-transparent md:block" />
        <div className="mx-auto flex min-h-[max(27rem,min(36rem,58svh))] max-w-6xl flex-col justify-end px-5 pt-24 pb-30 md:min-h-[38rem] md:px-8 md:pb-44">
          <h1 className="animate-rise text-[clamp(2.125rem,9.5vw,4.5rem)] leading-[1.06] font-bold tracking-[-0.02em] text-balance text-white">
            <span className="block">אתם בוחרים יעד.</span>
            <span className="block">אנחנו מוצאים מלון.</span>
          </h1>
          <p className="animate-rise mt-3 max-w-[34ch] text-[17px] leading-snug text-white/90 [animation-delay:100ms] md:mt-4 md:text-xl">
            צוות אנושי מחפש לכם מלון בחו״ל אצל ספקים סיטונאיים, ושולח הצעה מסודרת לוואטסאפ.
          </p>
        </div>
      </section>

      <div className="relative z-10 mx-auto -mt-24 grid max-w-6xl grid-cols-[minmax(0,1fr)] gap-10 px-4 md:-mt-32 md:px-8 lg:grid-cols-[minmax(0,28rem)_1fr] lg:items-start lg:gap-16">
        {/* Where the photo ends: the header turns solid once this passes under it. */}
        <span id={HERO_END_ID} aria-hidden="true" className="absolute top-0 h-px w-px" />
        <section aria-labelledby="start-title" className="rounded-dock bg-white p-5 shadow-glass md:p-7">
          <h2 id="start-title" className="mb-4 text-[22px] font-bold text-ocean-950">
            לאן טסים?
          </h2>
          <form
            ref={formRef}
            onSubmit={(e) => {
              e.preventDefault()
              start()
            }}
          >
            <DestinationCombobox value={draft.destination} onChange={(destination) => updateDraft({ destination })} onPick={(label) => start(label)} />
            {/* One swipeable row on phones keeps the main button above the fold. */}
            <div className="-mx-5 mt-3 flex gap-2 overflow-x-auto px-5 [scrollbar-width:none] md:mx-0 md:flex-wrap md:px-0" aria-label="יעדים פופולריים">
              {POPULAR_DESTINATIONS.slice(0, 5).map((name) => {
                const d = DESTINATIONS.find((x) => x.name === name)
                return d ? (
                  <Chip key={name} role="button" selected={false} onToggle={() => start(destinationLabel(d))}>
                    {d.name}
                  </Chip>
                ) : null
              })}
            </div>
            <button type="submit" className={buttonClass('primary', 'lg', 'mt-5 w-full')}>
              המשך
            </button>
          </form>
          <p className="mt-3 text-center text-[13px] text-ink-soft">בערך דקה. בלי הרשמה ובלי התחייבות.</p>
        </section>

        <div className="space-y-12 lg:pt-44">
          <section aria-labelledby="how-title">
            <h2 id="how-title" className="mb-5 px-1 text-[22px] font-bold text-ocean-950">
              איך זה עובד
            </h2>
            <ol className="relative space-y-6 px-1">
              {HOW_IT_WORKS.map((item, i) => (
                <li key={item.title} className="relative flex gap-4">
                  {i < HOW_IT_WORKS.length - 1 && <span aria-hidden="true" className="absolute start-4 top-9 -bottom-5 w-px bg-lagoon-200" />}
                  <span className="tabular grid size-8 shrink-0 place-items-center rounded-full bg-ocean-800 text-[15px] font-semibold text-white">{i + 1}</span>
                  <div className="pt-0.5">
                    <h3 className="text-[17px] font-semibold text-ocean-950">{item.title}</h3>
                    <p className="mt-0.5 max-w-[46ch] text-[15px] text-ink-soft">{item.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section aria-labelledby="help-title" className="lg:max-w-xl">
            <SectionLabel>
              <span id="help-title">שאלה לפני שמתחילים?</span>
            </SectionLabel>
            <GroupedList>
              <ListRow icon={WhatsAppIcon} tone="whatsapp" title="כתבו לנו בוואטסאפ" detail="על יעדים, תאריכים או מחירים" href={whatsappLink('היי, יש לי שאלה לגבי מלון בחו״ל')} />
              <ListRow icon={Phone} title="שיחת טלפון" detail={<span dir="ltr">{BUSINESS.phoneDisplay}</span>} href={`tel:${BUSINESS.phoneE164}`} />
            </GroupedList>
          </section>
        </div>
      </div>

      <footer className="mx-auto max-w-6xl px-4 pt-10 pb-6 text-center text-[13px] text-ink-faint md:px-8">{BUSINESS.name}, מלונות בחו״ל</footer>
    </>
  )
}
