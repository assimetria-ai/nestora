import { useState, useEffect, useCallback } from 'react'
import {
  Home,
  Plus,
  Pencil,
  Trash2,
  Star,
  Loader2,
  AlertTriangle,
  CheckCircle,
  X,
  Image,
  MapPin,
  BedDouble,
  Bath,
  Users,
  DollarSign,
  Eye,
  EyeOff,
} from 'lucide-react'
import { Header } from '../../../components/@system/Header/Header'
import { PageLayout } from '../../../components/@system/layout/PageLayout'
import { api } from '../../../lib/@system/api'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Property {
  id: number
  title: string
  address: string
  city: string | null
  country: string
  bedrooms: number
  bathrooms: number
  max_guests: number
  price_per_night: number
  rent_amount: number
  description: string | null
  amenities: string[]
  images: string[]
  status: string
  listing_type: string
  rating_avg: number | null
  review_count: number
  created_at: string
}

const AMENITY_OPTIONS = [
  'WiFi', 'Kitchen', 'Parking', 'Air conditioning', 'Washer', 'Dryer',
  'TV', 'Pool', 'Hot tub', 'Gym', 'Elevator', 'Pet friendly',
  'Smoking allowed', 'Wheelchair accessible', 'Beach access', 'Mountain view',
]

const EMPTY_FORM = {
  title: '',
  address: '',
  city: '',
  bedrooms: '1',
  bathrooms: '1',
  max_guests: '2',
  price_per_night: '',
  description: '',
  listing_type: 'short_term' as 'short_term' | 'long_term',
  amenities: [] as string[],
  images: [] as string[],
  status: 'vacant' as string,
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

// ─── Property Card ────────────────────────────────────────────────────────────

function PropertyCard({
  property,
  onEdit,
  onDelete,
  onToggleListed,
}: {
  property: Property
  onEdit: (p: Property) => void
  onDelete: (id: number) => void
  onToggleListed: (p: Property) => void
}) {
  const [deleting, setDeleting] = useState(false)
  const [toggling, setToggling] = useState(false)
  const isListed = property.status !== 'unlisted'
  const coverImage = property.images?.[0]

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${property.title}"? This cannot be undone.`)) return
    setDeleting(true)
    try {
      await api.delete(`/properties/${property.id}`)
      onDelete(property.id)
    } finally {
      setDeleting(false)
    }
  }

  const handleToggle = async () => {
    setToggling(true)
    try {
      await onToggleListed(property)
    } finally {
      setToggling(false)
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col">
      {/* Cover image */}
      <div className="relative aspect-video bg-muted flex items-center justify-center overflow-hidden">
        {coverImage ? (
          <img
            src={coverImage}
            alt={property.title}
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        ) : (
          <Image className="h-10 w-10 text-muted-foreground opacity-40" />
        )}
        {/* Status badge */}
        <span className={`absolute top-2 right-2 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${
          isListed ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'
        }`}>
          {isListed ? <CheckCircle className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
          {isListed ? 'Listed' : 'Unlisted'}
        </span>
      </div>

      {/* Info */}
      <div className="p-4 flex flex-col gap-3 flex-1">
        <div>
          <h3 className="font-semibold text-foreground text-sm leading-snug">{property.title}</h3>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <MapPin className="h-3 w-3 shrink-0" />
            {property.city ? `${property.city}, ` : ''}{property.address}
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><BedDouble className="h-3.5 w-3.5" />{property.bedrooms} bed</span>
          <span className="flex items-center gap-1"><Bath className="h-3.5 w-3.5" />{property.bathrooms} bath</span>
          <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />Up to {property.max_guests}</span>
        </div>

        {property.amenities?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {property.amenities.slice(0, 4).map(a => (
              <span key={a} className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{a}</span>
            ))}
            {property.amenities.length > 4 && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">+{property.amenities.length - 4}</span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between mt-auto pt-2 border-t border-border/60">
          <div>
            <span className="text-base font-bold text-foreground">{formatCurrency(Number(property.price_per_night))}</span>
            <span className="text-xs text-muted-foreground">/night</span>
            {property.rating_avg && (
              <p className="text-xs text-muted-foreground flex items-center gap-0.5 mt-0.5">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                {Number(property.rating_avg).toFixed(1)} ({property.review_count})
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleToggle}
              disabled={toggling}
              title={isListed ? 'Unlist property' : 'List property'}
              className="p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              {toggling ? <Loader2 className="h-4 w-4 animate-spin" /> : isListed ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </button>
            <button
              onClick={() => onEdit(property)}
              title="Edit listing"
              className="p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              title="Delete listing"
              className="p-1.5 rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Listing Form Modal ───────────────────────────────────────────────────────

function ListingModal({
  property,
  onClose,
  onSave,
}: {
  property: Property | null
  onClose: () => void
  onSave: (p: Property) => void
}) {
  const isEdit = !!property
  const [form, setForm] = useState(() => {
    if (property) {
      return {
        title: property.title,
        address: property.address,
        city: property.city ?? '',
        bedrooms: String(property.bedrooms),
        bathrooms: String(property.bathrooms),
        max_guests: String(property.max_guests),
        price_per_night: String(property.price_per_night),
        description: property.description ?? '',
        listing_type: property.listing_type as 'short_term' | 'long_term',
        amenities: property.amenities ?? [],
        images: property.images ?? [],
        status: property.status,
      }
    }
    return EMPTY_FORM
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newImage, setNewImage] = useState('')

  const toggleAmenity = (a: string) => {
    setForm(f => ({
      ...f,
      amenities: f.amenities.includes(a)
        ? f.amenities.filter(x => x !== a)
        : [...f.amenities, a],
    }))
  }

  const addImage = () => {
    const url = newImage.trim()
    if (!url) return
    setForm(f => ({ ...f, images: [...f.images, url] }))
    setNewImage('')
  }

  const removeImage = (idx: number) => {
    setForm(f => ({ ...f, images: f.images.filter((_, i) => i !== idx) }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!form.title.trim() || !form.address.trim()) {
      setError('Title and address are required')
      return
    }
    setSaving(true)
    try {
      const payload = {
        title: form.title.trim(),
        address: form.address.trim(),
        city: form.city.trim() || undefined,
        bedrooms: parseInt(form.bedrooms) || 1,
        bathrooms: parseFloat(form.bathrooms) || 1,
        max_guests: parseInt(form.max_guests) || 2,
        price_per_night: parseFloat(form.price_per_night) || 0,
        description: form.description.trim() || undefined,
        listing_type: form.listing_type,
        amenities: form.amenities,
        images: form.images,
        status: form.status,
      }

      let result: Property
      if (isEdit) {
        const res = await api.patch<{ property: Property }>(`/properties/${property.id}`, payload)
        result = res.property
      } else {
        const res = await api.post<{ property: Property }>('/properties', payload)
        result = res.property
      }
      onSave(result)
    } catch (err: any) {
      setError(err?.message ?? 'Failed to save listing')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="relative bg-background rounded-2xl border border-border shadow-xl w-full max-w-2xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">
            {isEdit ? 'Edit Listing' : 'Add New Listing'}
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Title *</label>
            <input
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="e.g. Sunny Beach Apartment in Lisbon"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              required
            />
          </div>

          {/* Address + City */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Address *</label>
              <input
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="Street address"
                value={form.address}
                onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">City</label>
              <input
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="e.g. Lisbon"
                value={form.city}
                onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
              />
            </div>
          </div>

          {/* Bedrooms / Bathrooms / Guests / Price */}
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
            {[
              { label: 'Bedrooms', key: 'bedrooms' as const, icon: <BedDouble className="h-4 w-4" /> },
              { label: 'Bathrooms', key: 'bathrooms' as const, icon: <Bath className="h-4 w-4" /> },
              { label: 'Max Guests', key: 'max_guests' as const, icon: <Users className="h-4 w-4" /> },
              { label: 'Price/Night ($)', key: 'price_per_night' as const, icon: <DollarSign className="h-4 w-4" /> },
            ].map(field => (
              <div key={field.key}>
                <label className="block text-sm font-medium text-foreground mb-1 flex items-center gap-1">
                  {field.icon} {field.label}
                </label>
                <input
                  type="number"
                  min="0"
                  step={field.key === 'bathrooms' ? '0.5' : field.key === 'price_per_night' ? '1' : '1'}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  value={form[field.key]}
                  onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                />
              </div>
            ))}
          </div>

          {/* Listing type */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Listing Type</label>
            <select
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              value={form.listing_type}
              onChange={e => setForm(f => ({ ...f, listing_type: e.target.value as 'short_term' | 'long_term' }))}
            >
              <option value="short_term">Short-term (vacation rental)</option>
              <option value="long_term">Long-term (monthly)</option>
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Description</label>
            <textarea
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
              rows={3}
              placeholder="Describe your property to guests..."
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            />
          </div>

          {/* Amenities */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Amenities</label>
            <div className="flex flex-wrap gap-2">
              {AMENITY_OPTIONS.map(a => (
                <button
                  key={a}
                  type="button"
                  onClick={() => toggleAmenity(a)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    form.amenities.includes(a)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border text-muted-foreground hover:border-primary/50'
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          {/* Images */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Photos (URLs)</label>
            <div className="flex gap-2 mb-2">
              <input
                className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="https://example.com/photo.jpg"
                value={newImage}
                onChange={e => setNewImage(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addImage() }}}
              />
              <button
                type="button"
                onClick={addImage}
                className="rounded-md bg-muted px-3 py-2 text-sm hover:bg-muted/80 transition-colors"
              >
                Add
              </button>
            </div>
            {form.images.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {form.images.map((url, idx) => (
                  <div key={idx} className="relative group">
                    <img
                      src={url}
                      alt=""
                      className="h-16 w-24 object-cover rounded-lg border border-border"
                      onError={(e) => { (e.target as HTMLImageElement).src = '' }}
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      className="absolute -top-1.5 -right-1.5 rounded-full bg-destructive text-white p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Status */}
          {isEdit && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Status</label>
              <select
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
              >
                <option value="vacant">Vacant (listed)</option>
                <option value="occupied">Occupied</option>
                <option value="unlisted">Unlisted</option>
              </select>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? 'Save Changes' : 'Create Listing'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function ListingsPage() {
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Property | null>(null)

  const fetchProperties = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get<{ properties: Property[] }>('/properties')
      setProperties(res.properties)
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load listings')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchProperties() }, [fetchProperties])

  const openCreate = () => { setEditTarget(null); setModalOpen(true) }
  const openEdit = (p: Property) => { setEditTarget(p); setModalOpen(true) }

  const handleSave = (saved: Property) => {
    setProperties(prev => {
      const idx = prev.findIndex(p => p.id === saved.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = saved
        return next
      }
      return [saved, ...prev]
    })
    setModalOpen(false)
  }

  const handleDelete = (id: number) => {
    setProperties(prev => prev.filter(p => p.id !== id))
  }

  const handleToggleListed = async (p: Property) => {
    const newStatus = p.status === 'unlisted' ? 'vacant' : 'unlisted'
    const res = await api.patch<{ property: Property }>(`/properties/${p.id}`, { status: newStatus })
    setProperties(prev => prev.map(x => x.id === p.id ? res.property : x))
  }

  return (
    <PageLayout>
      <Header />
      <main className="container py-8 space-y-6">

        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Home className="h-6 w-6 text-primary" />
              My Listings
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your property listings — create, edit, and publish.
            </p>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Listing
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20 gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading listings...
          </div>
        ) : properties.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-muted-foreground rounded-2xl border-2 border-dashed border-border">
            <Home className="h-12 w-12 opacity-30" />
            <div className="text-center">
              <p className="text-sm font-medium">No listings yet</p>
              <p className="text-xs mt-1">Add your first property to start accepting bookings.</p>
            </div>
            <button
              onClick={openCreate}
              className="flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add First Listing
            </button>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              {properties.length} listing{properties.length !== 1 ? 's' : ''} ·{' '}
              {properties.filter(p => p.status !== 'unlisted').length} active
            </p>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {properties.map(p => (
                <PropertyCard
                  key={p.id}
                  property={p}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                  onToggleListed={handleToggleListed}
                />
              ))}
            </div>
          </>
        )}
      </main>

      {modalOpen && (
        <ListingModal
          property={editTarget}
          onClose={() => setModalOpen(false)}
          onSave={handleSave}
        />
      )}
    </PageLayout>
  )
}
