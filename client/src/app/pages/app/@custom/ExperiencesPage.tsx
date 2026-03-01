import { useState, useEffect, useCallback } from 'react'
import {
  Compass,
  MapPin,
  Clock,
  Users,
  DollarSign,
  Search,
  Loader2,
  AlertTriangle,
  Star,
  ChevronDown,
  Calendar,
} from 'lucide-react'
import { Header } from '../../../components/@system/Header/Header'
import { PageLayout } from '../../../components/@system/layout/PageLayout'
import { api } from '../../../lib/@system/api'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Experience {
  id: number
  host_id: number
  host_name: string
  title: string
  description: string | null
  category: string
  city: string | null
  address: string | null
  duration_hours: number
  max_participants: number
  price_per_person: number
  images: string | string[]
  included: string | string[]
  requirements: string | null
  languages: string | string[]
  rating_avg: number | null
  rating_count: number
  is_active: boolean
  created_at: string
}

interface BookingModalState {
  experience: Experience
  date: string
  participants: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseJSON<T>(val: string | T): T {
  if (typeof val === 'string') {
    try { return JSON.parse(val) as T } catch { return [] as unknown as T }
  }
  return val
}

function fmtPrice(price: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(price)
}

const CATEGORIES = [
  { value: '', label: 'All' },
  { value: 'tour', label: 'Tours' },
  { value: 'cooking', label: 'Cooking' },
  { value: 'outdoor', label: 'Outdoor' },
  { value: 'culture', label: 'Culture' },
  { value: 'art', label: 'Art' },
  { value: 'wellness', label: 'Wellness' },
  { value: 'sports', label: 'Sports' },
]

const CATEGORY_COLORS: Record<string, string> = {
  tour: 'bg-blue-50 text-blue-700',
  cooking: 'bg-orange-50 text-orange-700',
  outdoor: 'bg-green-50 text-green-700',
  culture: 'bg-purple-50 text-purple-700',
  art: 'bg-pink-50 text-pink-700',
  wellness: 'bg-teal-50 text-teal-700',
  sports: 'bg-red-50 text-red-700',
}

// ─── Experience Card ──────────────────────────────────────────────────────────

function ExperienceCard({
  exp,
  onBook,
}: {
  exp: Experience
  onBook: (exp: Experience) => void
}) {
  const images = parseJSON<string[]>(exp.images)
  const included = parseJSON<string[]>(exp.included)
  const coverImg = images[0] ?? null

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden hover:shadow-md transition-shadow">
      {/* Image */}
      <div className="h-48 bg-muted relative overflow-hidden">
        {coverImg ? (
          <img src={coverImg} alt={exp.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Compass className="h-12 w-12 text-muted-foreground opacity-30" />
          </div>
        )}
        <span
          className={`absolute top-3 left-3 text-xs font-medium px-2 py-1 rounded-full capitalize ${
            CATEGORY_COLORS[exp.category] ?? 'bg-gray-100 text-gray-600'
          }`}
        >
          {exp.category}
        </span>
        {exp.rating_avg && (
          <span className="absolute top-3 right-3 flex items-center gap-1 text-xs font-medium bg-white/90 rounded-full px-2 py-1 text-yellow-700">
            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
            {Number(exp.rating_avg).toFixed(1)}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-foreground text-base leading-tight mb-1">{exp.title}</h3>

        {exp.city && (
          <p className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
            <MapPin className="h-3 w-3 shrink-0" />
            {exp.city}
          </p>
        )}

        {exp.description && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{exp.description}</p>
        )}

        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-3">
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {exp.duration_hours}h
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            Up to {exp.max_participants}
          </span>
          <span className="flex items-center gap-1 font-medium text-foreground">
            <DollarSign className="h-3.5 w-3.5" />
            {fmtPrice(exp.price_per_person)} / person
          </span>
        </div>

        {included.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {included.slice(0, 3).map((item, i) => (
              <span key={i} className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                {item}
              </span>
            ))}
            {included.length > 3 && (
              <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                +{included.length - 3} more
              </span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-border">
          <p className="text-xs text-muted-foreground">by {exp.host_name}</p>
          <button
            onClick={() => onBook(exp)}
            className="text-sm font-medium text-primary hover:underline flex items-center gap-1"
          >
            <Calendar className="h-3.5 w-3.5" />
            Book now
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Booking Modal ────────────────────────────────────────────────────────────

function BookingModal({
  state,
  onClose,
  onConfirm,
  booking,
}: {
  state: BookingModalState
  onClose: () => void
  onConfirm: (date: string, participants: number) => Promise<void>
  booking: boolean
}) {
  const [date, setDate] = useState(state.date)
  const [participants, setParticipants] = useState(state.participants)

  const total = state.experience.price_per_person * participants

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-card rounded-2xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold text-foreground mb-1">{state.experience.title}</h2>
        <p className="text-sm text-muted-foreground mb-5 flex items-center gap-1">
          <MapPin className="h-3.5 w-3.5" />
          {state.experience.city ?? 'Location TBD'}
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Date</label>
            <input
              type="date"
              value={date}
              min={new Date().toISOString().split('T')[0]}
              onChange={e => setDate(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Participants (max {state.experience.max_participants})
            </label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setParticipants(p => Math.max(1, p - 1))}
                className="w-9 h-9 rounded-lg border border-input flex items-center justify-center text-lg hover:bg-muted transition-colors"
              >
                −
              </button>
              <span className="w-12 text-center font-medium text-foreground">{participants}</span>
              <button
                onClick={() => setParticipants(p => Math.min(state.experience.max_participants, p + 1))}
                className="w-9 h-9 rounded-lg border border-input flex items-center justify-center text-lg hover:bg-muted transition-colors"
              >
                +
              </button>
            </div>
          </div>

          <div className="rounded-lg bg-muted/50 px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total</span>
            <span className="font-bold text-foreground text-lg">{fmtPrice(total)}</span>
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(date, participants)}
            disabled={!date || booking}
            className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {booking && <Loader2 className="h-4 w-4 animate-spin" />}
            Confirm Booking
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function ExperiencesPage() {
  const [experiences, setExperiences] = useState<Experience[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [cityFilter, setCityFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [bookingModal, setBookingModal] = useState<BookingModalState | null>(null)
  const [booking, setBooking] = useState(false)

  const fetchExperiences = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (cityFilter) params.set('city', cityFilter)
      if (categoryFilter) params.set('category', categoryFilter)
      params.set('limit', '50')
      const res = await api.get<{ experiences: Experience[]; total: number }>(
        `/experiences?${params.toString()}`
      )
      setExperiences(res.experiences)
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load experiences')
    } finally {
      setLoading(false)
    }
  }, [cityFilter, categoryFilter])

  useEffect(() => {
    fetchExperiences()
  }, [fetchExperiences])

  const handleBook = (exp: Experience) => {
    setBookingModal({
      experience: exp,
      date: '',
      participants: 1,
    })
  }

  const handleConfirmBooking = async (date: string, participants: number) => {
    if (!bookingModal) return
    setBooking(true)
    try {
      await api.post(`/experiences/${bookingModal.experience.id}/book`, { date, participants })
      setBookingModal(null)
      setSuccess(`Booking confirmed for ${bookingModal.experience.title}!`)
      setTimeout(() => setSuccess(null), 5000)
    } catch (err: any) {
      setError(err?.message ?? 'Failed to book experience')
    } finally {
      setBooking(false)
    }
  }

  const filteredExp = experiences.filter(e =>
    !searchInput ||
    e.title.toLowerCase().includes(searchInput.toLowerCase()) ||
    (e.description ?? '').toLowerCase().includes(searchInput.toLowerCase()) ||
    (e.city ?? '').toLowerCase().includes(searchInput.toLowerCase())
  )

  return (
    <PageLayout>
      <Header />
      <main className="container py-8 space-y-6">
        {/* Page header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Compass className="h-6 w-6 text-primary" />
            Local Experiences
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Discover and book unique local experiences curated by our hosts.
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {error}
            <button onClick={() => setError(null)} className="ml-auto text-destructive/60 hover:text-destructive">×</button>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
            ✓ {success}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Search experiences..."
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* City filter */}
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={cityFilter}
              onChange={e => setCityFilter(e.target.value)}
              placeholder="City"
              className="pl-9 pr-4 py-2 w-36 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Category filter */}
          <div className="relative">
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading experiences...
          </div>
        ) : filteredExp.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Compass className="h-12 w-12 opacity-20 mb-3" />
            <p className="text-sm font-medium">No experiences found</p>
            <p className="text-xs mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              {filteredExp.length} experience{filteredExp.length !== 1 ? 's' : ''} found
            </p>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredExp.map(exp => (
                <ExperienceCard key={exp.id} exp={exp} onBook={handleBook} />
              ))}
            </div>
          </>
        )}
      </main>

      {bookingModal && (
        <BookingModal
          state={bookingModal}
          onClose={() => setBookingModal(null)}
          onConfirm={handleConfirmBooking}
          booking={booking}
        />
      )}
    </PageLayout>
  )
}
