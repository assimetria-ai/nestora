import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { Button } from '../../../components/@system/ui/button'
import { FormField, Input } from '../../../components/@system/Form/Form'
import { PasswordStrengthIndicator } from '../../../components/@custom/PasswordStrengthIndicator'
import { api } from '../../../lib/@system/api'
import { useAuthContext } from '../../../store/@system/auth'

// ─── Validation Schema ───────────────────────────────────────────────────────

const registerSchema = z
  .object({
    name: z
      .string()
      .min(1, 'Full name is required')
      .min(2, 'Name must be at least 2 characters')
      .max(100, 'Name is too long'),
    email: z
      .string()
      .min(1, 'Email is required')
      .email('Enter a valid email address'),
    password: z
      .string()
      .min(1, 'Password is required')
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type RegisterFormValues = z.infer<typeof registerSchema>

// ─── Register Page ────────────────────────────────────────────────────────────

export function RegisterPage() {
  const navigate = useNavigate()
  const { refresh } = useAuthContext()
  const [serverError, setServerError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    mode: 'onTouched',
  })

  const passwordValue = watch('password', '')

  async function onSubmit(values: RegisterFormValues) {
    setServerError(null)
    try {
      await api.post('/users', {
        name: values.name.trim(),
        email: values.email.trim().toLowerCase(),
        password: values.password,
      })
      // Auto-login after successful registration
      await api.post('/sessions', {
        email: values.email.trim().toLowerCase(),
        password: values.password,
      })
      // Session cookie set — populate auth context then navigate
      await refresh()
      navigate('/app')
    } catch (err: unknown) {
      setServerError(
        err instanceof Error ? err.message : 'Registration failed. Please try again.'
      )
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Heading */}
        <div className="mb-8 text-center">
          <Link to="/" className="text-xl font-bold text-foreground">
            ProductTemplate
          </Link>
          <h1 className="mt-4 text-2xl font-semibold text-foreground">Create account</h1>
          <p className="mt-1 text-sm text-muted-foreground">Get started for free</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          {/* Name */}
          <FormField label="Full name" error={errors.name?.message} required>
            <Input
              id="name"
              type="text"
              placeholder="Jane Smith"
              autoComplete="name"
              autoFocus
              error={!!errors.name}
              disabled={isSubmitting}
              {...register('name')}
            />
          </FormField>

          {/* Email */}
          <FormField label="Email" error={errors.email?.message} required>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              error={!!errors.email}
              disabled={isSubmitting}
              {...register('email')}
            />
          </FormField>

          {/* Password */}
          <FormField label="Password" error={errors.password?.message} required>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Min. 8 characters"
                autoComplete="new-password"
                error={!!errors.password}
                disabled={isSubmitting}
                className="pr-10"
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <PasswordStrengthIndicator password={passwordValue} />
          </FormField>

          {/* Confirm Password */}
          <FormField label="Confirm password" error={errors.confirmPassword?.message} required>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirm ? 'text' : 'password'}
                placeholder="Repeat your password"
                autoComplete="new-password"
                error={!!errors.confirmPassword}
                disabled={isSubmitting}
                className="pr-10"
                {...register('confirmPassword')}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                tabIndex={-1}
                aria-label={showConfirm ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </FormField>

          {/* Server error */}
          {serverError && (
            <p className="text-sm text-destructive">{serverError}</p>
          )}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? 'Creating account…' : 'Create account'}
          </Button>
        </form>

        {/* Login link */}
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-medium text-foreground underline underline-offset-4 hover:no-underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
