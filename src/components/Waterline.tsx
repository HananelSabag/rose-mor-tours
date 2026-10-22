/** Questionnaire progress drawn as a pool edge filling from the start (right) side. */
export function Waterline({ step, total }: { step: number; total: number }) {
  const pct = Math.round((step / total) * 100)
  return (
    <div
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={total}
      aria-valuenow={step}
      aria-label={`שלב ${step} מתוך ${total}`}
      className="relative h-1.5 overflow-hidden rounded-full bg-lagoon-200"
    >
      <div
        className="absolute inset-y-0 start-0 rounded-full bg-linear-to-l from-turquoise-400 to-ocean-700 transition-[width] duration-500 ease-out"
        style={{ width: `${pct}%` }}
      >
        <span className="absolute inset-y-0 end-0 w-1 rounded-full bg-white/90" />
      </div>
    </div>
  )
}
