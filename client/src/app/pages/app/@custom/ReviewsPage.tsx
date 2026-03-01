import { useState, useEffect, useCallback } from 'react'
import {
  Star,
  MessageSquare,
  Reply,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Home,
} from 'lucide-react'
import { Header } from '../../../components/@system/Header/Header'
import { PageLayout } from '../../../components/@system/layout/PageLayout'
import { api } from '../../../lib/@system/api'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Property {
  id: number
  title: string
  address: string
}

interface Review {
  id: number
  reviewer_name: string
  rating: number
  cleanliness: number | null
  accuracy: number | null
  location: number | null
  value: number | null
  comment: string | null
  host_response: string | null
  host_responded_at: string | null
  created_at: string
}

interface ReviewsResponse {
  reviews: Review[]
  avg_rating: number
  total: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StarDisplay({
  rating,
  size = 'md',
  showNumber = false,
}: {
  rating: number
  size?: 'sm' | 'md' | 'lg'
  showNumber?: boolean
}) {
  const sizeClass = size === 'lg' ? 'h-6 w-6' : size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'
  const filled = Math.round(rating)
  return (
    <span className="inline-flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          className={`${sizeClass} shrink-0 ${
            i <= filled ? 'fill-amber-400 text-amber-400' : 'fill-none text-muted-foreground/30'
          }`}
        />
      ))}
      {showNumber && (
        <span
          className={`font-semibold text-foreground ${
            size === 'lg' ? 'text-xl ml-1' : 'text-sm ml-0.5'
          }`}
        >
          {rating.toFixed(1)}
        </span>
      )}
    </span>
  )
}

function SubRatingBar({ label, value }: { label: string; value: number | null }) {
  if (value === null) return null
  const pct = ((value - 1) / 4) * 100
  return (
    <div className="flex items-center gap-3">
      <span className="w-24 shrink-0 text-xs text-muted-foreground capitalize">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-amber-400 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-8 text-right text-xs font-medium text-foreground">{value.toFixed(1)}</span>
    </div>
  )
}

function ReviewReplyForm({
  reviewId,
  onSuccess,
}: {
  reviewId: number
  onSuccess: (response: string) => void
}) {
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return
    setSaving(true)
    setError(null)
    try {
      await api.post(`/reviews/${reviewId}/response`, { response: text.trim() })
      setSuccess(true)
      onSuccess(text.trim())
    } catch (err: any) {
      setError(err?.message ?? 'Failed to submit response')
    } finally {
      setSaving(false)
    }
  }

  if (success) {
    return (
      <div className="flex items-center gap-2 text-sm text-emerald-600 mt-3">
        <CheckCircle className="h-4 w-4 shrink-0" />
        Response posted successfully.
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 space-y-2">
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Write a response to this review..."
        rows={3}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
      />
      {error && (
        <p className="flex items-center gap-1.5 text-xs text-destructive">
          <AlertTriangle className="h-3 w-3 shrink-0" />
          {error}
        </p>
      )}
      <div className="flex items-center justify-end gap-2">
        <button
          type="submit"
          disabled={saving || !text.trim()}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Reply className="h-3 w-3" />
          )}
          Post Response
        </button>
      </div>
    </form>
  )
}

function ReviewCard({ review }: { review: Review }) {
  const [replying, setReplying] = useState(false)
  const [localResponse, setLocalResponse] = useState<string | null>(review.host_response)

  const handleResponseSuccess = (text: string) => {
    setLocalResponse(text)
    setReplying(false)
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-3 shadow-sm">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm uppercase">
            {review.reviewer_name.charAt(0)}
          </div>
          <div>
            <p className="font-medium text-foreground leading-tight">{review.reviewer_name}</p>
            <p className="text-xs text-muted-foreground">{formatDate(review.created_at)}</p>
          </div>
        </div>
        <StarDisplay rating={review.rating} size="sm" showNumber />
      </div>

      {/* Comment */}
      {review.comment && (
        <p className="text-sm text-foreground/90 leading-relaxed">{review.comment}</p>
      )}

      {/* Host response */}
      {localResponse ? (
        <div className="ml-4 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 space-y-1">
          <p className="text-xs font-semibold text-primary flex items-center gap-1.5">
            <MessageSquare className="h-3 w-3" />
            Host Response
            {review.host_responded_at && (
              <span className="font-normal text-muted-foreground">
                · {formatDate(review.host_responded_at)}
              </span>
            )}
          </p>
          <p className="text-sm text-foreground/90 leading-relaxed">{localResponse}</p>
        </div>
      ) : (
        <div>
          {!replying ? (
            <button
              onClick={() => setReplying(true)}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <Reply className="h-3 w-3" />
              Reply to Review
            </button>
          ) : (
            <ReviewReplyForm reviewId={review.id} onSuccess={handleResponseSuccess} />
          )}
        </div>
      )}
    </div>
  )
}

function ReviewsSummary({
  avgRating,
  total,
  reviews,
}: {
  avgRating: number
  total: number
  reviews: Review[]
}) {
  // Compute sub-rating averages from all reviews
  const avg = (key: keyof Review) => {
    const vals = reviews.map(r => r[key] as number | null).filter((v): v is number => v !== null)
    if (vals.length === 0) return null
    return vals.reduce((s, v) => s + v, 0) / vals.length
  }

  const cleanliness = avg('cleanliness')
  const accuracy = avg('accuracy')
  const location = avg('location')
  const value = avg('value')

  const hasSubRatings = [cleanliness, accuracy, location, value].some(v => v !== null)

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-5">
      {/* Overall rating hero */}
      <div className="flex items-center gap-5">
        <div className="text-center">
          <p className="text-5xl font-bold text-foreground leading-none">{avgRating.toFixed(1)}</p>
          <StarDisplay rating={avgRating} size="md" />
          <p className="mt-1 text-xs text-muted-foreground">
            {total} {total === 1 ? 'review' : 'reviews'}
          </p>
        </div>
        {hasSubRatings && (
          <div className="flex-1 space-y-2.5">
            <SubRatingBar label="Cleanliness" value={cleanliness} />
            <SubRatingBar label="Accuracy" value={accuracy} />
            <SubRatingBar label="Location" value={location} />
            <SubRatingBar label="Value" value={value} />
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function ReviewsPage() {
  const [properties, setProperties] = useState<Property[]>([])
  const [propertiesLoading, setPropertiesLoading] = useState(true)
  const [propertiesError, setPropertiesError] = useState<string | null>(null)

  const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null)

  const [reviewsData, setReviewsData] = useState<ReviewsResponse | null>(null)
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [reviewsError, setReviewsError] = useState<string | null>(null)

  // Load properties on mount
  useEffect(() => {
    const fetchProperties = async () => {
      setPropertiesLoading(true)
      setPropertiesError(null)
      try {
        const data = await api.get<{ properties: Property[] }>('/properties')
        const list = data.properties ?? []
        setProperties(list)
        if (list.length > 0) setSelectedPropertyId(list[0].id)
      } catch (err: any) {
        setPropertiesError(err?.message ?? 'Failed to load properties')
      } finally {
        setPropertiesLoading(false)
      }
    }
    fetchProperties()
  }, [])

  // Load reviews whenever selected property changes
  const fetchReviews = useCallback(async (propertyId: number) => {
    setReviewsLoading(true)
    setReviewsError(null)
    setReviewsData(null)
    try {
      const data = await api.get<ReviewsResponse>(`/reviews?property_id=${propertyId}`)
      setReviewsData(data)
    } catch (err: any) {
      setReviewsError(err?.message ?? 'Failed to load reviews')
    } finally {
      setReviewsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selectedPropertyId !== null) {
      fetchReviews(selectedPropertyId)
    }
  }, [selectedPropertyId, fetchReviews])

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <PageLayout>
      <Header />

      <main className="container py-8 space-y-8">
        {/* Page heading */}
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Star className="h-6 w-6 text-primary" />
            Reviews
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Monitor guest feedback and respond to reviews across your properties.
          </p>
        </div>

        {/* Properties error */}
        {propertiesError && (
          <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {propertiesError}
          </div>
        )}

        {/* Properties loading */}
        {propertiesLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading properties...
          </div>
        )}

        {/* No properties */}
        {!propertiesLoading && !propertiesError && properties.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16 gap-3 text-muted-foreground shadow-sm">
            <Home className="h-10 w-10 opacity-40" />
            <p className="text-sm font-medium">No properties found</p>
            <p className="text-xs">Add a property to start collecting reviews.</p>
          </div>
        )}

        {/* Property selector tabs */}
        {!propertiesLoading && properties.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {properties.map(p => (
              <button
                key={p.id}
                onClick={() => setSelectedPropertyId(p.id)}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  selectedPropertyId === p.id
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <Home className="h-3.5 w-3.5 shrink-0" />
                {p.title}
              </button>
            ))}
          </div>
        )}

        {/* Reviews area */}
        {selectedPropertyId !== null && (
          <>
            {/* Reviews loading */}
            {reviewsLoading && (
              <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading reviews...
              </div>
            )}

            {/* Reviews error */}
            {!reviewsLoading && reviewsError && (
              <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {reviewsError}
                <button
                  onClick={() => fetchReviews(selectedPropertyId)}
                  className="ml-auto text-xs underline hover:no-underline"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Reviews content */}
            {!reviewsLoading && !reviewsError && reviewsData && (
              <div className="space-y-6">
                {/* Empty state */}
                {reviewsData.total === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16 gap-3 text-muted-foreground shadow-sm">
                    <MessageSquare className="h-10 w-10 opacity-40" />
                    <p className="text-sm font-medium">No reviews yet</p>
                    <p className="text-xs">Guest reviews for this property will appear here.</p>
                  </div>
                ) : (
                  <>
                    {/* Summary card */}
                    <ReviewsSummary
                      avgRating={reviewsData.avg_rating}
                      total={reviewsData.total}
                      reviews={reviewsData.reviews}
                    />

                    {/* Review list */}
                    <div className="space-y-4">
                      {reviewsData.reviews.map(review => (
                        <ReviewCard key={review.id} review={review} />
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </PageLayout>
  )
}
