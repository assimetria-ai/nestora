const { z } = require('zod')

const ListUsersQuery = z.object({
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
})

const UserIdParams = z.object({
  id: z.coerce.number({ invalid_type_error: 'id must be a number' }).int().positive('id must be a positive integer'),
})

const UpdateUserRoleBody = z.object({
  role: z.enum(['user', 'admin'], { required_error: 'role is required', invalid_type_error: 'role must be "user" or "admin"' }),
})

const ListSubscriptionsQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  status: z.enum(['active', 'canceled', 'past_due', 'trialing', 'incomplete', 'incomplete_expired', 'unpaid']).optional(),
})

module.exports = { ListUsersQuery, UserIdParams, UpdateUserRoleBody, ListSubscriptionsQuery }
