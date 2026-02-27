// @system — user profile / settings page
import { useState, useEffect, useCallback, type FormEvent } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { Home, Settings, Shield, CreditCard, Activity, Key, Save, Monitor, Trash2, Bell, User, Lock } from 'lucide-react'
import { Header } from '../../../components/@system/Header/Header'
import { Sidebar, SidebarSection, SidebarItem } from '../../../components/@system/Sidebar/Sidebar'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/@system/Card/Card'
import { FormField, Input } from '../../../components/@system/Form/Form'
import { Button } from '../../../components/@system/ui/button'
import { Switch } from '../../../components/@system/ui/switch'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../../components/@system/Tabs/Tabs'
import { useAuthContext } from '../../../store/@system/auth'
import { SettingsPageSkeleton } from '../../../components/@system/Skeleton/Skeleton'
import { TwoFactorSetup } from '../../../components/@system/TwoFactor/TwoFactorSetup'
import { api } from '../../../lib/@system/api'
import { getSessions, revokeSession, type Session } from '../../../api/@system'

const NAV_ITEMS = [
  { icon: Home, label: 'Dashboard', to: '/app' },
  { icon: Activity, label: 'Activity', to: '/app/activity' },
  { icon: CreditCard, label: 'Billing', to: '/app/billing' },
  { icon: Key, label: 'API Keys', to: '/app/api-keys' },
  { icon: Settings, label: 'Settings', to: '/app/settings' },
]

/** Extract a short label from a raw User-Agent string. */
function parseUA(ua: string | null): string {
  if (!ua) return 'Unknown device'
  // Try to extract browser and OS in a simple way
  const browser =
    /Edg\//.test(ua) ? 'Edge' :
    /Chrome\//.test(ua) ? 'Chrome' :
    /Firefox\//.test(ua) ? 'Firefox' :
    /Safari\//.test(ua) && !/Chrome/.test(ua) ? 'Safari' :
    /OPR\//.test(ua) ? 'Opera' :
    'Browser'
  const os =
    /Windows/.test(ua) ? 'Windows' :
    /Mac OS X/.test(ua) ? 'macOS' :
    /Linux/.test(ua) ? 'Linux' :
    /Android/.test(ua) ? 'Android' :
    /iPhone|iPad/.test(ua) ? 'iOS' :
    'Unknown OS'
  return `${browser} on ${os}`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

type NotifPrefs = {
  security: boolean
  billing: boolean
  activity: boolean
  marketing: boolean
  inApp: boolean
  weeklyDigest: boolean
  mentions: boolean
}

const DEFAULT_NOTIF_PREFS: NotifPrefs = {
  security: true,
  billing: true,
  activity: false,
  marketing: false,
  inApp: true,
  weeklyDigest: false,
  mentions: true,
}

export function SettingsPage() {
  const { user, loading: authLoading, updateUser } = useAuthContext()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()

  const [name, setName] = useState(user?.name ?? '')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [totpEnabled, setTotpEnabled] = useState(false)

  // Notification preferences
  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>(DEFAULT_NOTIF_PREFS)
  const [notifSaving, setNotifSaving] = useState(false)
  const [notifSuccess, setNotifSuccess] = useState(false)
  const [notifError, setNotifError] = useState('')

  // Active sessions state
  const [sessions, setSessions] = useState<Session[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(true)
  const [sessionsError, setSessionsError] = useState('')
  const [revokingId, setRevokingId] = useState<number | null>(null)

  // Tab state driven by ?tab= query param
  const activeTab = searchParams.get('tab') ?? 'profile'

  function setTab(tab: string) {
    setSearchParams({ tab }, { replace: true })
  }

  useEffect(() => {
    api.get<{ enabled: boolean }>('/users/me/2fa/status')
      .then((r) => setTotpEnabled(r.enabled))
      .catch(() => {/* non-critical */})
  }, [])

  useEffect(() => {
    api.get<{ notifications: NotifPrefs }>('/users/me/notifications')
      .then((r) => setNotifPrefs({ ...DEFAULT_NOTIF_PREFS, ...r.notifications }))
      .catch(() => {/* non-critical */})
  }, [])

  const loadSessions = useCallback(async () => {
    setSessionsLoading(true)
    setSessionsError('')
    try {
      const res = await getSessions()
      if (res.data?.sessions) {
        setSessions(res.data.sessions)
      } else {
        setSessionsError(res.message ?? 'Failed to load sessions')
      }
    } catch {
      setSessionsError('Failed to load sessions')
    } finally {
      setSessionsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSessions()
  }, [loadSessions])

  async function handleRevokeSession(sessionId: number) {
    setRevokingId(sessionId)
    try {
      const res = await revokeSession(sessionId)
      if (res.status === 200) {
        setSessions((prev) => prev.filter((s) => s.id !== sessionId))
      } else {
        setSessionsError(res.message ?? 'Failed to revoke session')
      }
    } catch {
      setSessionsError('Failed to revoke session')
    } finally {
      setRevokingId(null)
    }
  }

  async function handleNotifSave() {
    setNotifSaving(true)
    setNotifSuccess(false)
    setNotifError('')
    try {
      const res = await api.patch<{ notifications: NotifPrefs }>('/users/me/notifications', notifPrefs)
      setNotifPrefs({ ...DEFAULT_NOTIF_PREFS, ...res.notifications })
      setNotifSuccess(true)
    } catch (err) {
      setNotifError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setNotifSaving(false)
    }
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSuccess(false)
    setError('')
    try {
      await updateUser({ name })
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
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
            {user?.role === 'admin' && (
              <Link to="/app/admin">
                <SidebarItem
                  icon={<Shield className="h-4 w-4" />}
                  label="Admin"
                  active={location.pathname === '/app/admin'}
                />
              </Link>
            )}
          </SidebarSection>
        </Sidebar>

        {authLoading ? <SettingsPageSkeleton /> : (
          <main className="flex-1 overflow-auto p-8 max-w-2xl">
            <div className="mb-8">
              <h1 className="text-2xl font-bold">Settings</h1>
              <p className="mt-1 text-muted-foreground">Manage your account preferences.</p>
            </div>

            <Tabs value={activeTab} onValueChange={setTab}>
              <TabsList className="mb-6">
                <TabsTrigger value="profile" className="gap-1.5">
                  <User className="h-3.5 w-3.5" />
                  Profile
                </TabsTrigger>
                <TabsTrigger value="security" className="gap-1.5">
                  <Lock className="h-3.5 w-3.5" />
                  Security
                </TabsTrigger>
                <TabsTrigger value="notifications" className="gap-1.5">
                  <Bell className="h-3.5 w-3.5" />
                  Notifications
                </TabsTrigger>
              </TabsList>

              {/* ── Profile tab ── */}
              <TabsContent value="profile" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Profile</CardTitle>
                    <CardDescription>Update your name and account information.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSave} className="space-y-4">
                      <FormField label="Display Name">
                        <Input
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Your name"
                        />
                      </FormField>
                      <FormField label="Email">
                        <Input
                          value={user?.email ?? ''}
                          disabled
                          className="opacity-60"
                        />
                        <p className="text-xs text-muted-foreground">
                          Email changes require verification — contact support.
                        </p>
                      </FormField>
                      <FormField label="Role">
                        <Input value={user?.role ?? 'user'} disabled className="opacity-60 capitalize" />
                      </FormField>
                      {error && <p className="text-sm text-destructive">{error}</p>}
                      {success && (
                        <p className="text-sm text-green-600">Profile saved successfully!</p>
                      )}
                      <Button type="submit" disabled={saving} className="gap-2">
                        <Save className="h-4 w-4" />
                        {saving ? 'Saving…' : 'Save Changes'}
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                <Card className="border-destructive/40">
                  <CardHeader>
                    <CardTitle className="text-destructive">Danger Zone</CardTitle>
                    <CardDescription>Irreversible account actions.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline" className="text-destructive border-destructive/40 hover:bg-destructive/10">
                      Delete Account
                    </Button>
                    <p className="mt-2 text-xs text-muted-foreground">
                      This will permanently delete your account and all associated data.
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ── Security tab ── */}
              <TabsContent value="security" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Two-Factor Authentication</CardTitle>
                    <CardDescription>
                      Protect your account with a one-time code from an authenticator app.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <TwoFactorSetup enabled={totpEnabled} onStatusChange={setTotpEnabled} />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Active Sessions</CardTitle>
                    <CardDescription>
                      Devices currently signed in to your account. Revoke any session you don't recognise.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {sessionsLoading ? (
                      <p className="text-sm text-muted-foreground">Loading sessions…</p>
                    ) : sessionsError ? (
                      <p className="text-sm text-destructive">{sessionsError}</p>
                    ) : sessions.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No active sessions found.</p>
                    ) : (
                      <ul className="space-y-3">
                        {sessions.map((session) => (
                          <li
                            key={session.id}
                            className="flex items-start justify-between gap-4 rounded-lg border p-4"
                          >
                            <div className="flex items-start gap-3 min-w-0">
                              <Monitor className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="text-sm font-medium truncate">
                                    {parseUA(session.userAgent)}
                                  </p>
                                  {session.isCurrent && (
                                    <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                      Current
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {session.ipAddress ?? 'Unknown IP'} · Signed in {formatDate(session.createdAt)}
                                </p>
                              </div>
                            </div>
                            {!session.isCurrent && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                disabled={revokingId === session.id}
                                onClick={() => handleRevokeSession(session.id)}
                                title="Revoke this session"
                              >
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">Revoke</span>
                              </Button>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ── Notifications tab ── */}
              <TabsContent value="notifications" className="space-y-6">
                {/* Email notifications */}
                <Card>
                  <CardHeader>
                    <CardTitle>Email Notifications</CardTitle>
                    <CardDescription>Choose which emails you want to receive.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {([
                      {
                        key: 'security' as const,
                        label: 'Security alerts',
                        description: 'Sign-in from new device, password changes, suspicious activity.',
                      },
                      {
                        key: 'billing' as const,
                        label: 'Billing & subscription',
                        description: 'Receipts, renewal reminders, and plan changes.',
                      },
                      {
                        key: 'activity' as const,
                        label: 'Activity digest',
                        description: 'Weekly summary of your account activity.',
                      },
                      {
                        key: 'marketing' as const,
                        label: 'Product updates',
                        description: 'New features, tips, and announcements.',
                      },
                    ] as const).map(({ key, label, description }) => (
                      <div key={key} className="flex items-start justify-between gap-4">
                        <div className="space-y-0.5 min-w-0">
                          <p className="text-sm font-medium leading-none">{label}</p>
                          <p className="text-xs text-muted-foreground">{description}</p>
                        </div>
                        <Switch
                          checked={notifPrefs[key]}
                          onCheckedChange={(val) =>
                            setNotifPrefs((prev) => ({ ...prev, [key]: val }))
                          }
                        />
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* In-app notifications */}
                <Card>
                  <CardHeader>
                    <CardTitle>In-App Notifications</CardTitle>
                    <CardDescription>Control what appears in your notification centre.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {([
                      {
                        key: 'inApp' as const,
                        label: 'Enable in-app notifications',
                        description: 'Show the notification bell and real-time alerts in the app.',
                      },
                      {
                        key: 'mentions' as const,
                        label: 'Mentions & replies',
                        description: 'Notify me when someone mentions me or replies to my activity.',
                      },
                      {
                        key: 'weeklyDigest' as const,
                        label: 'Weekly digest',
                        description: 'Receive a summary notification every Monday morning.',
                      },
                    ] as const).map(({ key, label, description }) => (
                      <div key={key} className="flex items-start justify-between gap-4">
                        <div className="space-y-0.5 min-w-0">
                          <p className="text-sm font-medium leading-none">{label}</p>
                          <p className="text-xs text-muted-foreground">{description}</p>
                        </div>
                        <Switch
                          checked={notifPrefs[key]}
                          onCheckedChange={(val) =>
                            setNotifPrefs((prev) => ({ ...prev, [key]: val }))
                          }
                        />
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {notifError && <p className="text-sm text-destructive">{notifError}</p>}
                {notifSuccess && (
                  <p className="text-sm text-green-600">Notification preferences saved!</p>
                )}
                <Button
                  type="button"
                  onClick={handleNotifSave}
                  disabled={notifSaving}
                  className="gap-2"
                >
                  <Save className="h-4 w-4" />
                  {notifSaving ? 'Saving…' : 'Save Preferences'}
                </Button>
              </TabsContent>
            </Tabs>
          </main>
        )}
      </div>
    </div>
  )
}
