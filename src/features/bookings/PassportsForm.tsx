import { useMutation, useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import { Camera, CircleCheck, LoaderCircle, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { buttonClass } from '@/components/ui/button'
import { normalizePhone, formatPhone } from '@/lib/format'
import { PASSPORT_IMAGE, compressImage } from '@/lib/images'
import { fileExtension } from '@/lib/storage'
import { supabase } from '@/lib/supabase'
import { travelerLabels, type BookingDetails } from './queries'

const field =
  'h-14 w-full rounded-field bg-white px-4 text-lg ring-1 ring-lagoon-200 outline-none placeholder:text-ink-faint focus:ring-2 focus:ring-ocean-700'

function TravelerUpload({ booking, traveler, label }: { booking: BookingDetails; traveler: BookingDetails['travelers'][number]; label: string }) {
  const queryClient = useQueryClient()
  const upload = useMutation({
    mutationFn: async (file: File) => {
      if (file.size > 10 * 1024 * 1024 && !file.type.startsWith('image/')) throw new Error('too big')
      const body = await compressImage(file, PASSPORT_IMAGE)
      const path = `${booking.id}/${traveler.id}.${fileExtension(body, 'jpg')}`
      const { error } = await supabase.storage.from('passports').upload(path, body, {
        upsert: true,
        contentType: body.type || file.type,
      })
      if (error) throw error
      if (traveler.passport_path && traveler.passport_path !== path) {
        await supabase.storage.from('passports').remove([traveler.passport_path])
      }
      const { error: rowError } = await supabase.from('travelers').update({ passport_path: path }).eq('id', traveler.id)
      if (rowError) throw rowError
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['booking', booking.id] }),
  })

  const done = !!traveler.passport_path
  const inputId = `passport-${traveler.id}`

  return (
    <li
      className={clsx(
        'flex items-center gap-4 rounded-field p-4 ring-1 transition',
        done ? 'bg-lagoon-100 ring-turquoise-400' : 'bg-white ring-lagoon-200',
      )}
    >
      <span className={clsx('grid size-11 shrink-0 place-items-center rounded-full', done ? 'bg-turquoise-500 text-white' : 'bg-lagoon-100 text-ocean-700')}>
        {upload.isPending ? <LoaderCircle className="size-5 animate-spin" /> : done ? <CircleCheck className="size-6" /> : <Camera className="size-5" />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="font-semibold">{label}</div>
        <div className={clsx('text-sm', upload.isError ? 'text-coral-700' : 'text-ink-soft')}>
          {upload.isPending
            ? 'מעלים...'
            : upload.isError
              ? 'ההעלאה נכשלה. נסו שוב.'
              : done
                ? 'הצילום נקלט'
                : 'צלמו את עמוד התמונה בדרכון'}
        </div>
      </div>
      {/* No `capture` attribute: phones then offer both the camera and the gallery. */}
      <input
        id={inputId}
        type="file"
        accept="image/*,application/pdf"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) upload.mutate(file)
          e.target.value = ''
        }}
      />
      <label htmlFor={inputId} className={buttonClass(done ? 'ghost' : 'secondary', 'md', 'cursor-pointer px-4')}>
        {done ? <RotateCcw className="size-4" /> : null}
        {done ? 'החלפה' : 'העלאה'}
      </label>
    </li>
  )
}

export function PassportsForm({ booking }: { booking: BookingDetails }) {
  const queryClient = useQueryClient()
  const [email, setEmail] = useState(booking.contact_email ?? '')
  const [phone, setPhone] = useState(booking.contact_phone ? formatPhone(booking.contact_phone) : '')
  const labels = travelerLabels(booking.travelers)
  const missing = booking.travelers.filter((t) => !t.passport_path).length
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())
  const phoneNormalized = normalizePhone(phone)

  const submit = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('bookings')
        .update({ contact_email: email.trim(), contact_phone: phoneNormalized })
        .eq('id', booking.id)
      if (error) throw error
      const { error: rpcError } = await supabase.rpc('submit_booking_details', { p_booking_id: booking.id })
      if (rpcError) throw rpcError
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['booking', booking.id] }),
  })

  return (
    <form
      className="space-y-8"
      onSubmit={(e) => {
        e.preventDefault()
        if (!missing && emailValid && phoneNormalized) submit.mutate()
      }}
    >
      <section>
        <h2 className="text-xl font-bold">צילום דרכון לכל נוסע</h2>
        <p className="mt-1 mb-4 text-ink-soft">המלון מקבל את השמות בדיוק כמו בדרכון. הצילומים נשמרים באחסון פרטי שרק הצוות רואה, ונמחקים אוטומטית 30 יום אחרי שתחזרו.</p>
        <ul className="space-y-3">
          {booking.travelers.map((t, i) => (
            <TravelerUpload key={t.id} booking={booking} traveler={t} label={labels[i]!} />
          ))}
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">לאן לשלוח את הקבלה והוואוצ׳ר</h2>
        <label className="block">
          <span className="mb-2 block font-medium">מייל</span>
          <input type="email" inputMode="email" autoComplete="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} className={`${field} text-end`} placeholder="name@example.com" />
        </label>
        <label className="block">
          <span className="mb-2 block font-medium">טלפון נייד</span>
          <input type="tel" inputMode="tel" autoComplete="tel" dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} className={`${field} text-end`} />
        </label>
      </section>

      {submit.isError && (
        <p role="alert" className="rounded-field bg-coral-500/10 px-4 py-3 text-coral-700">
          לא הצלחנו לשלוח. בדקו שכל הדרכונים הועלו ונסו שוב.
        </p>
      )}
      <div>
        <button type="submit" disabled={missing > 0 || !emailValid || !phoneNormalized || submit.isPending} className={buttonClass('primary', 'lg', 'w-full')}>
          {submit.isPending && <LoaderCircle className="size-5 animate-spin" />}
          המשך לתשלום
        </button>
        {missing > 0 && (
          <p className="mt-2 text-center text-sm text-ink-soft">
            {missing === 1 ? 'חסר עוד דרכון אחד' : `חסרים עוד ${missing} דרכונים`}
          </p>
        )}
      </div>
    </form>
  )
}
