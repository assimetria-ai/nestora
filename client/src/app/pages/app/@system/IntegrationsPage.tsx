// @system — Admin integrations status page
// Shows all configured integration adapters (email, payment, storage, etc.)
// with their active provider, health status, and test actions.
import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Home, Settings, Shield, CreditCard, Activity, Key, Puzzle,
  CheckCircle2, XCircle, AlertCircle, RefreshCw, FlaskConical,
} from 'lucide-react'
import { Header } from '../../../components/@system/Header/Header'
import { Sidebar, SidebarSection, SidebarItem } from '../../../components/@system/Sidebar/Sidebar'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/@system/Card/Card'
import { Button } from '../../../components/@system/ui/button'
import { Badge } from '../../../components/@system/ui/badge'
import { useAuthContext } from '../../../store/@system/auth'
import { api } from '../../../lib/@system/api'

interface ProviderHealth {
  configured: boolean
  devMode?: boolean
  [key: string]: unknown
}

interface IntegrationCategory {
  id: string
  label: string
  description: string
  envVar: string
  activeProvider: string
  configured: boolean
  providers: Record<string, ProviderHealth>
}

interface IntegrationStatus {
  timestamp: string
  summary: { total: number; configured: number; missing: number }
  categories: IntegrationCategory[]
}

const NAV_ITEMS = [
  { icon: Home,     label: 'Dashboard', to: '/app' },
  { icon: Activity, label: 'Activity',  to: '/app/activity' },
  { icon: CreditCard, label: 'Billing', to: '/app/billing' },
  { icon: Key,      label: 'API Keys',  to: '/app/api-keys' },
  { icon: Settings, label: 'Settings',  to: '/app/settings' },
]

const CATEGORY_ICONS: Record<string, string> = {
  email:         '📧',
  payment:       '💳',
  storage:       '🗄️',
  notifications: '🔔',
  sms:           '💬',
  ai:            '🤖',
  oauth:         '🔐',
}

function StatusBadge({ configured, devMode }: { configured: boolean; devMode?: boolean }) {
  if (devMode) {
    return (
      <Badge variant="secondary" className="gap-1 text-xs">
        <AlertCircle className="h-3 w-3" /> Dev
      </Badge>
    )
  }
  return configured ? (
    <Badge variant="default" className="gap-1 bg-green-600 text-xs hover:bg-green-700">
      <CheckCircle2 className="h-3 w-3" /> Ready
    </Badge>
  ) : (
    <Badge variant="outline" className="gap-1 text-xs text-muted-foreground">
      <XCircle className="h-3 w-3" /> Not configured
    </Badge>
  )
}

function ProviderRow({
  name,
  health,
  isActive,
}: {
  name: string
  health: ProviderHealth
  isActive: boolean
}) {
  return (
    <div className={`flex items-center justify-between rounded-md px-3 py-2 text-sm ${isActive ? 'bg-muted' : ''}`}>
      <div className="flex items-center gap-2">
        {isActive && <span className="h-2 w-2 rounded-full bg-green-500" title="Active provider" />}
        {!isActive && <span className="h-2 w-2 rounded-full bg-muted-foreground/30" />}
        <span className={`font-mono ${isActive ? 'font-semibold' : 'text-muted-foreground'}`}>{name}</span>
      </div>
      <StatusBadge configured={health.configured} devMode={health.devMode} />
    </div>
  )
}

function IntegrationCard({
  category,
  onTest,
  testing,
  testResult,
}: {
  category: IntegrationCategory
  onTest: (id: string) => void
  testing: boolean
  testResult: { ok: boolean; message: string } | null
}) {
  const icon = CATEGORY_ICONS[category.id] ?? '🔌'

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl" aria-hidden>{icon}</span>
            <div>
              <CardTitle className="text-base">{category.label}</CardTitle>
              <CardDescription className="mt-0.5 text-xs">{category.description}</CardDescription>
            </div>
          </div>
          <StatusBadge configured={category.configured} />
        </div>
      </CardHeader>

      <CardContent className="space-y-1 pb-3">
        {Object.entries(category.providers).map(([name, health]) => (
          <ProviderRow
            key={name}
            name={name}
            health={health}
            isActive={category.activeProvider === name}
          />
        ))}
      </CardContent>

      <div className="border-t px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs text-muted-foreground">
            Active: <span className="font-mono font-semibold">{category.activeProvider}</span>
            {' · '}
            <span className="font-mono text-muted-foreground/70">{category.envVar}</span>
          </div>
          {['email', 'notifications', 'storage'].includes(category.id) && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1 text-xs"
              disabled={testing}
              onClick={() => onTest(category.id)}
            >
              <FlaskConical className="h-3 w-3" />
              {testing ? 'Testing…' : 'Test'}
            </Button>
          )}
        </div>
        {testResult && (
          <div className={`mt-2 rounded px-2 py-1 text-xs ${testResult.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {testResult.ok ? '✓ ' : '✗ '}{testResult.message}
          </div>
        )}
      </div>
    </Card>
  )
}

export function IntegrationsPage() {
  const { user } = useAuthContext()
  const location = useLocation()

  const [status, setStatus] = useState<IntegrationStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [testing, setTesting] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<Record<string, { ok: boolean; message: string }>>({})

  async function fetchStatus() {
    setLoading(true)
    setError('')
    try {
      const data = await api.get<IntegrationStatus>('/integrations')
      setStatus(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load integration status')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
  }, [])

  async function handleTest(id: string) {
    setTesting(id)
    setTestResults((prev) => ({ ...prev, [id]: { ok: false, message: 'Testing…' } }))
    try {
      await api.post(`/integrations/${id}/test`, {})
      setTestResults((prev) => ({ ...prev, [id]: { ok: true, message: 'Test passed successfully' } }))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Test failed'
      setTestResults((prev) => ({ ...prev, [id]: { ok: false, message } }))
    } finally {
      setTesting(null)
    }
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar>
          <div className="mb-6 px-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Navigation
            </p>
          </div>
          <SidebarSection>
            {NAV_ITEMS.map(({ icon: Icon, label, to }) => (
              <Link to={to} key={to}>
                <SidebarItem
                  icon={<Icon className="h-4 w-4" />}
                  label={label}
                  active={location.pathname === to}
                />
              </Link>
            ))}
          </SidebarSection>
          {user?.role === 'admin' && (
            <SidebarSection>
              <Link to="/app/admin">
                <SidebarItem icon={<Shield className="h-4 w-4" />} label="Admin" active={false} />
              </Link>
              <Link to="/app/integrations">
                <SidebarItem
                  icon={<Puzzle className="h-4 w-4" />}
                  label="Integrations"
                  active={location.pathname === '/app/integrations'}
                />
              </Link>
            </SidebarSection>
          )}
        </Sidebar>

        <main className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-5xl space-y-6">
            {/* Header row */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Integrations</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Provider-agnostic adapter status for all configured services
                </p>
              </div>
              <Button variant="outline" size="sm" className="gap-2" onClick={fetchStatus} disabled={loading}>
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>

            {/* Summary bar */}
            {status && (
              <div className="flex items-center gap-6 rounded-lg border bg-muted/30 px-4 py-3">
                <div className="text-sm">
                  <span className="font-semibold text-green-600">{status.summary.configured}</span>
                  <span className="ml-1 text-muted-foreground">configured</span>
                </div>
                <div className="text-sm">
                  <span className="font-semibold text-muted-foreground">{status.summary.missing}</span>
                  <span className="ml-1 text-muted-foreground">not configured</span>
                </div>
                <div className="ml-auto text-xs text-muted-foreground">
                  Last checked: {new Date(status.timestamp).toLocaleTimeString()}
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {loading && !status && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-48 animate-pulse rounded-lg border bg-muted/30" />
                ))}
              </div>
            )}

            {status && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {status.categories.map((category) => (
                  <IntegrationCard
                    key={category.id}
                    category={category}
                    onTest={handleTest}
                    testing={testing === category.id}
                    testResult={testResults[category.id] ?? null}
                  />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
