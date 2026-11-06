import { Inbox, Luggage, Search, UserRound, type LucideIcon } from 'lucide-react'

export type NavItem = {
  to: string
  /** Full label for the desktop header */
  label: string
  /** One-word label for the phone tab bar */
  short: string
  icon: LucideIcon
  /** Paths that also light up this tab */
  match: (pathname: string) => boolean
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'חפש חופשה', short: 'חיפוש', icon: Search, match: (p) => p === '/' || p.startsWith('/search') },
  { to: '/offers', label: 'ההצעות שלי', short: 'הצעות', icon: Inbox, match: (p) => p.startsWith('/offers') || p.startsWith('/requests') },
  { to: '/bookings', label: 'ההזמנות שלי', short: 'הזמנות', icon: Luggage, match: (p) => p.startsWith('/bookings') },
  { to: '/profile', label: 'פרופיל', short: 'פרופיל', icon: UserRound, match: (p) => p.startsWith('/profile') },
]
