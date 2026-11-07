import { useSyncExternalStore } from 'react'
import { normalizePhone, toISODate } from '@/lib/format'
import type { BoardBasis, RoomSetup, VacationStyle } from '@/lib/types'

export type Draft = {
  destination: string
  /** Optional: a hotel they already have in mind */
  hotelName: string
  checkIn: string | null
  checkOut: string | null
  flexibleDays: 0 | 1 | 2
  adults: number
  /** null until the parent picks an age */
  childrenAges: (number | null)[]
  roomSetup: RoomSetup
  minStars: number | null
  boardBasis: BoardBasis | null
  vacationStyles: VacationStyle[]
  notes: string
  contactName: string
  contactPhone: string
}

export const STEPS = [
  { id: 'destination', title: 'לאן טסים?' },
  { id: 'dates', title: 'מתי?' },
  { id: 'party', title: 'מי טס?' },
  { id: 'style', title: 'איזה מלון מתאים לכם?' },
  { id: 'contact', title: 'לאן לשלוח את ההצעה?' },
] as const

export type StepId = (typeof STEPS)[number]['id']

export function isStepValid(step: StepId, d: Draft): boolean {
  switch (step) {
    case 'destination':
      return d.destination.trim().length >= 2
    case 'dates':
      return !!d.checkIn && !!d.checkOut && d.checkOut > d.checkIn && d.checkIn >= toISODate(new Date())
    case 'party':
      return d.adults >= 1 && d.childrenAges.every((age) => age !== null)
    case 'style':
      return true
    case 'contact':
      return d.contactName.trim().length >= 2 && normalizePhone(d.contactPhone) !== null
  }
}

// --- persistence -----------------------------------------------------------------------
// localStorage is a convenience here (resume a half-filled form); everything still works
// when it is blocked.

const DRAFT_KEY = 'rm.search-draft.v1'
const CONTACT_KEY = 'rm.contact.v1'

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function write(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage unavailable: keep the in-memory draft only */
  }
}

function emptyDraft(): Draft {
  const contact = read<{ name: string; phone: string }>(CONTACT_KEY)
  return {
    destination: '',
    hotelName: '',
    checkIn: null,
    checkOut: null,
    flexibleDays: 0,
    adults: 2,
    childrenAges: [],
    roomSetup: 'one_room',
    minStars: null,
    boardBasis: null,
    vacationStyles: [],
    notes: '',
    contactName: contact?.name ?? '',
    contactPhone: contact?.phone ?? '',
  }
}

function loadDraft(): Draft {
  const saved = read<Partial<Draft>>(DRAFT_KEY)
  const draft = { ...emptyDraft(), ...saved }
  // Dates saved last month may be in the past by now.
  if (draft.checkIn && draft.checkIn < toISODate(new Date())) {
    draft.checkIn = null
    draft.checkOut = null
  }
  return draft
}

let state: Draft = loadDraft()
const listeners = new Set<() => void>()

function emit() {
  for (const notify of listeners) notify()
}

export function updateDraft(patch: Partial<Draft> | ((d: Draft) => Partial<Draft>)) {
  state = { ...state, ...(typeof patch === 'function' ? patch(state) : patch) }
  write(DRAFT_KEY, state)
  emit()
}

/** After a successful submit: forget the trip, remember who to contact next time. */
export function resetDraftAfterSubmit() {
  write(CONTACT_KEY, { name: state.contactName.trim(), phone: state.contactPhone.trim() })
  write(DRAFT_KEY, null)
  state = emptyDraft()
  emit()
}

export function useDraft(): Draft {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => state,
  )
}
