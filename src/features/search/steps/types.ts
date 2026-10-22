import type { Draft } from '../draft'

export type StepProps = {
  draft: Draft
  /** Move to the next step (used by single-tap choices that need no "continue"). */
  next: () => void
}
