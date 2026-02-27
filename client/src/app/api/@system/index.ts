// @system — core API calls (auth, user, subscriptions, sessions)
// Do not modify this file. Add product-specific calls in @custom/

import { apiRequest } from './utils'

// ─── Auth / User ────────────────────────────────────────────────────────────

export const register = (data: { name: string; email: string; password: string }) =>
  apiRequest.post('/users', data)

export const login = (data: { email: string; password: string }) =>
  apiRequest.post<{ bearerToken: string; id: number }>('/users/login', data)

export const auth = () =>
  apiRequest.post('/users/auth')

export const requestResetPassword = (data: { email: string }) =>
  apiRequest.post('/users/password/request', data)

export const resetPassword = (data: { token: string; password: string }) =>
  apiRequest.post('/users/password/reset', data)

export const editUser = (data: { email?: string; name?: string }) =>
  apiRequest.post('/users/edit', data)

// ─── Sessions ────────────────────────────────────────────────────────────────

export interface Session {
  id: number
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
  expiresAt: string
  isCurrent: boolean
}

export const getSessions = () =>
  apiRequest.get<{ sessions: Session[] }>('/sessions')

export const revokeSession = (id: number) =>
  apiRequest.delete<{ message: string }>(`/sessions/${id}`)

// ─── Subscriptions ───────────────────────────────────────────────────────────

export const getSubscriptions = () =>
  apiRequest.get('/subscriptions')

export const getAvailablePlans = (params?: { showYearly?: boolean }) => {
  const qs = params?.showYearly ? '?showYearly=true' : ''
  return apiRequest.get(`/subscriptions/plans${qs}`)
}

export const handleSubscriptionCancellation = (data: {
  subscriptionId: string
  type: string
  reason?: string
  selectedPlan?: string
}) => apiRequest.post('/subscriptions/cancellation-flow', data)

export const upgradeSubscription = (data: { subscriptionId: string; newPriceId: string }) =>
  apiRequest.post('/subscriptions/upgrade', data)

export const uncancelSubscription = (data: { subscriptionId: string }) =>
  apiRequest.post('/subscriptions/uncancel', data)
