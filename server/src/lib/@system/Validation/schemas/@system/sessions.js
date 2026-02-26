const { z } = require('zod')

const LoginBody = z.object({
  email: z.string({ required_error: 'email is required' }).email('email must be a valid email address'),
  password: z.string({ required_error: 'password is required' }).min(1, 'password is required'),
  totpCode: z.union([z.string(), z.number()]).optional(),
})

const DeleteSessionParams = z.object({
  id: z.coerce.number({ invalid_type_error: 'id must be a number' }).int().positive('id must be a positive integer'),
})

module.exports = { LoginBody, DeleteSessionParams }
