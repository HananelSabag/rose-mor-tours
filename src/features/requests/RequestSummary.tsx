import { CalendarDays, Hotel, MapPin, MessageSquareText, Star, TreePalm, Users, Utensils, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { formatDateRange, nightsBetween, pluralNights } from '@/lib/format'
import { BOARD_BASIS, ROOM_SETUP, VACATION_STYLE, partySummary, starsLabel } from '@/lib/labels'
import type { QuoteRequest } from '@/lib/types'

function Row({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: ReactNode }) {
  return (
    <div className="flex gap-3 py-3">
      <Icon className="mt-0.5 size-5 shrink-0 text-turquoise-500" />
      <dt className="w-24 shrink-0 text-ink-soft">{label}</dt>
      <dd className="min-w-0 flex-1 font-medium">{children}</dd>
    </div>
  )
}

export function RequestSummary({ request: r }: { request: QuoteRequest }) {
  const flex = r.flexible_days === 1 ? 'גמיש ביום' : r.flexible_days === 2 ? 'גמיש עד יומיים' : null
  return (
    <dl className="divide-y divide-lagoon-200">
      <Row icon={MapPin} label="יעד">{r.destination}</Row>
      <Row icon={Hotel} label="מלון">{r.hotel_name ?? 'תבחרו לי לפי הרמה'}</Row>
      <Row icon={CalendarDays} label="תאריכים">
        {formatDateRange(r.check_in, r.check_out)}
        <span className="block text-sm font-normal text-ink-soft">
          {pluralNights(nightsBetween(r.check_in, r.check_out))}
          {flex && `, ${flex}`}
        </span>
      </Row>
      <Row icon={Users} label="מי טס">
        {partySummary(r.adults, r.children_ages)}
        <span className="block text-sm font-normal text-ink-soft">{ROOM_SETUP[r.room_setup].label}</span>
      </Row>
      <Row icon={Star} label="דירוג">{starsLabel(r.min_stars)}</Row>
      <Row icon={Utensils} label="ארוחות">{r.board_basis ? BOARD_BASIS[r.board_basis].label : 'לא משנה'}</Row>
      {r.vacation_styles.length > 0 && (
        <Row icon={TreePalm} label="אופי">{r.vacation_styles.map((s) => VACATION_STYLE[s]).join(', ')}</Row>
      )}
      {r.notes && (
        <Row icon={MessageSquareText} label="הערות">
          <span className="font-normal whitespace-pre-line">{r.notes}</span>
        </Row>
      )}
    </dl>
  )
}
