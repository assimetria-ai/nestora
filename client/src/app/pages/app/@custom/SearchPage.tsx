import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  Search,
  MapPin,
  BedDouble,
  Bath,
  Users,
  Star,
  SlidersHorizontal,
  Loader2,
  AlertTriangle,
  Home,
  X,
  Calendar,
} from 'lucide-react'
import { Header } from '../../../components/@system/Header/Header'
import { PageLayout } from '../../../components/@system/layout/PageLayout'
import { api } from '../../../lib/@system/api'

// ─── Types ────────────────────────────────────────────────────────────────────

interface PropertyResult {
  id: number
  title: string
  city: string | null
  country: string
  address: string
  bedrooms: number
  bathrooms: number
  max_guests: number
  price_per_night: number
  rating_avg: number | null
  review_count: number
  images: string[]
  status: string
}

interface SearchResponse {
  results: PropertyResult[]
  total: number
  page: number
  per_page: number
}

interface Filters {
  q: string
  city: string
  min_price: string
  max_price: string
  bedrooms: string
  guests: string
  check_in: string
  check_out: string
}

const BEDROOMS_OPTIONS = [
  { label: 'Any', value: '' },
  { label: '1+', value: '1' },
  { label: '2+', value: '2' },
  { label: '3+', value: '3' },
  { label: '4+', value: '4' },
]

const EMPTY_FILTERS: Filters = {
  q: '',
  city: '',
  min_price: '',
  max_price: '',
  bedrooms: '',
  guests: '',
  check_in: '',
  check_out: '',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildQueryString(filters: Filters): string {
  const params = new URLSearchParams()
  if (filters.q)          params.set('q', filters.q)
  if (filters.city)       params.set('city', filters.city)
  if (filters.min_price)  params.set('min_price', filters.min_price)
  if (filters.max_price)  params.set('max_price', filters.max_price)
  if (filters.bedrooms)   params.set('bedrooms', filters.bedrooms)
  if (filters.guests)     params.set('guests', filters.guests)
  if (filters.check_in)   params.set('check_in', filters.check_in)
  if (filters.check_out)  params.set('check_out', filters.check_out)
  return params.toString()
}

function formatPrice(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

function getFirstImage(images: string[]): string | null {
  if (!images || images.length === 0) return null
  const first = images[0]
  if (first.startsWith('http')) return first
  return null
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PropertyCard({ property }: { property: PropertyResult }) {
  const image = getFirstImage(property.images)
  const rating = property.rating_avg ? Number(property.rating_avg).toFixed(1) : null
  const location = [property.city, property.country].filter(Boolean).join(', ')

  return (
    <div className="group rounded-xl border border-border bg-card overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col">
      {/* Image */}
      <div className="relative h-48 bg-muted overflow-hidden">
        {image ? (
          <img
            src={image}
            alt={property.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <Home className="w-10 h-10 opacity-30" />
            <span className="text-xs opacity-50">No photo</span>
          </div>
        )}
        {/* Rating badge */}
        {rating && (
          <div className="absolute top-3 right-3 flex items-center gap-1 bg-background/90 backdrop-blur-sm rounded-full px-2 py-0.5 text-xs font-semibold shadow">
            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
            <span>{rating}</span>
            {property.review_count > 0 && (
              <span className="text-muted-foreground font-normal">({property.review_count})</span>
            )}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-4 flex flex-col gap-2 flex-1">
        <h3 className="font-semibold text-foreground text-sm leading-snug line-clamp-2">
          {property.title}
        </h3>

        {location && (
          <div className="flex items-center gap-1 text-muted-foreground text-xs">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">{location}</span>
          </div>
        )}

        {/* Stats row */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-auto pt-2 border-t border-border">
          <span className="flex items-center gap-1">
            <BedDouble className="w-3.5 h-3.5" />
            {property.bedrooms} {property.bedrooms === 1 ? 'bed' : 'beds'}
          </span>
          <span className="flex items-center gap-1">
            <Bath className="w-3.5 h-3.5" />
            {property.bathrooms} {property.bathrooms === 1 ? 'bath' : 'baths'}
          </span>
          <span className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />
            {property.max_guests} guests
          </span>
        </div>

        {/* Price + CTA */}
        <div className="flex items-center justify-between mt-1">
          <div>
            <span className="text-base font-bold text-foreground">
              {formatPrice(property.price_per_night)}
            </span>
            <span className="text-xs text-muted-foreground"> / night</span>
          </div>
          <Link
            to="/app/listings"
            className="text-xs font-medium bg-primary text-primary-foreground rounded-lg px-3 py-1.5 hover:opacity-90 transition-opacity"
          >
            View
          </Link>
        </div>
      </div>
    </div>
  )
}

function LoadingGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border bg-card overflow-hidden animate-pulse">
          <div className="h-48 bg-muted" />
          <div className="p-4 flex flex-col gap-3">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-3 bg-muted rounded w-1/2" />
            <div className="h-3 bg-muted rounded w-full mt-2" />
            <div className="h-8 bg-muted rounded mt-2" />
          </div>
        </div>
      ))}
    </div>
  )
}

function EmptyState({ query }: { query: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
        <Home className="w-8 h-8 text-muted-foreground opacity-50" />
      </div>
      <div>
        <p className="font-semibold text-foreground">No properties found</p>
        <p className="text-sm text-muted-foreground mt-1">
          {query
            ? `No results for "${query}". Try adjusting your filters.`
            : 'Try searching by location, price range, or number of bedrooms.'}
        </p>
      </div>
    </div>
  )
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
      <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
        <AlertTriangle className="w-8 h-8 text-destructive" />
      </div>
      <div>
        <p className="font-semibold text-foreground">Something went wrong</p>
        <p className="text-sm text-muted-foreground mt-1">{message}</p>
      </div>
      <button
        onClick={onRetry}
        className="text-sm font-medium bg-primary text-primary-foreground rounded-lg px-4 py-2 hover:opacity-90 transition-opacity"
      >
        Try again
      </button>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function SearchPage() {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [committedFilters, setCommittedFilters] = useState<Filters>(EMPTY_FILTERS)
  const [results, setResults] = useState<PropertyResult[]>([])
  const [total, setTotal] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchResults = useCallback(async (f: Filters) => {
    setLoading(true)
    setError(null)
    setHasSearched(true)
    try {
      const qs = buildQueryString(f)
      const res = await api.get<SearchResponse>(`/search/properties${qs ? `?${qs}` : ''}`)
      const data = res.data
      setResults(data.results ?? [])
      setTotal(data.total ?? data.results?.length ?? 0)
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? ((err as { response?: { data?: { error?: string } } }).response?.data?.error ?? 'Failed to fetch properties.')
          : 'Failed to fetch properties.'
      setError(msg)
      setResults([])
      setTotal(null)
    } finally {
      setLoading(false)
    }
  }, [])

  // ── Debounced filter changes (excluding q — q needs explicit submit) ────────

  useEffect(() => {
    // Only auto-trigger for filter fields (not the text query)
    const { q: _q, ...filterPart } = committedFilters
    const { q: _qf, ...filterPartNew } = filters

    if (JSON.stringify(filterPart) !== JSON.stringify(filterPartNew)) {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        const merged: Filters = { ...filters }
        setCommittedFilters(merged)
        fetchResults(merged)
      }, 600)
    }

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters.city,
    filters.min_price,
    filters.max_price,
    filters.bedrooms,
    filters.guests,
    filters.check_in,
    filters.check_out,
  ])

  // ── Handlers ───────────────────────────────────────────────────────────────

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault()
    const merged = { ...filters }
    setCommittedFilters(merged)
    fetchResults(merged)
  }

  function handleFilterChange(key: keyof Filters, value: string) {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  function handleClearFilters() {
    setFilters(EMPTY_FILTERS)
    setCommittedFilters(EMPTY_FILTERS)
    setResults([])
    setTotal(null)
    setHasSearched(false)
  }

  const hasActiveFilters =
    filters.city ||
    filters.min_price ||
    filters.max_price ||
    filters.bedrooms ||
    filters.guests ||
    filters.check_in ||
    filters.check_out

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <PageLayout>
      <Header />

      <main className="container py-8 max-w-7xl mx-auto px-4 sm:px-6">

        {/* ── Page title ─────────────────────────────────────────────────── */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Find a property</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Search across all available listings by location, dates, and preferences.
          </p>
        </div>

        {/* ── Search bar ─────────────────────────────────────────────────── */}
        <form onSubmit={handleSearchSubmit} className="mb-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={filters.q}
                onChange={e => handleFilterChange('q', e.target.value)}
                placeholder="Search by title, location, or keyword…"
                className="w-full pl-9 pr-4 py-2.5 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {filters.q && (
                <button
                  type="button"
                  onClick={() => handleFilterChange('q', '')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Mobile filter toggle */}
            <button
              type="button"
              onClick={() => setFiltersOpen(v => !v)}
              className={`sm:hidden flex items-center gap-1.5 px-3 py-2.5 text-sm rounded-lg border transition-colors ${
                filtersOpen || hasActiveFilters
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-background text-muted-foreground hover:text-foreground'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              {hasActiveFilters && (
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              )}
            </button>

            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">Search</span>
            </button>
          </div>
        </form>

        {/* ── Filter panel ───────────────────────────────────────────────── */}
        <div
          className={`${
            filtersOpen ? 'block' : 'hidden sm:block'
          } mb-6`}
        >
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <SlidersHorizontal className="w-4 h-4" />
                Filters
              </div>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-3 h-3" />
                  Clear all
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">

              {/* City */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> City
                </label>
                <input
                  type="text"
                  value={filters.city}
                  onChange={e => handleFilterChange('city', e.target.value)}
                  placeholder="e.g. Lisbon"
                  className="px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {/* Min price */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Min price / night
                </label>
                <input
                  type="number"
                  min={0}
                  value={filters.min_price}
                  onChange={e => handleFilterChange('min_price', e.target.value)}
                  placeholder="$ 0"
                  className="px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {/* Max price */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Max price / night
                </label>
                <input
                  type="number"
                  min={0}
                  value={filters.max_price}
                  onChange={e => handleFilterChange('max_price', e.target.value)}
                  placeholder="No limit"
                  className="px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {/* Bedrooms */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <BedDouble className="w-3 h-3" /> Bedrooms
                </label>
                <div className="flex gap-1">
                  {BEDROOMS_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleFilterChange('bedrooms', opt.value)}
                      className={`flex-1 py-2 text-xs rounded-lg border transition-colors font-medium ${
                        filters.bedrooms === opt.value
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-background text-muted-foreground hover:text-foreground hover:border-foreground/30'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Guests */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <Users className="w-3 h-3" /> Guests
                </label>
                <input
                  type="number"
                  min={1}
                  value={filters.guests}
                  onChange={e => handleFilterChange('guests', e.target.value)}
                  placeholder="Any"
                  className="px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {/* Check-in */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Check-in
                </label>
                <input
                  type="date"
                  value={filters.check_in}
                  onChange={e => handleFilterChange('check_in', e.target.value)}
                  className="px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {/* Check-out */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Check-out
                </label>
                <input
                  type="date"
                  value={filters.check_out}
                  min={filters.check_in || undefined}
                  onChange={e => handleFilterChange('check_out', e.target.value)}
                  className="px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

            </div>
          </div>
        </div>

        {/* ── Results header ─────────────────────────────────────────────── */}
        {hasSearched && !loading && total !== null && (
          <div className="mb-4 text-sm text-muted-foreground">
            {total === 0
              ? 'No properties found.'
              : `${total} ${total === 1 ? 'property' : 'properties'} found`}
          </div>
        )}

        {/* ── States ─────────────────────────────────────────────────────── */}
        {loading && <LoadingGrid />}

        {!loading && error && (
          <ErrorState
            message={error}
            onRetry={() => fetchResults(committedFilters)}
          />
        )}

        {!loading && !error && hasSearched && results.length === 0 && (
          <EmptyState query={committedFilters.q} />
        )}

        {!loading && !error && !hasSearched && (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <Search className="w-8 h-8 text-muted-foreground opacity-40" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Search for properties</p>
              <p className="text-sm text-muted-foreground mt-1">
                Enter a keyword or set filters above, then click Search.
              </p>
            </div>
          </div>
        )}

        {/* ── Results grid ───────────────────────────────────────────────── */}
        {!loading && !error && results.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {results.map(property => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
        )}

      </main>
    </PageLayout>
  )
}
