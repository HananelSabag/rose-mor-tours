import { useSyncExternalStore } from 'react'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

type InstallState = {
  /** Chrome/Edge/Android offered an install prompt we can trigger. */
  canPrompt: boolean
  installed: boolean
  ios: boolean
}

let deferred: BeforeInstallPromptEvent | null = null
const listeners = new Set<() => void>()

function computeState(): InstallState {
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  return { canPrompt: deferred !== null, installed: standalone, ios }
}

let state = computeState()
function update() {
  state = computeState()
  for (const notify of listeners) notify()
}

// Registered at import time (from main.tsx) so the early event is not missed.
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  deferred = e as BeforeInstallPromptEvent
  update()
})
window.addEventListener('appinstalled', () => {
  deferred = null
  update()
})

export async function promptInstall() {
  if (!deferred) return
  await deferred.prompt()
  await deferred.userChoice
  deferred = null
  update()
}

export function useInstallState(): InstallState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => state,
  )
}
