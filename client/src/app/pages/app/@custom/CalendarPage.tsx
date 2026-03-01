import { useEffect, useState, useCallback } from 'react'
import { ChevronLeft, ChevronRight, CalendarDays, Home, Clock, CheckCircle, AlertCircle } from 'lucide-react'
import { Header } from '../../../components/@system/Header/Header'
import { PageLayout } from '../../../components/@system/layout/PageLayout'
import { api } from '../../../lib/@system/api'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Property {
  id: string
  name: string
  address?: string
}

interface BlockedDate {
  check_in: string
  check_out: string
  status: 'pending' | 'confirmed' | string
}

interface Booking {
  id: string
  property_id: string
  guest_name?: string
  guest_email?: string
  check_in: string
  check_out: string
  status: 'pending' | 'confirmed' | 'cancelled' | string
  total_price?: number
  nights?: number
}

interface DayCell {
  date: Date
  inMonth: boolean
  bookingStatus: 'none' | 'pending' | 'confirmed' | 'multi'
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/** Returns YYYY-MM-DD string in local time (avoids UTC offset bugs). */
function toLocalDateStr(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Parse a YYYY-MM-DD string as a local-midnight Date. */
function parseLocalDate(str: string): Date {
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/**
 * Build all DayCell entries for a given month/year.
 * Fills leading/trailing cells with adjacent-month days so the grid is
 * always complete rows of 7.
 */
function buildMonthGrid(year: number, month: number, blockedDates: BlockedDate[]): DayCell[] {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)

  // Build a map: dateStr -> Set of statuses
  const statusMap = new Map<string, Set<string>>()

  for (const b of blockedDates) {
    const start = parseLocalDate(b.check_in)
    const end = parseLocalDate(b.check_out)
    const cursor = new Date(start)
    while (cursor <= end) {
      const key = toLocalDateStr(cursor)
      if (!statusMap.has(key)) statusMap.set(key, new Set())
      statusMap.get(key)!.add(b.status)
      cursor.setDate(cursor.getDate() + 1)
    }
  }

  const cells: DayCell[] = []

  // Leading days from previous month
  const startPad = firstDay.getDay() // 0 = Sun
  for (let i = startPad - 1; i >= 0; i--) {
    const date = new Date(year, month, -i)
    cells.push({ date, inMonth: false, bookingStatus: 'none' })
  }

  // Days in current month
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const date = new Date(year, month, d)
    const key = toLocalDateStr(date)
    const statuses = statusMap.get(key)
    let bookingStatus: DayCell['bookingStatus'] = 'none'
    if (statuses) {
      if (statuses.size > 1) {
        bookingStatus = 'multi'
      } else {
        const s = [...statuses][0]
        bookingStatus = s === 'confirmed' ? 'confirmed' : s === 'pending' ? 'pending' : 'none'
      }
    }
    cells.push({ date, inMonth: true, bookingStatus })
  }

  // Trailing days from next month
  const endPad = 6 - lastDay.getDay()
  for (let i = 1; i <= endPad; i++) {
    const date = new Date(year, month + 1, i)
    cells.push({ date, inMonth: false, bookingStatus: 'none' })
  }

  return cells
}

function isToday(date: Date): boolean {
  const now = new Date()
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  )
}

function formatDisplayDate(str: string): string {
  try {
    const d = parseLocalDate(str)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return str
  }
}

function nightsBetween(checkIn: string, checkOut: string): number {
  try {
    const a = parseLocalDate(checkIn)
    const b = parseLocalDate(checkOut)
    return Math.round((b.getTime() - a.getTime()) / 86400000)
  } catch {
    return 0
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const base = 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium'
  if (status === 'confirmed') {
    return (
      <span className={`${base} bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300`}>
        <CheckCircle className="w-3 h-3" />
        Confirmed
      </span>
    )
  }
  if (status === 'pending') {
    return (
      <span className={`${base} bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300`}>
        <Clock className="w-3 h-3" />
        Pending
      </span>
    )
  }
  if (status === 'cancelled') {
    return (
      <span className={`${base} bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300`}>
        <AlertCircle className="w-3 h-3" />
        Cancelled
      </span>
    )
  }
  return (
    <span className={`${base} bg-muted text-muted-foreground`}>
      {status}
    </span>
  )
}

function DayCellView({ cell }: { cell: DayCell }) {
  const today = isToday(cell.date)

  let bgClass = ''
  if (cell.bookingStatus === 'confirmed') {
    bgClass = cell.inMonth
      ? 'bg-blue-500 text-white'
      : 'bg-blue-200 text-blue-400 dark:bg-blue-900/30 dark:text-blue-600'
  } else if (cell.bookingStatus === 'pending') {
    bgClass = cell.inMonth
      ? 'bg-yellow-400 text-white'
      : 'bg-yellow-100 text-yellow-400 dark:bg-yellow-900/30 dark:text-yellow-600'
  } else if (cell.bookingStatus === 'multi') {
    bgClass = cell.inMonth
      ? 'bg-purple-500 text-white'
      : 'bg-purple-200 text-purple-400 dark:bg-purple-900/30 dark:text-purple-600'
  } else {
    bgClass = cell.inMonth
      ? 'text-foreground hover:bg-muted'
      : 'text-muted-foreground/40'
  }

  return (
    <div
      className={`
        relative flex items-center justify-center h-10 w-full rounded-lg text-sm font-medium
        transition-colors duration-150 cursor-default
        ${bgClass}
        ${today && cell.bookingStatus === 'none' ? 'ring-2 ring-primary ring-offset-1' : ''}
      `}
    >
      {cell.date.getDate()}
      {today && (
        <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
      )}
    </div>
  )
}

function BookingRow({ booking }: { booking: Booking }) {
  const nights = booking.nights ?? nightsBetween(booking.check_in, booking.check_out)
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-4 border-b border-border last:border-0">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-muted flex items-center justify-center">
          <CalendarDays className="w-4 h-4 text-muted-foreground" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">
            {booking.guest_name ?? 'Guest'}
          </p>
          {booking.guest_email && (
            <p className="text-xs text-muted-foreground">{booking.guest_email}</p>
          )}
          <p className="text-xs text-muted-foreground mt-0.5">
            {formatDisplayDate(booking.check_in)} — {formatDisplayDate(booking.check_out)}
            {nights > 0 && (
              <span className="ml-1.5 text-muted-foreground/70">({nights} {nights === 1 ? 'night' : 'nights'})</span>
            )}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3 sm:flex-col sm:items-end">
        <StatusBadge status={booking.status} />
        {booking.total_price != null && (
          <p className="text-sm font-semibold text-foreground">
            ${booking.total_price.toLocaleString()}
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function CalendarPage() {
  const today = new Date()

  // Properties
  const [properties, setProperties] = useState<Property[]>([])
  const [propertiesLoading, setPropertiesLoading] = useState(true)
  const [propertiesError, setPropertiesError] = useState<string | null>(null)

  // Selected property
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('')

  // Month navigation
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth()) // 0-indexed

  // Blocked dates for calendar
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([])
  const [calendarLoading, setCalendarLoading] = useState(false)
  const [calendarError, setCalendarError] = useState<string | null>(null)

  // Upcoming bookings list
  const [bookings, setBookings] = useState<Booking[]>([])
  const [bookingsLoading, setBookingsLoading] = useState(false)
  const [bookingsError, setBookingsError] = useState<string | null>(null)

  // ── Load properties ──────────────────────────────────────────────────────
  useEffect(() => {
    setPropertiesLoading(true)
    setPropertiesError(null)
    api
      .get<Property[]>('/properties')
      .then((data) => {
        const list = Array.isArray(data) ? data : []
        setProperties(list)
        if (list.length > 0 && !selectedPropertyId) {
          setSelectedPropertyId(list[0].id)
        }
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Failed to load properties'
        setPropertiesError(msg)
      })
      .finally(() => setPropertiesLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load calendar blocked dates ──────────────────────────────────────────
  const fetchCalendar = useCallback(() => {
    if (!selectedPropertyId) return
    setCalendarLoading(true)
    setCalendarError(null)
    api
      .get<{ blocked_dates: BlockedDate[] }>(`/bookings/calendar/${selectedPropertyId}`)
      .then((data) => {
        setBlockedDates(Array.isArray(data?.blocked_dates) ? data.blocked_dates : [])
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Failed to load calendar'
        setCalendarError(msg)
        setBlockedDates([])
      })
      .finally(() => setCalendarLoading(false))
  }, [selectedPropertyId])

  // ── Load upcoming bookings ───────────────────────────────────────────────
  const fetchBookings = useCallback(() => {
    if (!selectedPropertyId) return
    setBookingsLoading(true)
    setBookingsError(null)
    api
      .get<Booking[]>(`/bookings?property_id=${selectedPropertyId}`)
      .then((data) => {
        setBookings(Array.isArray(data) ? data : [])
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Failed to load bookings'
        setBookingsError(msg)
        setBookings([])
      })
      .finally(() => setBookingsLoading(false))
  }, [selectedPropertyId])

  useEffect(() => {
    fetchCalendar()
    fetchBookings()
  }, [fetchCalendar, fetchBookings])

  // ── Month navigation ─────────────────────────────────────────────────────
  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear((y) => y - 1)
    } else {
      setViewMonth((m) => m - 1)
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear((y) => y + 1)
    } else {
      setViewMonth((m) => m + 1)
    }
  }

  function goToToday() {
    setViewYear(today.getFullYear())
    setViewMonth(today.getMonth())
  }

  // ── Derived ──────────────────────────────────────────────────────────────
  const cells = buildMonthGrid(viewYear, viewMonth, blockedDates)

  const selectedProperty = properties.find((p) => p.id === selectedPropertyId)

  // Upcoming bookings: filter to those whose check_in >= today, sorted ascending
  const todayStr = toLocalDateStr(today)
  const upcomingBookings = bookings
    .filter((b) => b.check_in >= todayStr && b.status !== 'cancelled')
    .sort((a, b) => a.check_in.localeCompare(b.check_in))

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      <Header />
      <PageLayout>
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

          {/* Page title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <CalendarDays className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Booking Calendar</h1>
              <p className="text-sm text-muted-foreground">Manage availability across your properties</p>
            </div>
          </div>

          {/* Property selector */}
          <div className="rounded-xl border border-border bg-card p-4">
            <label className="block text-sm font-medium text-foreground mb-2">
              <Home className="inline w-4 h-4 mr-1.5 text-muted-foreground" />
              Property
            </label>
            {propertiesLoading ? (
              <div className="h-10 rounded-lg bg-muted animate-pulse w-64" />
            ) : propertiesError ? (
              <p className="text-sm text-red-500 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" />
                {propertiesError}
              </p>
            ) : properties.length === 0 ? (
              <p className="text-sm text-muted-foreground">No properties found.</p>
            ) : (
              <select
                value={selectedPropertyId}
                onChange={(e) => setSelectedPropertyId(e.target.value)}
                className="
                  w-full sm:w-80 px-3 py-2 rounded-lg border border-border bg-background
                  text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary
                  cursor-pointer
                "
              >
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}{p.address ? ` — ${p.address}` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Calendar card */}
          {selectedPropertyId && (
            <div className="rounded-xl border border-border bg-card overflow-hidden">

              {/* Calendar header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <button
                  onClick={prevMonth}
                  className="
                    w-8 h-8 flex items-center justify-center rounded-lg
                    border border-border text-muted-foreground hover:bg-muted
                    transition-colors
                  "
                  aria-label="Previous month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-3">
                  <h2 className="text-base font-semibold text-foreground">
                    {MONTH_NAMES[viewMonth]} {viewYear}
                  </h2>
                  <button
                    onClick={goToToday}
                    className="
                      text-xs px-2.5 py-1 rounded-md border border-border
                      text-muted-foreground hover:bg-muted transition-colors
                    "
                  >
                    Today
                  </button>
                </div>

                <button
                  onClick={nextMonth}
                  className="
                    w-8 h-8 flex items-center justify-center rounded-lg
                    border border-border text-muted-foreground hover:bg-muted
                    transition-colors
                  "
                  aria-label="Next month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Calendar loading / error */}
              {calendarLoading && (
                <div className="flex items-center justify-center py-12">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              )}

              {!calendarLoading && calendarError && (
                <div className="flex items-center gap-2 px-5 py-4 text-sm text-red-500">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {calendarError}
                </div>
              )}

              {!calendarLoading && !calendarError && (
                <>
                  {/* Day-of-week headers */}
                  <div className="grid grid-cols-7 px-3 pt-3 pb-1">
                    {DAY_NAMES.map((d) => (
                      <div
                        key={d}
                        className="text-center text-xs font-semibold text-muted-foreground py-1"
                      >
                        {d}
                      </div>
                    ))}
                  </div>

                  {/* Day cells grid */}
                  <div className="grid grid-cols-7 gap-1 px-3 pb-4">
                    {cells.map((cell, idx) => (
                      <DayCellView key={idx} cell={cell} />
                    ))}
                  </div>
                </>
              )}

              {/* Legend */}
              {!calendarLoading && !calendarError && (
                <div className="flex flex-wrap items-center gap-4 px-5 py-3 border-t border-border bg-muted/30">
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="w-3 h-3 rounded-sm bg-blue-500" />
                    Confirmed
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="w-3 h-3 rounded-sm bg-yellow-400" />
                    Pending
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="w-3 h-3 rounded-sm bg-purple-500" />
                    Mixed
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="w-3 h-3 rounded-sm ring-2 ring-primary bg-transparent" />
                    Today
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Upcoming bookings */}
          {selectedPropertyId && (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-foreground">Upcoming Bookings</h3>
                  {selectedProperty && (
                    <p className="text-xs text-muted-foreground mt-0.5">{selectedProperty.name}</p>
                  )}
                </div>
                {!bookingsLoading && !bookingsError && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                    {upcomingBookings.length} upcoming
                  </span>
                )}
              </div>

              <div className="px-5">
                {bookingsLoading && (
                  <div className="flex items-center justify-center py-10">
                    <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                )}

                {!bookingsLoading && bookingsError && (
                  <div className="flex items-center gap-2 py-6 text-sm text-red-500">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {bookingsError}
                  </div>
                )}

                {!bookingsLoading && !bookingsError && upcomingBookings.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <CalendarDays className="w-10 h-10 text-muted-foreground/40 mb-3" />
                    <p className="text-sm font-medium text-muted-foreground">No upcoming bookings</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      Future bookings for this property will appear here.
                    </p>
                  </div>
                )}

                {!bookingsLoading && !bookingsError && upcomingBookings.length > 0 && (
                  <div>
                    {upcomingBookings.map((booking) => (
                      <BookingRow key={booking.id} booking={booking} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* No property selected */}
          {!selectedPropertyId && !propertiesLoading && (
            <div className="rounded-xl border border-border bg-card flex flex-col items-center justify-center py-16 text-center px-4">
              <Home className="w-12 h-12 text-muted-foreground/30 mb-4" />
              <p className="text-sm font-medium text-muted-foreground">Select a property to view its calendar</p>
            </div>
          )}

        </div>
      </PageLayout>
    </>
  )
}
