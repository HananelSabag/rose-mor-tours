import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import { ArrowRight, LoaderCircle, Plus, Send, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Loading } from '@/components/Page'
import { buttonClass } from '@/components/ui/button'
import { Gallery } from '@/features/offer/Gallery'
import { OfferView } from '@/features/offer/OfferView'
import { formatDateRange, nightsBetween, pluralNights } from '@/lib/format'
import { BOARD_BASIS, ROOM_SETUP, VACATION_STYLE, partySummary, starsLabel } from '@/lib/labels'
import { supabase } from '@/lib/supabase'
import type { Offer, QuoteRequest } from '@/lib/types'
import { OfferFields } from './OfferFields'
import { customerWhatsapp, firstName, offerMessage } from './whatsapp'
import { emptyFromRequest, fromOffer, toPreview, toRow, validate, type OfferFormValues } from './offerForm'

type Loaded = { request: QuoteRequest; root: Offer | null; alt: Offer | null }

/** The database refuses impossible offers on its own; say why in plain words. */
function saveErrorText(error: unknown): string {
  const e = error as { code?: string; message?: string } | null
  if (e?.code === '55000' && e.message?.includes('booked or closed')) return 'אי אפשר לשנות הצעה שכבר הוזמנה. בונים הצעה חדשה.'
  if (e?.code === '55000') return 'יש כבר הצעה אחרת לבקשה הזאת בתהליך הזמנה.'
  if (e?.code === '22023' && e.message?.includes('check_in')) return 'תאריך ההגעה עבר.'
  if (e?.code === '22023') return 'תאריך הביטול החינם עבר.'
  if (e?.code === '23514') return 'יש נתון לא הגיוני: ביטול חינם אחרי ההגעה, או מחיר ברשת נמוך משלנו.'
  return 'השמירה נכשלה. נסו שוב.'
}

export function OfferEditorPage() {
  const { requestId, offerId } = useParams()
  const { data, isPending, isError } = useQuery({
    queryKey: ['admin', 'offer-editor', offerId ?? requestId],
    // The form owns its state after load; refetching would overwrite edits.
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<Loaded> => {
      if (offerId) {
        const { data: root, error } = await supabase.from('offers').select('*').eq('id', offerId).single()
        if (error) throw error
        const [{ data: alts }, { data: request, error: reqError }] = await Promise.all([
          supabase.from('offers').select('*').eq('parent_offer_id', offerId).neq('status', 'withdrawn').limit(1),
          supabase.from('quote_requests').select('*').eq('id', root.request_id).single(),
        ])
        if (reqError) throw reqError
        return { request, root, alt: alts?.[0] ?? null }
      }
      const { data: request, error } = await supabase.from('quote_requests').select('*').eq('id', requestId!).single()
      if (error) throw error
      return { request, root: null, alt: null }
    },
  })

  if (isPending) return <Loading />
  if (isError || !data) return <p className="py-10 text-center text-ink-soft">לא הצלחנו לטעון את ההצעה.</p>
  return <Editor {...data} />
}

function Editor({ request, root, alt }: Loaded) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [primary, setPrimary] = useState<OfferFormValues>(() => (root ? fromOffer(root) : emptyFromRequest(request)))
  const [alternative, setAlternative] = useState<OfferFormValues | null>(() => (alt ? fromOffer(alt) : null))
  const [removedAltId, setRemovedAltId] = useState<string | null>(null)
  const [tab, setTab] = useState<'primary' | 'alt'>('primary')
  const [showErrors, setShowErrors] = useState(false)
  // A new offer, once saved, is sent from right here instead of from the request page.
  const [ready, setReady] = useState<{ id: string; token: string; update: boolean } | null>(null)

  const errors = validate(primary)
  const altErrors = alternative ? validate(alternative) : {}
  const invalid = Object.keys(errors).length > 0 || Object.keys(altErrors).length > 0
  const current = tab === 'alt' && alternative ? alternative : primary

  const save = useMutation({
    mutationFn: async () => {
      let rootId = primary.id
      let token = root?.public_token ?? ''
      const rootStatus = root?.status ?? 'draft'
      if (rootId) {
        const { error } = await supabase.from('offers').update(toRow(primary)).eq('id', rootId)
        if (error) throw error
      } else {
        const { data, error } = await supabase.from('offers').insert({ ...toRow(primary), request_id: request.id }).select('id, public_token').single()
        if (error) throw error
        rootId = data.id
        token = data.public_token
      }
      // Working on an offer means the request is being handled; no separate button for that.
      if (request.status === 'new') {
        const { error } = await supabase.from('quote_requests').update({ status: 'in_progress' }).eq('id', request.id)
        if (error) throw error
      }
      if (alternative) {
        if (alternative.id) {
          const { error } = await supabase.from('offers').update(toRow(alternative)).eq('id', alternative.id)
          if (error) throw error
        } else {
          // An alternative added to an already-sent offer goes live with it.
          const { error } = await supabase
            .from('offers')
            .insert({ ...toRow(alternative), request_id: request.id, parent_offer_id: rootId, status: rootStatus === 'sent' ? 'sent' : 'draft' })
          if (error) throw error
        }
      }
      if (removedAltId) {
        const { error } = await supabase.from('offers').delete().eq('id', removedAltId)
        if (error) throw error
      }
      return { id: rootId!, token, live: rootStatus === 'draft' || rootStatus === 'sent', wasSent: rootStatus === 'sent' }
    },
    onSuccess: async ({ id, token, live, wasSent }) => {
      await queryClient.invalidateQueries({ queryKey: ['admin'] })
      if (live) setReady({ id, token, update: wasSent })
      else navigate(`/admin/requests/${request.id}`)
    },
  })

  const markSent = useMutation({
    mutationFn: async (id: string) => {
      // An edited live offer was already restarted by the database when it was saved.
      if (ready?.update) return
      const { error } = await supabase.from('offers').update({ status: 'sent' }).eq('id', id)
      if (error) throw error
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin'] })
      navigate(`/admin/requests/${request.id}`)
    },
  })

  const sendHref = ready
    ? customerWhatsapp(
        request.contact_phone,
        offerMessage({
          firstName: firstName(request.contact_name),
          destination: request.destination,
          hotelName: primary.hotel_name,
          stars: primary.stars,
          checkIn: primary.check_in,
          checkOut: primary.check_out,
          price: toRow(primary).price_ils,
          token: ready.token,
          hasAlternative: !!alternative,
        }),
      )
    : null

  const addAlternative = () => {
    setAlternative({
      ...emptyFromRequest(request),
      city: primary.city,
      country: primary.country,
      check_in: primary.check_in,
      check_out: primary.check_out,
      board_basis: primary.board_basis,
      hotel_name: '',
    })
    setTab('alt')
  }

  const removeAlternative = () => {
    if (!window.confirm('להסיר את המלון החלופי?')) return
    if (alternative?.id) setRemovedAltId(alternative.id)
    setAlternative(null)
    setTab('primary')
  }

  const missing = [...new Set(Object.values(errors)), ...Object.values(altErrors).map((e) => `${e} (חלופה)`)]

  const brief = (
    <section className="rounded-sheet bg-white p-4 shadow-lift" aria-label="מה הלקוח ביקש">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[17px] font-semibold text-ocean-950">{request.contact_name}</h2>
        <span className="text-[13px] text-ink-faint">מה ביקשו</span>
      </div>
      <p className="mt-1 text-[15px] text-ink">
        {request.destination}. {formatDateRange(request.check_in, request.check_out)} ({pluralNights(nightsBetween(request.check_in, request.check_out))}
        {request.flexible_days ? `, ±${request.flexible_days}` : ''})
      </p>
      <p className="text-[13px] text-ink-soft">
        {partySummary(request.adults, request.children_ages)}, {ROOM_SETUP[request.room_setup].label}
        {request.min_stars ? `. ${starsLabel(request.min_stars)}` : ''}
        {request.board_basis ? `. ${BOARD_BASIS[request.board_basis].label}` : ''}
        {request.vacation_styles.length ? `. ${request.vacation_styles.map((s) => VACATION_STYLE[s]).join(', ')}` : ''}
      </p>
      {request.hotel_name && (
        <p className="mt-1 text-[13px] font-medium text-ocean-800" dir="auto">
          ביקשו מלון: {request.hotel_name}
        </p>
      )}
      {request.notes && <p className="mt-2 rounded-field bg-lagoon-50 p-2.5 text-[13px] whitespace-pre-line text-ink">״{request.notes}״</p>}
    </section>
  )

  const preview = (
    <div className="overflow-hidden rounded-sheet bg-lagoon-50 shadow-lift ring-1 ring-lagoon-200">
      <div className="[&>div]:rounded-none!">
        <Gallery images={current.images} alt={current.hotel_name} />
      </div>
      <div className="p-4">
        <OfferView offer={toPreview(current)} guests={partySummary(request.adults, request.children_ages)} />
      </div>
    </div>
  )

  return (
    <div className="pb-32">
      <Link to={`/admin/requests/${request.id}`} className="mb-3 inline-flex items-center gap-1.5 text-[15px] font-medium text-ocean-700 hover:underline">
        <ArrowRight className="size-4" /> חזרה לבקשה
      </Link>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <h1 className="flex-1 text-[1.75rem] leading-tight font-bold text-ocean-950">{root ? 'עריכת הצעה' : 'הצעה חדשה'}</h1>
        {alternative ? (
          tab === 'alt' && (
            <button type="button" onClick={removeAlternative} className={buttonClass('ghost', 'md', 'text-coral-700 hover:bg-coral-500/10')}>
              <Trash2 className="size-4" /> הסרת החלופה
            </button>
          )
        ) : (
          <button type="button" onClick={addAlternative} className={buttonClass('secondary', 'md')}>
            <Plus className="size-4" /> מלון חלופי
          </button>
        )}
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_24rem] xl:grid-cols-[minmax(0,1fr)_26rem]">
        <div className="min-w-0 space-y-4">
          <div className="lg:hidden">{brief}</div>
          {alternative && (
            <div className="grid grid-cols-2 gap-1 rounded-field bg-white p-1 shadow-lift" role="tablist" aria-label="איזה מלון עורכים">
              {(['primary', 'alt'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  aria-selected={tab === t}
                  onClick={() => setTab(t)}
                  className={clsx('h-11 rounded-[0.6rem] text-[15px] font-semibold transition', tab === t ? 'bg-ocean-800 text-white' : 'text-ocean-900 hover:bg-lagoon-50')}
                >
                  {t === 'primary' ? 'המלון הראשי' : 'המלון החלופי'}
                </button>
              ))}
            </div>
          )}
          <OfferFields
            key={tab}
            request={request}
            values={current}
            errors={showErrors ? (tab === 'alt' ? altErrors : errors) : {}}
            onChange={(patch) => (tab === 'alt' ? setAlternative((a) => (a ? { ...a, ...patch } : a)) : setPrimary((p) => ({ ...p, ...patch })))}
          />
          <details className="group lg:hidden">
            <summary className="flex h-12 cursor-pointer list-none items-center justify-center rounded-field bg-white text-[15px] font-semibold text-ocean-800 shadow-lift">
              איך הלקוח יראה את ההצעה
            </summary>
            <div className="mt-3">{preview}</div>
          </details>
        </div>

        <aside className="sticky top-6 hidden max-h-[calc(100dvh-3rem)] space-y-4 overflow-y-auto lg:block" aria-label="הבקשה ותצוגה מקדימה">
          {brief}
          <div>
            <p className="mb-2 text-[13px] font-medium text-ink-soft">כך הלקוח יראה את זה</p>
            {preview}
          </div>
        </aside>
      </div>

      <div className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-lagoon-200 bg-white/95 px-4 pt-3 backdrop-blur-xl lg:start-60">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 pb-1 md:px-4">
          {ready && sendHref ? (
            <>
              <p className="flex-1 text-[15px] font-medium text-ocean-800">
                {ready.update ? 'עודכן. הקישור עובד עוד 24 שעות מעכשיו, כדאי לשלוח ללקוח את העדכון.' : 'נשמר. נשאר לשלוח ללקוח.'}
              </p>
              <Link to={`/admin/requests/${request.id}`} className={buttonClass('ghost', 'lg')}>
                אחר כך
              </Link>
              <a href={sendHref} target="_blank" rel="noreferrer" onClick={() => markSent.mutate(ready.id)} className={buttonClass('whatsapp', 'lg', 'w-full sm:w-auto')}>
                <Send className="size-5" /> שליחה בוואטסאפ
              </a>
            </>
          ) : (
            <>
              {showErrors && missing.length > 0 && <p className="min-w-0 flex-1 text-[13px] text-coral-700">חסר או לא תקין: {missing.join(' · ')}</p>}
              {save.isError && <p className="flex-1 text-[13px] text-coral-700">{saveErrorText(save.error)}</p>}
              <button
                type="button"
                disabled={save.isPending}
                onClick={() => {
                  setShowErrors(true)
                  if (!invalid) save.mutate()
                }}
                className={buttonClass('primary', 'lg', 'ms-auto w-full sm:w-auto')}
              >
                {save.isPending && <LoaderCircle className="size-5 animate-spin" />}
                {root ? 'שמירת השינויים' : 'שמירה'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
