const { z } = require('zod')

const VALID_ROLES = ['admin', 'member', 'viewer']
const CollaboratorRole = z.enum(['admin', 'member', 'viewer'])

const ListCollaboratorsQuery = z.object({
  status: z.enum(['pending', 'active', 'revoked']).optional(),
  role: CollaboratorRole.optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

const InviteCollaboratorBody = z.object({
  email: z.string({ required_error: 'email is required' }).email('email must be a valid email address'),
  role: CollaboratorRole.default('member'),
  name: z.string().trim().optional().nullable(),
})

const UpdateCollaboratorRoleBody = z.object({
  role: CollaboratorRole.refine((r) => VALID_ROLES.includes(r), {
    message: `role must be one of: ${VALID_ROLES.join(', ')}`,
  }),
})

const CollaboratorIdParams = z.object({
  id: z.coerce.number({ invalid_type_error: 'id must be a number' }).int().positive('id must be a positive integer'),
})

const PaginationQuery = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

module.exports = {
  ListCollaboratorsQuery,
  InviteCollaboratorBody,
  UpdateCollaboratorRoleBody,
  CollaboratorIdParams,
  PaginationQuery,
}
