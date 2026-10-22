import { useNavigate } from 'react-router'
import { PoolScene } from '@/components/PoolScene'
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

  const start = (destination?: string) => {
    if (destination !== undefined) updateDraft({ destination })
    navigate(destination || draft.destination.trim().length >= 2 ? '/search?step=hotel' : '/search')
  }

  return (
    <>
      <section className="relative isolate h-[34rem] overflow-hidden md:h-[42rem]">
        <PoolScene className="absolute inset-0 -z-10 size-full" />
        <div className="mx-auto max-w-6xl px-5 pt-24 md:px-8 md:pt-36">
          <h1 className="animate-rise text-[clamp(2rem,9vw,4.75rem)] leading-[1.05] font-extrabold tracking-tight text-ocean-950">
            <span className="block">אתם בוחרים יעד.</span>
            <span className="block">אנחנו מוצאים מלון.</span>
          </h1>
          <p className="animate-rise mt-4 max-w-[30ch] text-lg leading-snug text-ocean-900 [animation-delay:120ms] md:text-xl">
            צוות אנושי שמחפש לכם מלון בחו״ל אצל ספקים סיטונאיים, ושולח הצעה מסודרת לוואטסאפ.
          </p>
        </div>
      </section>

      <div className="relative z-10 mx-auto -mt-36 grid max-w-6xl gap-10 px-4 md:-mt-48 md:px-8 lg:grid-cols-[minmax(0,30rem)_1fr] lg:items-start">
        <section aria-labelledby="start-title" className="glass rounded-sheet p-5 md:p-7">
          <h2 id="start-title" className="mb-4 text-2xl font-bold text-ocean-950">
            לאן טסים?
          </h2>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              start()
            }}
          >
            <DestinationCombobox
              value={draft.destination}
              onChange={(destination) => updateDraft({ destination })}
              onPick={(label) => start(label)}
            />
            <div className="mt-4 flex flex-wrap gap-2">
              {POPULAR_DESTINATIONS.slice(0, 5).map((name) => {
                const d = DESTINATIONS.find((x) => x.name === name)
                return d ? (
                  <Chip key={name} role="button" selected={false} onToggle={() => start(destinationLabel(d))}>
                    {d.name}
                  </Chip>
                ) : null
              })}
            </div>
            <button type="submit" className={buttonClass('primary', 'lg', 'mt-6 w-full')}>
              למילוי השאלון
            </button>
          </form>
          <p className="mt-3 text-center text-sm text-ink-soft">בערך דקה. בלי הרשמה ובלי התחייבות.</p>
        </section>

        <section aria-labelledby="how-title" className="lg:pt-56">
          <h2 id="how-title" className="mb-6 text-2xl font-bold text-ocean-950">
            איך זה עובד
          </h2>
          <ol className="space-y-6">
            {HOW_IT_WORKS.map((item, i) => (
              <li key={item.title} className="flex gap-4">
                <span className="tabular grid size-10 shrink-0 place-items-center rounded-full bg-ocean-800 text-lg font-bold text-white">
                  {i + 1}
                </span>
                <div>
                  <h3 className="text-lg font-semibold">{item.title}</h3>
                  <p className="mt-1 max-w-[46ch] text-ink-soft">{item.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <section className="mx-auto mt-14 max-w-6xl px-4 md:px-8">
        <div className="flex flex-col items-start gap-4 rounded-sheet bg-ocean-900 p-6 text-white md:flex-row md:items-center md:justify-between md:p-8">
          <div>
            <h2 className="text-xl font-bold">שאלה לפני שמתחילים?</h2>
            <p className="mt-1 text-white/80">
              כתבו לנו בוואטסאפ או התקשרו ל־<span dir="ltr">{BUSINESS.phoneDisplay}</span>
            </p>
          </div>
          <a href={whatsappLink('היי, יש לי שאלה לגבי מלון בחו״ל')} target="_blank" rel="noreferrer" className={buttonClass('whatsapp', 'md')}>
            <WhatsAppIcon />
            כתבו לנו
          </a>
        </div>
        <footer className="py-8 text-center text-sm text-ink-faint">
          {BUSINESS.name}, מלונות בחו״ל
        </footer>
      </section>
    </>
  )
}
