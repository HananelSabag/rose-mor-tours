import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, LoaderCircle, X } from 'lucide-react'
import { useEffect, type ComponentType } from 'react'
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router'
import { Waterline } from '@/components/Waterline'
import { buttonClass } from '@/components/ui/button'
import { STEPS, isStepValid, resetDraftAfterSubmit, useDraft, type StepId } from './draft'
import { ContactStep } from './steps/ContactStep'
import { DatesStep } from './steps/DatesStep'
import { DestinationStep } from './steps/DestinationStep'
import { HotelStep } from './steps/HotelStep'
import { PartyStep } from './steps/PartyStep'
import { StyleStep } from './steps/StyleStep'
import type { StepProps } from './steps/types'
import { SubmitError, submitRequest } from './submitRequest'

const STEP_COMPONENTS: Record<StepId, ComponentType<StepProps>> = {
  destination: DestinationStep,
  hotel: HotelStep,
  dates: DatesStep,
  party: PartyStep,
  style: StyleStep,
  contact: ContactStep,
}

export function SearchPage() {
  const draft = useDraft()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [params, setParams] = useSearchParams()
  const location = useLocation()

  const requested = STEPS.findIndex((s) => s.id === params.get('step'))
  const index = requested === -1 ? 0 : requested
  const step = STEPS[index]!
  const isLast = index === STEPS.length - 1
  // Never show a step whose earlier steps are incomplete (deep link, stale draft, back after submit).
  const firstInvalid = STEPS.slice(0, index).findIndex((s) => !isStepValid(s.id, draft))

  const submit = useMutation({
    mutationFn: submitRequest,
    onSuccess: (id) => {
      void queryClient.invalidateQueries({ queryKey: ['requests'] })
      void navigate(`/requests/${id}`, { replace: true, state: { justSent: true } })
    },
  })

  // Clear the draft only when this page unmounts. Navigation commits in a transition, so
  // clearing it any earlier re-renders this page first and trips the redirect below.
  const submitted = submit.isSuccess
  useEffect(() => {
    if (!submitted) return
    return () => resetDraftAfterSubmit()
  }, [submitted])

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [index])

  if (firstInvalid !== -1) {
    return <Navigate to={`/search?step=${STEPS[firstInvalid]!.id}`} replace />
  }

  // Forward pushes history (so the phone's back button walks the steps); our own back button
  // pops that entry when it is the previous step, and otherwise replaces in place.
  const goTo = (i: number) => setParams({ step: STEPS[i]!.id }, { state: { fromStep: index } })
  const back = () => {
    if ((location.state as { fromStep?: number } | null)?.fromStep === index - 1) navigate(-1)
    else setParams({ step: STEPS[index - 1]!.id }, { replace: true })
  }
  const next = () => {
    if (isLast) submit.mutate(draft)
    else goTo(index + 1)
  }
  const valid = isStepValid(step.id, draft)
  const Step = STEP_COMPONENTS[step.id]

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 bg-lagoon-50/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-2xl items-center gap-3 px-4">
          {index > 0 ? (
            <button type="button" onClick={back} className="grid size-11 place-items-center rounded-full text-ocean-800 hover:bg-lagoon-100" aria-label="לשלב הקודם">
              <ArrowRight className="size-6" />
            </button>
          ) : (
            <span className="size-11" />
          )}
          <div className="flex-1">
            <div className="mb-1.5 text-center text-sm font-medium text-ink-soft">
              שלב {index + 1} מתוך {STEPS.length}
            </div>
            <Waterline step={index + 1} total={STEPS.length} />
          </div>
          <Link to="/" className="grid size-11 place-items-center rounded-full text-ocean-800 hover:bg-lagoon-100" aria-label="יציאה מהשאלון">
            <X className="size-6" />
          </Link>
        </div>
      </header>

      <form
        className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 pt-4"
        onSubmit={(e) => {
          e.preventDefault()
          if (valid && !submit.isPending) next()
        }}
      >
        <div key={step.id} className="animate-rise flex-1">
          <h1 className="mb-6 text-[2rem] leading-tight font-bold text-ocean-950 md:text-4xl">{step.title}</h1>
          <Step draft={draft} next={next} />
        </div>

        <div className="sticky bottom-0 -mx-4 mt-8 bg-linear-to-t from-lagoon-50 from-70% to-transparent px-4 pt-6 safe-bottom">
          {submit.error && (
            <p role="alert" className="mb-3 rounded-field bg-coral-500/10 px-4 py-3 text-coral-600">
              {submit.error instanceof SubmitError ? submit.error.message : 'משהו השתבש. נסו שוב.'}
            </p>
          )}
          <button type="submit" disabled={!valid || submit.isPending} className={buttonClass('primary', 'lg', 'w-full')}>
            {submit.isPending && <LoaderCircle className="size-5 animate-spin" />}
            {isLast ? (submit.isPending ? 'שולחים...' : 'שליחת הבקשה') : 'המשך'}
          </button>
          <div className="h-3" />
        </div>
      </form>
    </div>
  )
}
