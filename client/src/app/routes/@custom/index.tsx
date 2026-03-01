import { Route } from 'react-router-dom'
import { NestoraDashboardPage } from '../../pages/app/@custom/NestoraDashboardPage'
import { BookingsPage } from '../../pages/app/@custom/BookingsPage'
import { ListingsPage } from '../../pages/app/@custom/ListingsPage'
import { SearchPage } from '../../pages/app/@custom/SearchPage'
import { CalendarPage } from '../../pages/app/@custom/CalendarPage'
import { ReviewsPage } from '../../pages/app/@custom/ReviewsPage'
import { HostDashboardPage } from '../../pages/app/@custom/HostDashboardPage'
import { MessagingPage } from '../../pages/app/@custom/MessagingPage'
import { ExperiencesPage } from '../../pages/app/@custom/ExperiencesPage'

export const customRoutes: React.ReactElement[] = [
  // Main host dashboard — overview of listings, bookings, earnings
  <Route key="nestora-dashboard" path="/app/properties" element={<NestoraDashboardPage />} />,
  <Route key="nestora-host-dashboard" path="/app/host-dashboard" element={<HostDashboardPage />} />,

  // Property listings management
  <Route key="nestora-listings" path="/app/listings" element={<ListingsPage />} />,

  // Search & filter properties (public-facing search)
  <Route key="nestora-search" path="/app/search" element={<SearchPage />} />,

  // Bookings management
  <Route key="nestora-bookings" path="/app/bookings" element={<BookingsPage />} />,

  // Booking calendar — see availability across all properties
  <Route key="nestora-calendar" path="/app/calendar" element={<CalendarPage />} />,

  // Reviews — read and respond to guest reviews
  <Route key="nestora-reviews" path="/app/reviews" element={<ReviewsPage />} />,

  // Messaging — in-app chat between guests and hosts
  <Route key="nestora-messages" path="/app/messages" element={<MessagingPage />} />,

  // Local Experiences — browse and book curated local activities
  <Route key="nestora-experiences" path="/app/experiences" element={<ExperiencesPage />} />,
]
