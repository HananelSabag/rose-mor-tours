import { useSyncExternalStore } from 'react'

const rtf = new Intl.RelativeTimeFormat('he', { numeric: 'auto', style: 'short' })

export function timeAgo(iso: string, now = Date.now()): string {
  const seconds = Math.round((new Date(iso).getTime() - now) / 1000)
  const abs = Math.abs(seconds)
  if (abs < 60) return 'עכשיו'
  if (abs < 3600) return rtf.format(Math.round(seconds / 60), 'minute')
  if (abs < 86_400) return rtf.format(Math.round(seconds / 3600), 'hour')
  return rtf.format(Math.round(seconds / 86_400), 'day')
}

/** "23:41:05" style remaining time; null once expired. */
export function remaining(iso: string | null, now: number): string | null {
  if (!iso) return null
  const ms = new Date(iso).getTime() - now
  if (ms <= 0) return null
  const s = Math.floor(ms / 1000)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`
}

const clock = new Intl.DateTimeFormat('he-IL', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
const weekday = new Intl.DateTimeFormat('he-IL', { weekday: 'long', day: 'numeric', month: 'numeric' })
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()

/** An absolute deadline people can plan around: "היום ב־18:30", "מחר ב־09:00", "יום שני, 10.11 ב־12:00". */
export function formatDeadline(iso: string, now = Date.now()): string {
  const d = new Date(iso)
  const days = Math.round((startOfDay(d) - startOfDay(new Date(now))) / 86_400_000)
  const time = clock.format(d)
  if (days === 0) return `היום ב־${time}`
  if (days === 1) return `מחר ב־${time}`
  return `${weekday.format(d)} ב־${time}`
}

// One shared clock for every countdown on the page.
let now = Date.now()
const listeners = new Set<() => void>()
let timer: ReturnType<typeof setInterval> | null = null

function subscribe(listener: () => void) {
  listeners.add(listener)
  if (!timer) {
    now = Date.now()
    timer = setInterval(() => {
      now = Date.now()
      for (const l of listeners) l()
    }, 1000)
  }
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0 && timer) {
      clearInterval(timer)
      timer = null
    }
  }
}

export function useNow(): number {
  return useSyncExternalStore(subscribe, () => now)
}
