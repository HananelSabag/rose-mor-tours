import { createBrowserRouter } from 'react-router'
import { HomePage } from '@/pages/HomePage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { RouteError } from '@/pages/RouteError'
import { AppShell } from './AppShell'

// The home page ships in the main bundle; everything else (the day picker, the whole admin)
// loads on demand.
export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'search', lazy: () => import('@/features/search/SearchPage').then((m) => ({ Component: m.SearchPage })) },
      { path: 'requests/:id', lazy: () => import('@/features/requests/RequestPage').then((m) => ({ Component: m.RequestPage })) },
      { path: 'offers', lazy: () => import('@/features/requests/MyOffersPage').then((m) => ({ Component: m.MyOffersPage })) },
      { path: 'o/:token', lazy: () => import('@/features/offer/OfferPage').then((m) => ({ Component: m.OfferPage })) },
      { path: 'bookings', lazy: () => import('@/features/bookings/MyBookingsPage').then((m) => ({ Component: m.MyBookingsPage })) },
      { path: 'bookings/:id', lazy: () => import('@/features/bookings/BookingPage').then((m) => ({ Component: m.BookingPage })) },
      { path: 'profile', lazy: () => import('@/features/profile/ProfilePage').then((m) => ({ Component: m.ProfilePage })) },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  {
    path: '/admin/login',
    errorElement: <RouteError />,
    lazy: () => import('@/features/admin/AdminLoginPage').then((m) => ({ Component: m.AdminLoginPage })),
  },
  {
    path: '/admin',
    errorElement: <RouteError />,
    lazy: () => import('@/features/admin/AdminLayout').then((m) => ({ Component: m.AdminLayout })),
    children: [
      { index: true, lazy: () => import('@/features/admin/InboxPage').then((m) => ({ Component: m.InboxPage })) },
      { path: 'requests/:id', lazy: () => import('@/features/admin/AdminRequestPage').then((m) => ({ Component: m.AdminRequestPage })) },
      { path: 'requests/:requestId/offer', lazy: () => import('@/features/admin/OfferEditorPage').then((m) => ({ Component: m.OfferEditorPage })) },
      { path: 'offers/:offerId', lazy: () => import('@/features/admin/OfferEditorPage').then((m) => ({ Component: m.OfferEditorPage })) },
      { path: 'bookings', lazy: () => import('@/features/admin/AdminBookingsPage').then((m) => ({ Component: m.AdminBookingsPage })) },
      { path: 'bookings/:id', lazy: () => import('@/features/admin/AdminBookingPage').then((m) => ({ Component: m.AdminBookingPage })) },
      { path: 'team', lazy: () => import('@/features/admin/TeamPage').then((m) => ({ Component: m.TeamPage })) },
    ],
  },
])
