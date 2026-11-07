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
import { partySummary } from '@/lib/labels'
import { supabase } from '@/lib/supabase'
import type { Offer, QuoteRequest } from '@/lib/types'
import { OfferFields } from './OfferFields'
import { customerWhatsapp, firstName, offerMessage } from './whatsapp'
import { emptyFromRequest, fromOffer, toPreview, toRow, validate, type OfferFormValues } from './offerForm'

type Loaded = { request: QuoteRequest; root: Offer | null; alt: Offer | null }

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
  const [mobileView, setMobileView] = useState<'edit' | 'preview'>('edit')
  const [showErrors, setShowErrors] = useState(false)
  // A new offer, once saved, is sent from right here instead of from the request page.
  const [ready, setReady] = useState<{ id: string; token: string } | null>(null)

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
      return { id: rootId!, token, wasDraft: rootStatus === 'draft' }
    },
    onSuccess: async ({ id, token, wasDraft }) => {
      await queryClient.invalidateQueries({ queryKey: ['admin'] })
      if (wasDraft) setReady({ id, token })
      else navigate(`/admin/requests/${request.id}`)
    },
  })

  const markSent = useMutation({
    mutationFn: async (id: string) => {
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

  const missing = [...Object.values(errors), ...Object.values(altErrors).map((e) => `${e} (חלופה)`)]

  return (
    <div className="pb-32">
      <Link to={`/admin/requests/${request.id}`} className="mb-4 inline-flex items-center gap-1.5 font-medium text-ocean-700 hover:underline">
        <ArrowRight className="size-4" /> חזרה לבקשה
      </Link>
      <h1 className="text-3xl font-bold text-ocean-950">{root ? 'עריכת הצעה' : 'הצעה חדשה'}</h1>
      <p className="mt-1 text-ink-soft">
        {request.contact_name}: {request.destination}, {formatDateRange(request.check_in, request.check_out)} ({pluralNights(nightsBetween(request.check_in, request.check_out))}),{' '}
        {partySummary(request.adults, request.children_ages)}
        {request.notes ? `. "${request.notes}"` : ''}
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <div className="flex gap-1 rounded-full bg-white p-1 ring-1 ring-lagoon-200" role="tablist">
          <button type="button" role="tab" aria-selected={tab === 'primary'} onClick={() => setTab('primary')} className={clsx('rounded-full px-4 py-2 font-medium', tab === 'primary' ? 'bg-ocean-800 text-white' : 'text-ocean-900')}>
            מלון ראשי
          </button>
          {alternative && (
            <button type="button" role="tab" aria-selected={tab === 'alt'} onClick={() => setTab('alt')} className={clsx('rounded-full px-4 py-2 font-medium', tab === 'alt' ? 'bg-ocean-800 text-white' : 'text-ocean-900')}>
              מלון חלופי
            </button>
          )}
        </div>
        {alternative ? (
          tab === 'alt' && (
            <button type="button" onClick={removeAlternative} className={buttonClass('ghost', 'md', 'text-coral-700 hover:bg-coral-500/10')}>
              <Trash2 className="size-4" /> הסרת החלופה
            </button>
          )
        ) : (
          <button type="button" onClick={addAlternative} className={buttonClass('ghost', 'md')}>
            <Plus className="size-4" /> הוספת מלון חלופי
          </button>
        )}
        <div className="ms-auto flex gap-1 rounded-full bg-white p-1 ring-1 ring-lagoon-200 lg:hidden">
          {(['edit', 'preview'] as const).map((v) => (
            <button key={v} type="button" onClick={() => setMobileView(v)} className={clsx('rounded-full px-3 py-1.5 text-sm font-medium', mobileView === v ? 'bg-lagoon-100 text-ocean-900' : 'text-ink-soft')}>
              {v === 'edit' ? 'עריכה' : 'תצוגה מקדימה'}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 grid items-start gap-8 lg:grid-cols-[1fr_minmax(0,26rem)]">
        <div className={clsx(mobileView === 'preview' && 'hidden lg:block')}>
          <OfferFields
            key={tab}
            requestId={request.id}
            values={current}
            errors={showErrors ? (tab === 'alt' ? altErrors : errors) : {}}
            onChange={(patch) => (tab === 'alt' ? setAlternative((a) => (a ? { ...a, ...patch } : a)) : setPrimary((p) => ({ ...p, ...patch })))}
          />
        </div>
        <aside className={clsx('lg:sticky lg:top-24', mobileView === 'edit' && 'hidden lg:block')} aria-label="תצוגה מקדימה">
          <div className="mb-2 text-sm font-medium text-ink-soft">כך הלקוח יראה את זה</div>
          <div className="overflow-hidden rounded-sheet bg-lagoon-50 shadow-lift ring-1 ring-lagoon-200">
            <div className="[&>div]:rounded-none!">
              <Gallery images={current.images} alt={current.hotel_name} />
            </div>
            <div className="p-4">
              <OfferView offer={toPreview(current)} guests={partySummary(request.adults, request.children_ages)} />
            </div>
          </div>
        </aside>
      </div>

      <div className="glass safe-bottom fixed inset-x-0 bottom-0 z-30 px-4 pt-3">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 md:px-4">
          {ready && sendHref ? (
            <>
              <p className="flex-1 text-[15px] font-medium text-ocean-800">נשמר. נשאר לשלוח ללקוח.</p>
              <Link to={`/admin/requests/${request.id}`} className={buttonClass('ghost', 'lg')}>
                אחר כך
              </Link>
              <a href={sendHref} target="_blank" rel="noreferrer" onClick={() => markSent.mutate(ready.id)} className={buttonClass('whatsapp', 'lg', 'w-full sm:w-auto')}>
                <Send className="size-5" /> שליחה בוואטסאפ
              </a>
            </>
          ) : (
            <>
              {showErrors && missing.length > 0 && <p className="flex-1 text-sm text-coral-700">חסר: {missing.join(', ')}</p>}
              {save.isError && <p className="flex-1 text-sm text-coral-700">השמירה נכשלה. נסו שוב.</p>}
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
          <div className="h-2 w-full" />
        </div>
      </div>
    </div>
  )
}
