import { useEffect, useState, useCallback } from 'react'
import {
  Home,
  Calendar,
  DollarSign,
  Star,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertTriangle,
  Loader2,
  ArrowRight,
  Users,
} from 'lucide-react'
import { Header } from '../../../components/@system/Header/Header'
import { PageLayout } from '../../../components/@system/layout/PageLayout'
import { api } from '../../../lib/@system/api'

// ─── Types ────────────────────────────────────────────────────────────────────

interface BookingStats {
  pending_bookings: number
  active_bookings: number
  total_earnings_cents: number
  upcoming_check_ins: number
}

interface RecentBooking {
  id: number
  property_title: string
  guest_name: string
  check_in: string
  check_out: string
  nights: number
  host_payout_cents: number
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
}

interface PropertySummary {
  id: number
  title: string
  address: string
  price_per_night: number
  rating_avg: number | null
  review_count: number
  status: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtCents(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(cents / 100)
}

function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon, accent, sub }: {
  label: string
  value: React.ReactNode
  icon: React.ReactNode
  accent?: string
  sub?: string
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 flex items-start gap-4 shadow-sm">
      <div className={`rounded-lg p-2.5 shrink-0 ${accent ?? 'bg-primary/10 text-primary'}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-sm text-muted-foreground mt-0.5">{label}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </div>
    </div>
  )
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  confirmed: 'bg-blue-50 text-blue-700 border-blue-200',
  completed: 'bg-green-50 text-green-700 border-green-200',
  cancelled: 'bg-gray-100 text-gray-500 border-gray-200',
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function HostDashboardPage() {
  const [stats, setStats] = useState<BookingStats | null>(null)
  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([])
  const [properties, setProperties] = useState<PropertySummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [statsRes, bookRes, propsRes] = await Promise.all([
        api.get<BookingStats>('/bookings/stats'),
        api.get<{ bookings: RecentBooking[] }>('/bookings?limit=5'),
        api.get<{ properties: PropertySummary[] }>('/properties'),
      ])
      setStats(statsRes)
      setRecentBookings(bookRes.bookings.slice(0, 5))
      setProperties(propsRes.properties)
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const listedCount = properties.filter(p => p.status !== 'unlisted').length
  const avgRating = properties.reduce((sum, p) => {
    return p.rating_avg ? sum + Number(p.rating_avg) : sum
  }, 0) / (properties.filter(p => p.rating_avg).length || 1)

  return (
    <PageLayout>
      <Header />
      <main className="container py-8 space-y-8">

        {/* Page header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Home className="h-6 w-6 text-primary" />
            Host Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Overview of your listings, bookings, and earnings.
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Stats grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading dashboard...
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Active Listings"
              value={listedCount}
              icon={<Home className="h-5 w-5" />}
              accent="bg-primary/10 text-primary"
            />
            <StatCard
              label="Pending Bookings"
              value={stats?.pending_bookings ?? 0}
              icon={<Clock className="h-5 w-5" />}
              accent={stats?.pending_bookings ? 'bg-yellow-100 text-yellow-600' : 'bg-muted text-muted-foreground'}
              sub={stats?.pending_bookings ? 'Needs your response' : undefined}
            />
            <StatCard
              label="Upcoming Check-ins"
              value={stats?.upcoming_check_ins ?? 0}
              icon={<Calendar className="h-5 w-5" />}
              accent="bg-blue-100 text-blue-600"
            />
            <StatCard
              label="Total Earnings"
              value={fmtCents(stats?.total_earnings_cents ?? 0)}
              icon={<DollarSign className="h-5 w-5" />}
              accent="bg-green-100 text-green-600"
            />
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent bookings */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Recent Bookings
              </h2>
              <a href="/app/bookings" className="text-sm text-primary flex items-center gap-1 hover:underline">
                View all <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </div>
            <div className="rounded-xl border border-border overflow-hidden">
              {!loading && recentBookings.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Calendar className="h-8 w-8 opacity-30 mb-2" />
                  <p className="text-sm">No bookings yet</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {recentBookings.map(b => (
                    <div key={b.id} className="px-4 py-3 flex items-start justify-between gap-3 hover:bg-muted/20 transition-colors">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{b.guest_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{b.property_title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {fmtDate(b.check_in)} → {fmtDate(b.check_out)} · {b.nights}n
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-mono font-medium text-foreground">{fmtCents(b.host_payout_cents)}</p>
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[b.status] ?? ''}`}>
                          {b.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Property listing summary */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Your Properties
              </h2>
              <a href="/app/listings" className="text-sm text-primary flex items-center gap-1 hover:underline">
                Manage <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </div>
            <div className="rounded-xl border border-border overflow-hidden">
              {!loading && properties.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Home className="h-8 w-8 opacity-30 mb-2" />
                  <p className="text-sm">No properties yet</p>
                  <a href="/app/listings" className="mt-2 text-xs text-primary hover:underline">Add your first listing →</a>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {properties.slice(0, 5).map(p => (
                    <div key={p.id} className="px-4 py-3 flex items-start justify-between gap-3 hover:bg-muted/20 transition-colors">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{p.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{p.address}</p>
                        {p.rating_avg && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            {Number(p.rating_avg).toFixed(1)} · {p.review_count} reviews
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-medium text-foreground">
                          ${Number(p.price_per_night).toFixed(0)}<span className="text-xs text-muted-foreground font-normal">/night</span>
                        </p>
                        <span className={`inline-flex items-center gap-1 text-xs font-medium ${p.status === 'unlisted' ? 'text-muted-foreground' : 'text-green-600'}`}>
                          {p.status === 'unlisted' ? (
                            <><AlertTriangle className="h-3 w-3" /> Unlisted</>
                          ) : (
                            <><CheckCircle className="h-3 w-3" /> Listed</>
                          )}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Quick links */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Add New Listing', icon: <Home className="h-5 w-5" />, href: '/app/listings', desc: 'Create and publish a property' },
              { label: 'View Bookings', icon: <Calendar className="h-5 w-5" />, href: '/app/bookings', desc: 'Manage reservations' },
              { label: 'Messages', icon: <Users className="h-5 w-5" />, href: '/app/messages', desc: 'Chat with guests' },
              { label: 'Reviews', icon: <Star className="h-5 w-5" />, href: '/app/reviews', desc: 'Read guest feedback' },
            ].map(item => (
              <a
                key={item.label}
                href={item.href}
                className="rounded-xl border border-border bg-card p-4 flex items-start gap-3 hover:shadow-md hover:border-primary/30 transition-all group"
              >
                <div className="rounded-lg p-2 bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
                  {item.icon}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                </div>
              </a>
            ))}
          </div>
        </section>

      </main>
    </PageLayout>
  )
}
