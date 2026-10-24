import { Share, Smartphone } from 'lucide-react'
import { promptInstall, useInstallState } from '@/lib/install'
import { buttonClass } from './ui/button'

/**
 * Shown right after a request is sent, when the customer has a reason to come back.
 * Android/desktop Chrome get the native prompt; iOS gets the two-tap Safari path.
 */
export function InstallHint() {
  const { canPrompt, installed, ios } = useInstallState()
  if (installed || (!canPrompt && !ios)) return null

  return (
    <section className="mt-6 flex items-start gap-4 rounded-sheet bg-white p-5 shadow-lift">
      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-lagoon-100 text-ocean-700">
        <Smartphone className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="font-semibold">שמרו את האפליקציה במסך הבית</h2>
        <p className="mt-1 text-sm text-ink-soft">כשההצעה תגיע, היא תחכה לכם כאן, במרחק לחיצה אחת.</p>
        {canPrompt ? (
          <button type="button" onClick={() => void promptInstall()} className={buttonClass('secondary', 'md', 'mt-3')}>
            הוספה למסך הבית
          </button>
        ) : (
          <p className="mt-2 flex flex-wrap items-center gap-1.5 text-sm text-ocean-900">
            בספארי לוחצים על <Share className="inline size-4" aria-label="שיתוף" /> ובוחרים ״הוספה למסך הבית״.
          </p>
        )}
      </div>
    </section>
  )
}
