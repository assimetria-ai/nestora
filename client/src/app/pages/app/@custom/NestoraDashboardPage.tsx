import { useEffect, useState } from 'react'
import {
  Home,
  Users,
  DollarSign,
  Wrench,
  Plus,
  CheckCircle,
  Clock,
  AlertTriangle,
} from 'lucide-react'
import { Header } from '../../../components/@system/Header/Header'
import { PageLayout } from '../../../components/@system/layout/PageLayout'
import { api } from '../../../lib/@system/api'

// ─── Types ──────────────────────────────────────────────────────────────────

type PropertyStatus = 'occupied' | 'vacant'
type MaintenancePriority = 'low' | 'medium' | 'high'
type MaintenanceStatus = 'open' | 'in-progress' | 'resolved'

interface Property {
  id: number
  address: string
  status: PropertyStatus
  tenant_name: string | null
  rent_amount: number
  next_payment_date: string | null
}

interface MaintenanceRequest {
  id: number
  property_address: string
  description: string
  priority: MaintenancePriority
  status: MaintenanceStatus
  submitted_at: string
}

interface DashboardStats {
  total_properties: number
  active_tenants: number
  monthly_revenue: number
  open_maintenance: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount)
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ─── Stat Card ───────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string
  value: string | number
  icon: React.ReactNode
  accent?: string
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 flex items-start gap-4">
      <div className={`rounded-lg p-2.5 ${accent ?? 'bg-primary/10 text-primary'}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-sm text-muted-foreground mt-0.5">{label}</p>
      </div>
    </div>
  )
}

// ─── Priority Badge ───────────────────────────────────────────────────────────

function PriorityBadge({ priority }: { priority: MaintenancePriority }) {
  const styles: Record<MaintenancePriority, string> = {
    low: 'bg-blue-50 text-blue-700 border-blue-200',
    medium: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    high: 'bg-red-50 text-red-700 border-red-200',
  }
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${styles[priority]}`}>
      {priority}
    </span>
  )
}

// ─── Maintenance Status Badge ─────────────────────────────────────────────────

function MaintenanceStatusBadge({ status }: { status: MaintenanceStatus }) {
  if (status === 'resolved') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
        <CheckCircle className="h-3.5 w-3.5" /> Resolved
      </span>
    )
  }
  if (status === 'in-progress') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-600">
        <Clock className="h-3.5 w-3.5" /> In Progress
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-orange-600">
      <AlertTriangle className="h-3.5 w-3.5" /> Open
    </span>
  )
}

// ─── Fallback / Seed data (used when API returns empty) ──────────────────────

const SEED_PROPERTIES: Property[] = [
  { id: 1, address: '142 Maple Street, Apt 3B', status: 'occupied', tenant_name: 'Jordan Clarke', rent_amount: 1850, next_payment_date: '2026-03-01' },
  { id: 2, address: '78 Ocean Drive, Unit 12', status: 'occupied', tenant_name: 'Priya Nair', rent_amount: 2400, next_payment_date: '2026-03-05' },
  { id: 3, address: '9 Birchwood Lane', status: 'vacant', tenant_name: null, rent_amount: 1600, next_payment_date: null },
  { id: 4, address: '305 Summit Boulevard, Suite 4', status: 'occupied', tenant_name: 'Marcus Webb', rent_amount: 3100, next_payment_date: '2026-03-01' },
]

const SEED_MAINTENANCE: MaintenanceRequest[] = [
  { id: 1, property_address: '142 Maple Street, Apt 3B', description: 'Kitchen faucet leaking — dripping constantly', priority: 'medium', status: 'open', submitted_at: '2026-02-24T10:15:00Z' },
  { id: 2, property_address: '78 Ocean Drive, Unit 12', description: 'Heating unit not turning on', priority: 'high', status: 'in-progress', submitted_at: '2026-02-22T08:00:00Z' },
  { id: 3, property_address: '305 Summit Boulevard, Suite 4', description: 'Broken window latch in bedroom', priority: 'low', status: 'open', submitted_at: '2026-02-25T14:30:00Z' },
  { id: 4, property_address: '142 Maple Street, Apt 3B', description: 'Bathroom exhaust fan making loud noise', priority: 'low', status: 'resolved', submitted_at: '2026-02-18T09:00:00Z' },
]

// ─── Main Page ────────────────────────────────────────────────────────────────

export function NestoraDashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    total_properties: 4,
    active_tenants: 3,
    monthly_revenue: 7350,
    open_maintenance: 3,
  })
  const [properties, setProperties] = useState<Property[]>(SEED_PROPERTIES)
  const [maintenance, setMaintenance] = useState<MaintenanceRequest[]>(SEED_MAINTENANCE)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchDashboard() {
      setLoading(true)
      try {
        const [statsRes, propsRes, mainRes] = await Promise.allSettled([
          api.get<{ stats: DashboardStats }>('/nestora/stats'),
          api.get<{ properties: Property[] }>('/nestora/properties'),
          api.get<{ requests: MaintenanceRequest[] }>('/nestora/maintenance'),
        ])

        if (statsRes.status === 'fulfilled') setStats(statsRes.value.stats)
        if (propsRes.status === 'fulfilled' && propsRes.value.properties.length > 0) {
          setProperties(propsRes.value.properties)
        }
        if (mainRes.status === 'fulfilled' && mainRes.value.requests.length > 0) {
          setMaintenance(mainRes.value.requests)
        }
      } catch {
        // silently fall back to seed data
      } finally {
        setLoading(false)
      }
    }
    fetchDashboard()
  }, [])

  const openRequests = maintenance.filter((m) => m.status !== 'resolved')

  return (
    <PageLayout>
      <Header />
      <main className="container py-8">

        {/* Page header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Home className="h-6 w-6" />
              My Properties
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Overview of your portfolio and maintenance queue
            </p>
          </div>
          <button
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            onClick={() => alert('Add Property — coming soon!')}
          >
            <Plus className="h-4 w-4" />
            Add Property
          </button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-8">
          <StatCard
            label="Properties"
            value={loading ? '—' : stats.total_properties}
            icon={<Home className="h-5 w-5" />}
            accent="bg-primary/10 text-primary"
          />
          <StatCard
            label="Active Tenants"
            value={loading ? '—' : stats.active_tenants}
            icon={<Users className="h-5 w-5" />}
            accent="bg-blue-100 text-blue-600"
          />
          <StatCard
            label="Monthly Revenue"
            value={loading ? '—' : formatCurrency(stats.monthly_revenue)}
            icon={<DollarSign className="h-5 w-5" />}
            accent="bg-green-100 text-green-600"
          />
          <StatCard
            label="Open Maintenance"
            value={loading ? '—' : stats.open_maintenance}
            icon={<Wrench className="h-5 w-5" />}
            accent={stats.open_maintenance > 0 ? 'bg-orange-100 text-orange-600' : 'bg-muted text-muted-foreground'}
          />
        </div>

        {/* Properties */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-foreground mb-4">Properties</h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {properties.map((prop) => (
              <div
                key={prop.id}
                className="rounded-xl border border-border bg-card p-5 flex flex-col gap-3 hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-foreground leading-snug">{prop.address}</p>
                  <span
                    className={`shrink-0 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      prop.status === 'occupied'
                        ? 'bg-green-50 text-green-700 border border-green-200'
                        : 'bg-gray-50 text-gray-500 border border-gray-200'
                    }`}
                  >
                    {prop.status === 'occupied' ? 'Occupied' : 'Vacant'}
                  </span>
                </div>

                <div className="text-sm text-muted-foreground space-y-1">
                  <div className="flex justify-between">
                    <span>Tenant</span>
                    <span className="text-foreground font-medium">{prop.tenant_name ?? '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Rent</span>
                    <span className="text-foreground font-medium">{formatCurrency(prop.rent_amount)}/mo</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Next payment</span>
                    <span className="text-foreground font-medium">{formatDate(prop.next_payment_date)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Maintenance Requests */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Maintenance Requests
              {openRequests.length > 0 && (
                <span className="ml-1 rounded-full bg-orange-100 text-orange-700 text-xs font-medium px-2 py-0.5">
                  {openRequests.length} open
                </span>
              )}
            </h2>
          </div>

          <div className="rounded-xl border border-border overflow-hidden">
            {maintenance.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-muted-foreground">
                <CheckCircle className="h-10 w-10 mb-3 text-green-400" />
                <p className="text-sm font-medium">No maintenance requests</p>
                <p className="text-xs mt-1">All clear — nice work!</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    <th className="px-4 py-3 text-left">Property</th>
                    <th className="px-4 py-3 text-left hidden md:table-cell">Issue</th>
                    <th className="px-4 py-3 text-left w-24">Priority</th>
                    <th className="px-4 py-3 text-left w-28 hidden sm:table-cell">Status</th>
                    <th className="px-4 py-3 text-right w-28 hidden lg:table-cell">Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {maintenance.map((req) => (
                    <tr
                      key={req.id}
                      className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground truncate max-w-[180px]">
                          {req.property_address}
                        </p>
                        <p className="text-xs text-muted-foreground md:hidden mt-0.5 truncate max-w-[180px]">
                          {req.description}
                        </p>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-muted-foreground max-w-xs">
                        <p className="truncate">{req.description}</p>
                      </td>
                      <td className="px-4 py-3">
                        <PriorityBadge priority={req.priority} />
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <MaintenanceStatusBadge status={req.status} />
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground hidden lg:table-cell">
                        {formatDate(req.submitted_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

      </main>
    </PageLayout>
  )
}
