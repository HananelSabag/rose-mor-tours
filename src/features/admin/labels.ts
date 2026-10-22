import type { RequestStatus } from '@/lib/types'

/** Staff wording (the customer sees friendlier labels from lib/labels). */
export const ADMIN_REQUEST_STATUS: Record<RequestStatus, string> = {
  new: 'חדשה',
  in_progress: 'בטיפול',
  offered: 'נשלחה הצעה',
  closed: 'נסגרה',
  cancelled: 'בוטלה',
}
