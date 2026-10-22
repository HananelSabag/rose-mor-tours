import { createBrowserRouter } from 'react-router'
import { HomePage } from '@/pages/HomePage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { RouteError } from '@/pages/RouteError'
import { AppShell } from './AppShell'

// The home page ships in the main bundle; everything else (the day picker especially) loads on demand.
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
      { path: 'bookings', lazy: () => import('@/features/bookings/MyBookingsPage').then((m) => ({ Component: m.MyBookingsPage })) },
      { path: 'profile', lazy: () => import('@/features/profile/ProfilePage').then((m) => ({ Component: m.ProfilePage })) },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
