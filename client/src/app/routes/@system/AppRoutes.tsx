import { Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { useAuthContext } from '../../store/@system/auth'
import { Spinner } from '../../components/@system/Loading/Spinner'
import { ProtectedRoute } from '../../components/@system/ProtectedRoute/ProtectedRoute'

// Static / marketing pages (no auth required)
const LandingPage = lazy(() =>
  import('../../pages/static/@system/LandingPage').then((m) => ({ default: m.LandingPage }))
)
const NotFoundPage = lazy(() =>
  import('../../pages/static/@system/NotFoundPage').then((m) => ({ default: m.NotFoundPage }))
)
const AuthPage = lazy(() =>
  import('../../pages/static/@system/AuthPage').then((m) => ({ default: m.AuthPage }))
)
const RegisterPage = lazy(() =>
  import('../../pages/static/@system/RegisterPage').then((m) => ({ default: m.RegisterPage }))
)
const ForgotPasswordPage = lazy(() =>
  import('../../pages/static/@system/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage }))
)
const ResetPasswordPage = lazy(() =>
  import('../../pages/static/@system/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage }))
)
const VerifyEmailPage = lazy(() =>
  import('../../pages/static/@system/VerifyEmailPage').then((m) => ({ default: m.VerifyEmailPage }))
)
const RefundPolicyPage = lazy(() =>
  import('../../pages/static/@system/RefundPolicyPage').then((m) => ({ default: m.RefundPolicyPage }))
)
const CookiePolicyPage = lazy(() =>
  import('../../pages/static/@system/CookiePolicyPage').then((m) => ({ default: m.CookiePolicyPage }))
)
const TermsPage = lazy(() =>
  import('../../pages/static/@system/TermsPage').then((m) => ({ default: m.TermsPage }))
)
const PrivacyPolicyPage = lazy(() =>
  import('../../pages/static/@system/PrivacyPolicyPage').then((m) => ({ default: m.PrivacyPolicyPage }))
)
const HelpCenterPage = lazy(() =>
  import('../../pages/static/@system/HelpCenterPage').then((m) => ({ default: m.HelpCenterPage }))
)
const ArticlePage = lazy(() =>
  import('../../pages/static/@system/ArticlePage').then((m) => ({ default: m.ArticlePage }))
)
const PricingPage = lazy(() =>
  import('../../pages/static/@system/PricingPage').then((m) => ({ default: m.PricingPage }))
)
const BlogPage = lazy(() =>
  import('../../pages/static/@system/BlogPage').then((m) => ({ default: m.BlogPage }))
)
const ContactPage = lazy(() =>
  import('../../pages/static/@system/ContactPage').then((m) => ({ default: m.ContactPage }))
)
const AboutPage = lazy(() =>
  import('../../pages/static/@system/AboutPage').then((m) => ({ default: m.AboutPage }))
)
const BlogPostPage = lazy(() =>
  import('../../pages/static/@system/BlogPostPage').then((m) => ({ default: m.BlogPostPage }))
)
const OnboardingPage = lazy(() =>
  import('../../pages/static/@system/OnboardingPage').then((m) => ({ default: m.OnboardingPage }))
)
const TwoFactorVerifyPage = lazy(() =>
  import('../../pages/static/@system/TwoFactorVerifyPage').then((m) => ({ default: m.TwoFactorVerifyPage }))
)

// App pages (auth required)
const BlogAdminPage = lazy(() =>
  import('../../pages/app/@custom/BlogAdminPage').then((m) => ({ default: m.BlogAdminPage }))
)
const HomePage = lazy(() =>
  import('../../pages/app/@system/HomePage').then((m) => ({ default: m.HomePage }))
)
const SettingsPage = lazy(() =>
  import('../../pages/app/@system/SettingsPage').then((m) => ({ default: m.SettingsPage }))
)
const AdminPage = lazy(() =>
  import('../../pages/app/@system/AdminPage').then((m) => ({ default: m.AdminPage }))
)
const ActivityPage = lazy(() =>
  import('../../pages/app/@system/ActivityPage').then((m) => ({ default: m.ActivityPage }))
)
const BillingPage = lazy(() =>
  import('../../pages/app/@system/BillingPage').then((m) => ({ default: m.BillingPage }))
)
const ApiKeysPage = lazy(() =>
  import('../../pages/app/@system/ApiKeysPage').then((m) => ({ default: m.ApiKeysPage }))
)
const IntegrationsPage = lazy(() =>
  import('../../pages/app/@system/IntegrationsPage').then((m) => ({ default: m.IntegrationsPage }))
)

// @custom routes imported from routes/@custom/index.tsx
import { customRoutes } from '../@custom'

function PageFallback() {
  return (
    <div className="flex h-screen items-center justify-center">
      <Spinner />
    </div>
  )
}

/** Redirects authenticated users away from /auth back to /app */
function GuestRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuthContext()
  if (loading) return <PageFallback />
  if (isAuthenticated) return <Navigate to="/app" replace />
  return <>{children}</>
}

export function AppRoutes() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        {/* Marketing / public */}
        <Route path="/" element={<LandingPage />} />

        {/* Auth — redirect to /app when already logged in */}
        <Route
          path="/auth"
          element={
            <GuestRoute>
              <AuthPage />
            </GuestRoute>
          }
        />

        {/* Password reset (public, no auth required) */}
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* Email verification (public — token is in the URL) */}
        <Route path="/verify-email" element={<VerifyEmailPage />} />

        {/* Legal pages */}
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPolicyPage />} />
        <Route path="/refund-policy" element={<RefundPolicyPage />} />
        <Route path="/cookies" element={<CookiePolicyPage />} />
        <Route path="/cookie-policy" element={<Navigate to="/cookies" replace />} />

        {/* Pricing (public) */}
        <Route path="/pricing" element={<PricingPage />} />

        {/* Help center / knowledge base */}
        <Route path="/help" element={<HelpCenterPage />} />
        <Route path="/help/:slug" element={<ArticlePage />} />

        {/* Blog */}
        <Route path="/blog" element={<BlogPage />} />
        <Route path="/blog/:slug" element={<BlogPostPage />} />

        {/* About */}
        <Route path="/about" element={<AboutPage />} />

        {/* Contact */}
        <Route path="/contact" element={<ContactPage />} />

        {/* Onboarding wizard — shown to new users after registration */}
        <Route path="/onboarding" element={<OnboardingPage />} />

        {/* 2FA challenge — shown after password login when TOTP is required */}
        <Route path="/2fa/verify" element={<TwoFactorVerifyPage />} />

        {/* Register — standalone registration page */}
        <Route path="/register" element={<RegisterPage />} />

        {/* Aliases — redirect legacy paths */}
        <Route path="/login" element={<Navigate to="/auth" replace />} />
        <Route path="/signup" element={<Navigate to="/register" replace />} />

        {/* Legacy /dashboard path → authenticated area */}
        <Route path="/dashboard" element={<Navigate to="/app" replace />} />
        <Route path="/dashboard/*" element={<Navigate to="/app" replace />} />

        {/* App (authenticated) */}
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/activity"
          element={
            <ProtectedRoute>
              <ActivityPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/billing"
          element={
            <ProtectedRoute>
              <BillingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/settings"
          element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/admin"
          element={
            <ProtectedRoute role="admin">
              <AdminPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/api-keys"
          element={
            <ProtectedRoute>
              <ApiKeysPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/app/integrations"
          element={
            <ProtectedRoute role="admin">
              <IntegrationsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/app/admin/blog"
          element={
            <ProtectedRoute role="admin">
              <BlogAdminPage />
            </ProtectedRoute>
          }
        />

        {/* Custom product routes */}
        {customRoutes}

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  )
}
