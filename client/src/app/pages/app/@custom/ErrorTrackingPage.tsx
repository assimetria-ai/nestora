import { useEffect, useState, useCallback } from 'react'
import {
  AlertTriangle,
  Bug,
  CheckCircle2,
  ChevronDown,
  Circle,
  Clock,
  EyeOff,
  Filter,
  RefreshCw,
  X,
} from 'lucide-react'
import { Header } from '../../../components/@system/Header/Header'
import { PageLayout } from '../../../components/@system/layout/PageLayout'
import { cn } from '../../../lib/@system/utils'
import { api } from '../../../lib/@system/api'

// ─── Types ──────────────────────────────────────────────────────────────────

type ErrorLevel = 'fatal' | 'error' | 'warning' | 'info'
type ErrorStatus = 'unresolved' | 'resolved' | 'ignored'

interface ErrorEvent {
  id: number
  fingerprint: string
  title: string
  message: string | null
  level: ErrorLevel
  platform: string | null
  environment: string
  release: string | null
  status: ErrorStatus
  times_seen: number
  first_seen: string
  last_seen: string
  stack_trace: string | null
  extra: Record<string, unknown> | null
  user_id: number | null
  created_at: string
}

interface Stats {
  total: string
  unresolved: string
  resolved: string
  ignored: string
  fatal: string
  errors: string
  warnings: string
  last_24h: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

function levelColor(level: ErrorLevel) {
  return {
    fatal: 'text-red-600 bg-red-50 border-red-200',
    error: 'text-orange-600 bg-orange-50 border-orange-200',
    warning: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    info: 'text-blue-600 bg-blue-50 border-blue-200',
  }[level] ?? 'text-muted-foreground bg-muted'
}

function statusIcon(status: ErrorStatus) {
  if (status === 'resolved') return <CheckCircle2 className="h-4 w-4 text-green-500" />
  if (status === 'ignored') return <EyeOff className="h-4 w-4 text-muted-foreground" />
  return <Circle className="h-4 w-4 text-orange-500" />
}

// ─── Stat Card ───────────────────────────────────────────────────────────────

function StatCard({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 flex items-start gap-3">
      <div className="mt-0.5 text-muted-foreground">{icon}</div>
      <div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}

// ─── Error Detail Modal ───────────────────────────────────────────────────────

function ErrorDetailModal({ event, onClose, onStatusChange }: {
  event: ErrorEvent
  onClose: () => void
  onStatusChange: (id: number, status: ErrorStatus) => void
}) {
  const [updating, setUpdating] = useState(false)

  async function handleStatus(status: ErrorStatus) {
    setUpdating(true)
    try {
      await api.patch(`/errors/${event.id}/status`, { status })
      onStatusChange(event.id, status)
    } catch {
      // ignore
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-xl border border-border bg-background shadow-xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-border p-5">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full border', levelColor(event.level))}>
                {event.level}
              </span>
              <span className="text-xs text-muted-foreground">{event.environment}</span>
            </div>
            <h2 className="text-base font-semibold text-foreground break-words">{event.title}</h2>
          </div>
          <button onClick={onClose} className="shrink-0 rounded-md p-1 hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Meta */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">First seen</p>
              <p className="font-medium">{timeAgo(event.first_seen)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Last seen</p>
              <p className="font-medium">{timeAgo(event.last_seen)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Times seen</p>
              <p className="font-medium">{event.times_seen.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Platform</p>
              <p className="font-medium">{event.platform ?? '—'}</p>
            </div>
            {event.release && (
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Release</p>
                <p className="font-medium font-mono text-xs">{event.release}</p>
              </div>
            )}
          </div>

          {/* Message */}
          {event.message && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Message</p>
              <p className="text-sm bg-muted rounded-md px-3 py-2 break-words">{event.message}</p>
            </div>
          )}

          {/* Stack trace */}
          {event.stack_trace && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Stack trace</p>
              <pre className="text-xs bg-muted rounded-md p-3 overflow-x-auto whitespace-pre-wrap break-all">
                {event.stack_trace}
              </pre>
            </div>
          )}

          {/* Extra */}
          {event.extra && Object.keys(event.extra).length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Extra context</p>
              <pre className="text-xs bg-muted rounded-md p-3 overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(event.extra, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 border-t border-border p-4">
          {event.status !== 'resolved' && (
            <button
              onClick={() => handleStatus('resolved')}
              disabled={updating}
              className="flex items-center gap-1.5 rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Resolve
            </button>
          )}
          {event.status !== 'ignored' && (
            <button
              onClick={() => handleStatus('ignored')}
              disabled={updating}
              className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted disabled:opacity-50"
            >
              <EyeOff className="h-3.5 w-3.5" />
              Ignore
            </button>
          )}
          {event.status !== 'unresolved' && (
            <button
              onClick={() => handleStatus('unresolved')}
              disabled={updating}
              className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted disabled:opacity-50"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              Re-open
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const STATUS_TABS: { label: string; value: ErrorStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Unresolved', value: 'unresolved' },
  { label: 'Resolved', value: 'resolved' },
  { label: 'Ignored', value: 'ignored' },
]

const LEVEL_OPTIONS: { label: string; value: ErrorLevel | '' }[] = [
  { label: 'All levels', value: '' },
  { label: 'Fatal', value: 'fatal' },
  { label: 'Error', value: 'error' },
  { label: 'Warning', value: 'warning' },
  { label: 'Info', value: 'info' },
]

export function ErrorTrackingPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [events, setEvents] = useState<ErrorEvent[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<ErrorStatus | 'all'>('unresolved')
  const [levelFilter, setLevelFilter] = useState<ErrorLevel | ''>('')
  const [selectedEvent, setSelectedEvent] = useState<ErrorEvent | null>(null)
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 20

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (activeTab !== 'all') params.set('status', activeTab)
      if (levelFilter) params.set('level', levelFilter)
      params.set('limit', String(PAGE_SIZE))
      params.set('offset', String(page * PAGE_SIZE))

      const [statsRes, eventsRes] = await Promise.all([
        api.get<{ stats: Stats }>('/errors/stats'),
        api.get<{ events: ErrorEvent[]; total: number }>(`/errors?${params.toString()}`),
      ])
      setStats(statsRes.stats)
      setEvents(eventsRes.events)
      setTotal(eventsRes.total)
    } catch {
      // silently fail — could show a toast
    } finally {
      setLoading(false)
    }
  }, [activeTab, levelFilter, page])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  function handleStatusChange(id: number, status: ErrorStatus) {
    setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, status } : e)))
    if (selectedEvent?.id === id) setSelectedEvent((e) => e ? { ...e, status } : e)
    // refresh stats
    api.get<{ stats: Stats }>('/errors/stats').then((r) => setStats(r.stats)).catch(() => {})
  }

  return (
    <PageLayout>
      <Header />
      <main className="container py-8">
        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Bug className="h-6 w-6" />
              Error Tracking
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">Monitor and triage application errors</p>
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted disabled:opacity-50"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
            Refresh
          </button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <StatCard label="Unresolved" value={stats.unresolved} icon={<AlertTriangle className="h-4 w-4" />} />
            <StatCard label="Last 24h" value={stats.last_24h} icon={<Clock className="h-4 w-4" />} />
            <StatCard label="Fatal" value={stats.fatal} icon={<Bug className="h-4 w-4" />} />
            <StatCard label="Resolved" value={stats.resolved} icon={<CheckCircle2 className="h-4 w-4" />} />
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          {/* Status tabs */}
          <div className="flex rounded-lg border border-border bg-muted/40 p-0.5 gap-0.5">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => { setActiveTab(tab.value); setPage(0) }}
                className={cn(
                  'px-3 py-1 rounded-md text-sm font-medium transition-colors',
                  activeTab === tab.value
                    ? 'bg-background shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {tab.label}
                {tab.value === 'unresolved' && stats && (
                  <span className="ml-1.5 rounded-full bg-orange-100 text-orange-700 text-xs px-1.5 py-0.5">
                    {stats.unresolved}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Level filter */}
          <div className="relative">
            <select
              value={levelFilter}
              onChange={(e) => { setLevelFilter(e.target.value as ErrorLevel | ''); setPage(0) }}
              className="appearance-none pl-8 pr-8 py-1.5 text-sm rounded-md border border-border bg-background text-foreground cursor-pointer hover:bg-muted focus:outline-none"
            >
              {LEVEL_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <Filter className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          </div>

          <p className="text-sm text-muted-foreground ml-auto">
            {total.toLocaleString()} {total === 1 ? 'issue' : 'issues'}
          </p>
        </div>

        {/* Table */}
        <div className="rounded-lg border border-border overflow-hidden">
          {loading && events.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              Loading errors...
            </div>
          ) : events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <CheckCircle2 className="h-10 w-10 mb-3 text-green-400" />
              <p className="text-sm font-medium">No issues found</p>
              <p className="text-xs mt-1">Your app is looking healthy!</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  <th className="px-4 py-3 text-left w-6"></th>
                  <th className="px-4 py-3 text-left">Issue</th>
                  <th className="px-4 py-3 text-left w-24 hidden sm:table-cell">Level</th>
                  <th className="px-4 py-3 text-right w-20 hidden md:table-cell">Events</th>
                  <th className="px-4 py-3 text-right w-28 hidden md:table-cell">Last seen</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr
                    key={event.id}
                    onClick={() => setSelectedEvent(event)}
                    className="border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      {statusIcon(event.status)}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground truncate max-w-md">{event.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{event.environment}</p>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full border', levelColor(event.level))}>
                        {event.level}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-muted-foreground hidden md:table-cell">
                      {event.times_seen.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground hidden md:table-cell">
                      {timeAgo(event.last_seen)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {total > PAGE_SIZE && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total.toLocaleString()}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-40"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={(page + 1) * PAGE_SIZE >= total}
                className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Detail modal */}
      {selectedEvent && (
        <ErrorDetailModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onStatusChange={handleStatusChange}
        />
      )}
    </PageLayout>
  )
}
