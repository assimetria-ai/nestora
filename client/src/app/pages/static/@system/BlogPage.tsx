// @system — Blog index page: post grid + category filter + search
// @custom — posts load from /api/blog (DB-backed via admin panel). BLOG_POSTS is a fallback.
import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Search,
  Calendar,
  Clock,
  ArrowRight,
  Tag,
  BookOpen,
} from 'lucide-react'
import { Header } from '../../../components/@system/Header/Header'
import { Footer } from '../../../components/@system/Footer/Footer'
import { Card, CardContent } from '../../../components/@system/Card/Card'
import { Button } from '../../../components/@system/ui/button'
import { info } from '../../../../config/@system/info'
import { cn } from '../../../lib/@system/utils'

// ── Types ──────────────────────────────────────────────────────────────────────

export interface BlogPost {
  id: string
  slug: string
  title: string
  excerpt: string
  category: string
  author: string
  publishedAt: string // ISO date string
  readingTime: number // minutes
  tags?: string[]
  content: string
  coverImage?: string
}

// ── Data — replace with your own content or fetch from API ────────────────────

export const BLOG_CATEGORIES = [
  'All',
  'Product',
  'Engineering',
  'Design',
  'Company',
  'Tutorials',
]

export const BLOG_POSTS: BlogPost[] = [
  {
    id: '1',
    slug: 'welcome-to-our-blog',
    title: 'Welcome to our blog',
    excerpt:
      'Introducing our blog where we share product updates, engineering deep-dives, design thinking, and company news.',
    category: 'Company',
    author: 'The Team',
    publishedAt: '2024-01-15',
    readingTime: 2,
    tags: ['announcement', 'company'],
    content: `
## Welcome to our blog

We're excited to launch our official blog — a place where we'll share what we're building, how we're building it, and why we make the decisions we do.

### What to expect

- **Product updates** — new features, improvements, and what's coming next
- **Engineering posts** — technical deep-dives on our architecture and the problems we solve
- **Design thinking** — how we approach UX, accessibility, and visual design
- **Company news** — team growth, milestones, and behind-the-scenes stories

### Stay in the loop

Subscribe to our newsletter or follow us on social media to be notified when we publish new posts. We aim to publish at least twice a month.

Thanks for being here.
    `.trim(),
  },
  {
    id: '2',
    slug: 'how-we-built-our-auth-system',
    title: 'How we built our authentication system',
    excerpt:
      'A walkthrough of the trade-offs we considered when designing our auth flow — from password hashing to 2FA and session management.',
    category: 'Engineering',
    author: 'Engineering Team',
    publishedAt: '2024-02-03',
    readingTime: 7,
    tags: ['engineering', 'security', 'auth'],
    content: `
## How we built our authentication system

Authentication is one of those things that looks simple on the surface but hides a lot of complexity. Here's how we approached it.

### Password storage

We use **bcrypt** with a cost factor of 12 for all password hashes. We never store plaintext passwords or reversible hashes. On every login we re-verify against the stored hash.

### Session management

We use short-lived JWTs (15 minutes) paired with rotating refresh tokens stored in HttpOnly cookies. This gives us the statelessness of JWTs while limiting the blast radius of a stolen token.

### Two-factor authentication

We support TOTP-based 2FA via standard authenticator apps. Backup codes are generated at setup time and stored as individual bcrypt hashes so they can only be used once.

### Rate limiting

Login endpoints are rate-limited per IP and per account to prevent brute-force attacks. After 5 failed attempts, a progressive back-off is applied.

### What's next

We're currently working on passkey (WebAuthn) support and will write a follow-up post once it's live.
    `.trim(),
  },
  {
    id: '3',
    slug: 'design-system-v2',
    title: 'Introducing our design system v2',
    excerpt:
      `We rebuilt our component library from scratch. Here's what changed, why we did it, and how it makes building faster.`,
    category: 'Design',
    author: 'Design Team',
    publishedAt: '2024-03-12',
    readingTime: 5,
    tags: ['design', 'components', 'ui'],
    content: `
## Introducing our design system v2

After two years of incremental patches, we decided to rebuild our component library from scratch. Here's what we learned.

### Why we rebuilt

The original system grew organically. Over time it accumulated inconsistencies: 17 different shades of grey, three different button sizes that didn't align on a grid, and components that were hard to theme.

### What changed

- **Tokens over magic numbers** — all colours, spacing, and typography are now CSS custom properties sourced from a single token file
- **Accessible by default** — every interactive component ships with proper ARIA attributes and passes WCAG AA contrast requirements
- **Dark mode** — first-class support via the CSS \`prefers-color-scheme\` media query and a manual toggle

### The result

Component count dropped from 94 to 61. Build times are faster. And our designers and engineers now speak the same language.
    `.trim(),
  },
  {
    id: '4',
    slug: 'shipping-faster-with-feature-flags',
    title: 'Shipping faster with feature flags',
    excerpt:
      `Feature flags let us decouple deployment from release. Here's how we use them to ship more confidently.`,
    category: 'Engineering',
    author: 'Engineering Team',
    publishedAt: '2024-04-20',
    readingTime: 6,
    tags: ['engineering', 'deployment', 'best-practices'],
    content: `
## Shipping faster with feature flags

Deploying to production is not the same as releasing to users. Feature flags are the bridge between the two.

### What are feature flags?

A feature flag is a conditional in your code that lets you turn a feature on or off without a deployment. Flags can target all users, a percentage, or a specific cohort.

### How we use them

- **Trunk-based development** — engineers merge to main daily. Unfinished work is behind a flag so it doesn't affect users.
- **Gradual rollouts** — new features start at 1% of users, then 10%, then 100%. We monitor error rates and latency at each stage.
- **Kill switches** — if a feature causes problems in production, we can turn it off in seconds without a rollback.

### The tooling

We evaluated several vendors and eventually built a lightweight in-house solution backed by our database. The overhead is a single DB read per request, cached in memory for 30 seconds.

### Lessons learned

Flags are powerful but they add cognitive overhead. We enforce a policy: every flag gets a ticket for removal within 90 days of full rollout.
    `.trim(),
  },
  {
    id: '5',
    slug: 'product-update-q1-2024',
    title: 'Product update: Q1 2024',
    excerpt:
      `A roundup of everything we shipped in the first quarter — new integrations, performance improvements, and a sneak peek at what's coming in Q2.`,
    category: 'Product',
    author: 'Product Team',
    publishedAt: '2024-04-01',
    readingTime: 4,
    tags: ['product', 'updates'],
    content: `
## Product update: Q1 2024

Here's everything we shipped between January and March.

### New features

- **Two-factor authentication** — protect your account with TOTP-based 2FA
- **API key scoping** — create keys with read-only or write permissions
- **Dark mode** — system default or manual toggle via Settings
- **CSV export** — download your data from any list view

### Performance improvements

We reduced average page load time by 40% by moving to server-side rendering for static pages and implementing aggressive caching on our API.

### Integrations

We added native integrations with Slack (notifications), GitHub (activity feed), and Zapier (automate anything).

### Coming in Q2

- Team permissions and roles
- Audit log
- Custom webhooks
- Mobile app (beta)

As always, thank you for your feedback. Keep it coming.
    `.trim(),
  },
  {
    id: '6',
    slug: 'getting-started-tutorial',
    title: 'Getting started: a step-by-step tutorial',
    excerpt:
      'New to the platform? This tutorial walks you through creating your first project and inviting your team in under 10 minutes.',
    category: 'Tutorials',
    author: 'The Team',
    publishedAt: '2024-05-08',
    readingTime: 8,
    tags: ['tutorial', 'onboarding', 'getting-started'],
    content: `
## Getting started: a step-by-step tutorial

This tutorial will take you from zero to a fully set-up workspace in under 10 minutes.

### Step 1 — Create your account

Go to [/auth?tab=register](/auth?tab=register) and fill in your name, email, and a strong password. You'll receive a verification email — click the link to activate your account.

### Step 2 — Create your first project

Once logged in, click the **+ New Project** button in the top-right corner. Give your project a name and an optional description, then click **Create**.

### Step 3 — Invite your team

Go to **Settings → Team** and enter the email addresses of your collaborators. Each person will receive an invitation email with a link to join.

### Step 4 — Generate an API key

Navigate to **API Keys** in the sidebar. Click **New Key**, name it something descriptive (e.g. "Staging server"), and copy the key. Store it securely — it won't be shown again.

### Step 5 — Explore integrations

Head to **Settings → Integrations** to connect Slack, GitHub, and other tools. Each integration has a step-by-step setup wizard.

### You're ready!

That's all it takes. If you have questions, check out our [Help Center](/help) or reach out to [${info.supportEmail}](mailto:${info.supportEmail}).
    `.trim(),
  },
]

// ── API shape (mirrors DB) ────────────────────────────────────────────────────

interface ApiPost {
  id: number
  slug: string
  title: string
  excerpt: string | null
  content: string
  category: string
  author: string
  tags: string[] | null
  reading_time: number
  published_at: string | null
  created_at: string
}

function apiPostToBlogPost(p: ApiPost): BlogPost {
  return {
    id: String(p.id),
    slug: p.slug,
    title: p.title,
    excerpt: p.excerpt ?? '',
    content: p.content,
    category: p.category,
    author: p.author,
    publishedAt: p.published_at ?? p.created_at,
    readingTime: p.reading_time,
    tags: p.tags ?? [],
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function filterPosts(posts: BlogPost[], category: string, query: string): BlogPost[] {
  let filtered = posts
  if (category !== 'All') {
    filtered = filtered.filter((p) => p.category === category)
  }
  if (query.trim()) {
    const q = query.toLowerCase()
    filtered = filtered.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.excerpt.toLowerCase().includes(q) ||
        (p.tags ?? []).some((t) => t.toLowerCase().includes(q)),
    )
  }
  return filtered
}

// ── Sub-components ────────────────────────────────────────────────────────────

function PostCard({ post }: { post: BlogPost }) {
  return (
    <Link to={`/blog/${post.slug}`} className="group block">
      <Card className="h-full transition-shadow group-hover:shadow-md group-hover:border-primary/40">
        <CardContent className="pt-5 pb-6 flex flex-col gap-3 h-full">
          {/* Category + date */}
          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span className="rounded-full bg-primary/10 text-primary px-2.5 py-0.5 font-medium">
              {post.category}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDate(post.publishedAt)}
            </span>
          </div>

          {/* Title */}
          <h2 className="text-base font-semibold leading-snug group-hover:text-primary transition-colors line-clamp-2">
            {post.title}
          </h2>

          {/* Excerpt */}
          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3 flex-1">
            {post.excerpt}
          </p>

          {/* Footer */}
          <div className="flex items-center justify-between gap-2 mt-1 text-xs text-muted-foreground">
            <span>{post.author}</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {post.readingTime} min read
            </span>
          </div>

          {/* Read more */}
          <div className="flex items-center gap-1 text-xs text-primary font-medium mt-auto pt-1">
            Read more <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

function FeaturedPost({ post }: { post: BlogPost }) {
  return (
    <Link to={`/blog/${post.slug}`} className="group block">
      <Card className="transition-shadow group-hover:shadow-md group-hover:border-primary/40">
        <CardContent className="pt-6 pb-6 flex flex-col gap-4">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="rounded-full bg-primary/10 text-primary px-2.5 py-0.5 font-medium">
              {post.category}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDate(post.publishedAt)}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {post.readingTime} min read
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold leading-snug group-hover:text-primary transition-colors">
            {post.title}
          </h2>

          <p className="text-muted-foreground leading-relaxed">{post.excerpt}</p>

          <div className="flex items-center justify-between gap-2 mt-2">
            <span className="text-sm text-muted-foreground">{post.author}</span>
            <div className="flex items-center gap-1 text-sm text-primary font-medium">
              Read article <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

export function BlogPage() {
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [apiPosts, setApiPosts] = useState<BlogPost[] | null>(null)

  // Load posts from API; fall back to static seed data if API unavailable
  useEffect(() => {
    fetch('/api/blog')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: { posts: ApiPost[] }) => {
        if (data.posts && data.posts.length > 0) {
          setApiPosts(data.posts.map(apiPostToBlogPost))
        }
      })
      .catch(() => {
        // API unavailable — static fallback will be used
      })
  }, [])

  const allPosts = apiPosts ?? BLOG_POSTS

  const sorted = useMemo(
    () => [...allPosts].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)),
    [allPosts],
  )

  const filtered = useMemo(
    () => filterPosts(sorted, activeCategory, query),
    [sorted, activeCategory, query],
  )

  const [featured, ...rest] = filtered

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section className="bg-muted/40 border-b">
        <div className="container mx-auto px-4 py-16 text-center max-w-3xl">
          <div className="flex justify-center mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <BookOpen className="h-6 w-6 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl font-bold mb-3">Blog</h1>
          <p className="text-muted-foreground text-lg">
            Product updates, engineering deep-dives, design thinking, and more.
          </p>
        </div>
      </section>

      {/* ── Filters ─────────────────────────────────────────────────────────── */}
      <section className="border-b bg-background sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 max-w-5xl flex flex-col sm:flex-row items-center gap-3">
          {/* Category pills */}
          <div className="flex flex-wrap gap-1.5 flex-1">
            {BLOG_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                  activeCategory === cat
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground',
                )}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              type="search"
              placeholder="Search posts…"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setActiveCategory('All') }}
              className="w-full rounded-lg border bg-card pl-9 pr-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all placeholder:text-muted-foreground"
              aria-label="Search blog posts"
            />
          </div>
        </div>
      </section>

      {/* ── Main content ────────────────────────────────────────────────────── */}
      <main className="container mx-auto px-4 py-12 max-w-5xl">
        {filtered.length === 0 ? (
          <div className="text-center py-24">
            <Tag className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium">No posts found</p>
            <p className="text-sm text-muted-foreground mt-2">
              Try a different category or search term.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-6"
              onClick={() => { setQuery(''); setActiveCategory('All') }}
            >
              Clear filters
            </Button>
          </div>
        ) : (
          <>
            {/* Featured post (first result) */}
            {featured && (
              <section className="mb-10">
                <FeaturedPost post={featured} />
              </section>
            )}

            {/* Rest of posts in grid */}
            {rest.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-5">
                  More posts
                </h2>
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {rest.map((post) => (
                    <PostCard key={post.id} post={post} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>

      <Footer />
    </div>
  )
}
