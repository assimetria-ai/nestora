// @custom — Blog admin panel: create, edit, publish articles
import { useEffect, useState, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Home,
  Settings,
  Shield,
  CreditCard,
  Activity,
  Key,
  Plus,
  Pencil,
  Trash2,
  Globe,
  EyeOff,
  BookOpen,
  RefreshCw,
  X,
  Save,
} from 'lucide-react'
import { Header } from '../../../components/@system/Header/Header'
import { Sidebar, SidebarSection, SidebarItem } from '../../../components/@system/Sidebar/Sidebar'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/@system/Card/Card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../components/@system/Table/Table'
import { Button } from '../../../components/@system/ui/button'
import { api } from '../../../lib/@system/api'
import { cn } from '../../../lib/@system/utils'

// ── Types ─────────────────────────────────────────────────────────────────────

interface BlogPost {
  id: number
  slug: string
  title: string
  excerpt: string | null
  content: string
  category: string
  author: string
  tags: string[] | null
  cover_image: string | null
  reading_time: number
  status: 'draft' | 'published'
  published_at: string | null
  created_at: string
  updated_at: string
}

const CATEGORIES = ['Company', 'Product', 'Engineering', 'Design', 'Tutorials']

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

// ── Nav items ─────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { icon: Home, label: 'Dashboard', to: '/app' },
  { icon: Activity, label: 'Activity', to: '/app/activity' },
  { icon: CreditCard, label: 'Billing', to: '/app/billing' },
  { icon: Key, label: 'API Keys', to: '/app/api-keys' },
  { icon: Settings, label: 'Settings', to: '/app/settings' },
  { icon: Shield, label: 'Admin', to: '/app/admin' },
  { icon: BookOpen, label: 'Blog', to: '/app/admin/blog' },
]

// ── Post Form Modal ───────────────────────────────────────────────────────────

interface PostFormProps {
  post: BlogPost | null
  onClose: () => void
  onSaved: () => void
}

function PostFormModal({ post, onClose, onSaved }: PostFormProps) {
  const isEdit = !!post
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [title, setTitle] = useState(post?.title ?? '')
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? '')
  const [content, setContent] = useState(post?.content ?? '')
  const [category, setCategory] = useState(post?.category ?? 'Company')
  const [author, setAuthor] = useState(post?.author ?? '')
  const [tagsRaw, setTagsRaw] = useState((post?.tags ?? []).join(', '))
  const [status, setStatus] = useState<'draft' | 'published'>(post?.status ?? 'draft')

  const overlayRef = useRef<HTMLDivElement>(null)

  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === overlayRef.current) onClose()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) { setError('Title is required'); return }

    setSaving(true)
    setError('')

    const tags = tagsRaw
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)

    const body = {
      title: title.trim(),
      excerpt: excerpt.trim() || null,
      content: content.trim(),
      category,
      author: author.trim() || 'The Team',
      tags: tags.length ? tags : null,
      status,
    }

    try {
      if (isEdit) {
        await api.patch(`/blog/${post!.id}`, body)
      } else {
        await api.post('/blog', body)
      }
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div className="w-full max-w-2xl bg-background rounded-xl border shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">
            {isEdit ? 'Edit post' : 'New post'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[80vh]">
          <div className="px-6 py-5 space-y-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium mb-1">Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Post title…"
                className="w-full rounded-lg border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                required
              />
            </div>

            {/* Excerpt */}
            <div>
              <label className="block text-sm font-medium mb-1">Excerpt</label>
              <textarea
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                placeholder="Short summary shown on the blog index…"
                rows={2}
                className="w-full rounded-lg border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all resize-none"
              />
            </div>

            {/* Content */}
            <div>
              <label className="block text-sm font-medium mb-1">Content (Markdown)</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="## Heading&#10;&#10;Write your post content here…"
                rows={12}
                className="w-full rounded-lg border bg-card px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all resize-y"
              />
            </div>

            {/* Category + Author row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-lg border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Author</label>
                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="The Team"
                  className="w-full rounded-lg border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                />
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium mb-1">Tags <span className="text-muted-foreground font-normal">(comma-separated)</span></label>
              <input
                type="text"
                value={tagsRaw}
                onChange={(e) => setTagsRaw(e.target.value)}
                placeholder="engineering, security, auth"
                className="w-full rounded-lg border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium mb-2">Status</label>
              <div className="flex gap-3">
                {(['draft', 'published'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(s)}
                    className={cn(
                      'flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
                      status === s
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-card text-muted-foreground hover:border-primary/40',
                    )}
                  >
                    {s === 'published' ? (
                      <Globe className="h-3.5 w-3.5" />
                    ) : (
                      <EyeOff className="h-3.5 w-3.5" />
                    )}
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-muted/30">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={saving} className="gap-2">
              <Save className="h-3.5 w-3.5" />
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create post'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Delete confirm dialog ─────────────────────────────────────────────────────

interface DeleteDialogProps {
  post: BlogPost
  onClose: () => void
  onDeleted: () => void
}

function DeleteDialog({ post, onClose, onDeleted }: DeleteDialogProps) {
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  async function handleDelete() {
    setDeleting(true)
    try {
      await api.delete(`/blog/${post.id}`)
      onDeleted()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
      setDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm bg-background rounded-xl border shadow-xl p-6 space-y-4">
        <h2 className="text-base font-semibold">Delete post?</h2>
        <p className="text-sm text-muted-foreground">
          "<strong>{post.title}</strong>" will be permanently deleted. This cannot be undone.
        </p>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-3">
          <Button variant="outline" size="sm" onClick={onClose} disabled={deleting}>
            Cancel
          </Button>
          <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function BlogAdminPage() {
  const location = useLocation()
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [formPost, setFormPost] = useState<BlogPost | null | 'new'>(null)
  const [deletePost, setDeletePost] = useState<BlogPost | null>(null)
  const [actionLoading, setActionLoading] = useState<number | null>(null)

  async function fetchPosts() {
    setLoading(true)
    setError('')
    try {
      const data = await api.get<{ posts: BlogPost[]; total: number }>('/blog/admin')
      setPosts(data.posts)
      setTotal(data.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load posts')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchPosts() }, [])

  async function togglePublish(post: BlogPost) {
    setActionLoading(post.id)
    try {
      const endpoint = post.status === 'published' ? `/blog/${post.id}/unpublish` : `/blog/${post.id}/publish`
      await api.post(endpoint, {})
      await fetchPosts()
    } catch {
      // silently surface via re-fetch
    } finally {
      setActionLoading(null)
    }
  }

  function handleSaved() {
    setFormPost(null)
    fetchPosts()
  }

  function handleDeleted() {
    setDeletePost(null)
    fetchPosts()
  }

  const drafts = posts.filter((p) => p.status === 'draft').length
  const published = posts.filter((p) => p.status === 'published').length

  return (
    <div className="flex h-screen flex-col bg-background">
      <Header />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
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
        </Sidebar>

        {/* Main */}
        <main className="flex-1 overflow-auto p-8">
          {/* Header row */}
          <div className="mb-8 flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">Blog</h1>
              <p className="mt-1 text-muted-foreground">
                {total} post{total !== 1 ? 's' : ''} — {published} published, {drafts} draft{drafts !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchPosts}
                disabled={loading}
                className="gap-2"
              >
                <RefreshCw className={cn('h-3 w-3', loading && 'animate-spin')} />
                Refresh
              </Button>
              <Button
                size="sm"
                className="gap-2"
                onClick={() => setFormPost('new')}
              >
                <Plus className="h-4 w-4" />
                New post
              </Button>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
            <Card>
              <CardContent className="pt-4 pb-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Total</p>
                <p className="text-2xl font-bold mt-1">{total}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Published</p>
                <p className="text-2xl font-bold mt-1 text-green-600">{published}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Drafts</p>
                <p className="text-2xl font-bold mt-1 text-amber-600">{drafts}</p>
              </CardContent>
            </Card>
          </div>

          {/* Table */}
          <Card>
            <CardHeader>
              <CardTitle>All posts</CardTitle>
              <CardDescription>Manage your blog articles.</CardDescription>
            </CardHeader>
            <CardContent>
              {error && <p className="text-sm text-destructive mb-4">{error}</p>}

              {loading && posts.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground text-sm">Loading…</div>
              ) : posts.length === 0 ? (
                <div className="py-12 text-center">
                  <BookOpen className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No posts yet. Create your first one.</p>
                  <Button
                    size="sm"
                    className="mt-4 gap-2"
                    onClick={() => setFormPost('new')}
                  >
                    <Plus className="h-4 w-4" />
                    New post
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Author</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {posts.map((post) => (
                      <TableRow key={post.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm line-clamp-1">{post.title}</p>
                            {post.excerpt && (
                              <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                                {post.excerpt}
                              </p>
                            )}
                          </div>
                        </TableCell>

                        <TableCell>
                          <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs font-medium">
                            {post.category}
                          </span>
                        </TableCell>

                        <TableCell className="text-sm text-muted-foreground">
                          {post.author}
                        </TableCell>

                        <TableCell>
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                              post.status === 'published'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-amber-100 text-amber-700',
                            )}
                          >
                            {post.status === 'published' ? (
                              <Globe className="h-2.5 w-2.5" />
                            ) : (
                              <EyeOff className="h-2.5 w-2.5" />
                            )}
                            {post.status}
                          </span>
                        </TableCell>

                        <TableCell className="text-sm text-muted-foreground">
                          {post.published_at
                            ? formatDate(post.published_at)
                            : formatDate(post.created_at)}
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            {/* Publish / Unpublish */}
                            <Button
                              variant="ghost"
                              size="icon"
                              title={post.status === 'published' ? 'Unpublish' : 'Publish'}
                              disabled={actionLoading === post.id}
                              onClick={() => togglePublish(post)}
                              className="h-7 w-7"
                            >
                              {post.status === 'published' ? (
                                <EyeOff className="h-3.5 w-3.5" />
                              ) : (
                                <Globe className="h-3.5 w-3.5" />
                              )}
                            </Button>

                            {/* Edit */}
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Edit"
                              onClick={() => setFormPost(post)}
                              className="h-7 w-7"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>

                            {/* Delete */}
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Delete"
                              onClick={() => setDeletePost(post)}
                              className="h-7 w-7 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </main>
      </div>

      {/* Create / Edit modal */}
      {formPost !== null && (
        <PostFormModal
          post={formPost === 'new' ? null : formPost}
          onClose={() => setFormPost(null)}
          onSaved={handleSaved}
        />
      )}

      {/* Delete confirm */}
      {deletePost && (
        <DeleteDialog
          post={deletePost}
          onClose={() => setDeletePost(null)}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  )
}
