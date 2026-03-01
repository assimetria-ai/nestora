import { useState, useEffect, useCallback } from 'react'
import {
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  Package,
  DollarSign,
  Search,
  Loader2,
  AlertTriangle,
  ChevronDown,
  Star,
} from 'lucide-react'
import { Header } from '../../../components/@system/Header/Header'
import { PageLayout } from '../../../components/@system/layout/PageLayout'
import { api } from '../../../lib/@system/api'

// ─── Types ────────────────────────────────────────────────────────────────────

type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed'

interface Booking {
  id: number
  property_title: string
  property_address: string
  guest_name: string
  guest_email: string
  check_in: string
  check_out: string
  nights: number
  guests_count: number
  total_cents: number
  host_payout_cents: number
  status: BookingStatus
  guest_notes: string | null
  created_at: string
}

interface BookingStats {
  pending_bookings: number
  active_bookings: number
  total_earnings_cents: number
  upcoming_check_ins: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatPrice(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const STATUS_CONFIG: Record<BookingStatus, { label: string; cls: string; icon: React.ReactNode }> = {
  pending: { label: 'Pending', cls: 'bg-yellow-50 text-yellow-700 border-yellow-200', icon: <Clock className="h-3 w-3" /> },
  confirmed: { label: 'Confirmed', cls: 'bg-blue-50 text-blue-700 border-blue-200', icon: <CheckCircle className="h-3 w-3" /> },
  completed: { label: 'Completed', cls: 'bg-green-50 text-green-700 border-green-200', icon: <Star className="h-3 w-3" /> },
  cancelled: { label: 'Cancelled', cls: 'bg-gray-100 text-gray-500 border-gray-200', icon: <XCircle className="h-3 w-3" /> },
}

function StatusBadge({ status }: { status: BookingStatus }) {
  const c = STATUS_CONFIG[status]
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${c.cls}`}>
      {c.icon}
      {c.label}
    </span>
  )
}

function ActionMenu({ booking, onUpdate }: { booking: Booking; onUpdate: () => void }) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const actions: Partial<Record<BookingStatus, { label: string; next: BookingStatus }[]>> = {
    pending: [{ label: 'Confirm', next: 'confirmed' }, { label: 'Cancel', next: 'cancelled' }],
    confirmed: [{ label: 'Mark Completed', next: 'completed' }, { label: 'Cancel', next: 'cancelled' }],
  }
  const available = actions[booking.status] ?? []
  if (available.length === 0) return <StatusBadge status={booking.status} />

  const handleAction = async (next: BookingStatus) => {
    setSaving(true)
    setOpen(false)
    try {
      await api.patch(`/bookings/${booking.id}`, { status: next })
      onUpdate()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        disabled={saving}
        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium hover:bg-muted/60 transition-colors ${STATUS_CONFIG[booking.status].cls}`}
      >
        {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : STATUS_CONFIG[booking.status].icon}
        {STATUS_CONFIG[booking.status].label}
        <ChevronDown className="h-3 w-3 ml-0.5" />
      </button>
      {open && (
        <div className="absolute top-full mt-1 right-0 z-10 bg-background border border-border rounded-lg shadow-md py-1 min-w-36">
          {available.map(a => (
            <button
              key={a.next}
              onClick={() => handleAction(a.next)}
              className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted transition-colors text-left ${a.next === 'cancelled' ? 'text-destructive' : ''}`}
            >
              {STATUS_CONFIG[a.next].icon}
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [stats, setStats] = useState<BookingStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<string>('all')
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (filter !== 'all') params.set('status', filter)
      const [bookRes, statsRes] = await Promise.all([
        api.get<{ bookings: Booking[] }>(`/bookings?${params}`),
        api.get<BookingStats>('/bookings/stats'),
      ])
      setBookings(bookRes.bookings)
      setStats(statsRes)
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load bookings')
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => { fetchData() }, [fetchData])

  const filtered = search
    ? bookings.filter(b =>
        b.guest_name.toLowerCase().includes(search.toLowerCase()) ||
        b.guest_email.toLowerCase().includes(search.toLowerCase()) ||
        b.property_title.toLowerCase().includes(search.toLowerCase())
      )
    : bookings

  return (
    <PageLayout>
      <Header />

      <main className="container py-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" />
            Bookings
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage guest reservations across all your properties.
          </p>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Pending', value: stats.pending_bookings, icon: <Clock className="h-4 w-4" />, warn: stats.pending_bookings > 0 },
              { label: 'Active Bookings', value: stats.active_bookings, icon: <CheckCircle className="h-4 w-4" /> },
              { label: 'Upcoming Check-ins', value: stats.upcoming_check_ins, icon: <Package className="h-4 w-4" /> },
              { label: 'Total Earnings', value: formatPrice(stats.total_earnings_cents), icon: <DollarSign className="h-4 w-4" /> },
            ].map(stat => (
              <div key={stat.label} className={`rounded-xl border p-5 flex items-start gap-4 shadow-sm ${stat.warn ? 'border-yellow-200 bg-yellow-50' : 'border-border bg-card'}`}>
                <div className={`mt-0.5 flex h-10 w-10 items-center justify-center rounded-lg shrink-0 ${stat.warn ? 'bg-yellow-100 text-yellow-600' : 'bg-primary/10 text-primary'}`}>
                  {stat.icon}
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              className="w-full rounded-md border border-border bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="Search by guest or property..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          {(['all', 'pending', 'confirmed', 'completed', 'cancelled'] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`rounded-md px-3 py-2 text-sm font-medium transition-colors capitalize ${filter === s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
            >
              {s}
            </button>
          ))}
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Table */}
        <div className="rounded-xl border border-border overflow-hidden shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading bookings...
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
              <Calendar className="h-10 w-10 opacity-40" />
              <p className="text-sm font-medium">No bookings found</p>
              <p className="text-xs">Bookings will appear here when guests reserve your properties.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  <th className="px-5 py-3 text-left">Guest</th>
                  <th className="px-5 py-3 text-left hidden sm:table-cell">Property</th>
                  <th className="px-5 py-3 text-left hidden md:table-cell">Dates</th>
                  <th className="px-5 py-3 text-right hidden md:table-cell">Payout</th>
                  <th className="px-5 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(booking => (
                  <tr key={booking.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-4">
                      <p className="font-medium text-foreground">{booking.guest_name}</p>
                      <p className="text-xs text-muted-foreground">{booking.guest_email}</p>
                      {booking.guests_count > 1 && (
                        <p className="text-xs text-muted-foreground">{booking.guests_count} guests</p>
                      )}
                    </td>
                    <td className="px-5 py-4 hidden sm:table-cell">
                      <p className="text-foreground">{booking.property_title}</p>
                      <p className="text-xs text-muted-foreground">{booking.property_address}</p>
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell">
                      <p className="text-foreground">{formatDate(booking.check_in)} → {formatDate(booking.check_out)}</p>
                      <p className="text-xs text-muted-foreground">{booking.nights} night{booking.nights !== 1 ? 's' : ''}</p>
                    </td>
                    <td className="px-5 py-4 text-right font-mono text-foreground hidden md:table-cell">
                      {formatPrice(booking.host_payout_cents)}
                      <p className="text-xs text-muted-foreground">({formatPrice(booking.total_cents)} total)</p>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end">
                        <ActionMenu booking={booking} onUpdate={fetchData} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </PageLayout>
  )
}
