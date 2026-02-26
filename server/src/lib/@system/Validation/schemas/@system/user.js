const { z } = require('zod')

const RegisterBody = z.object({
  email: z.string({ required_error: 'email is required' }).email('email must be a valid email address'),
  password: z.string({ required_error: 'password is required' }).min(1, 'password is required'),
  name: z.string().trim().optional(),
})

const UpdateProfileBody = z.object({
  name: z.string().trim().min(1, 'name must be a non-empty string').optional(),
})

const ChangePasswordBody = z.object({
  currentPassword: z.string({ required_error: 'currentPassword is required' }).min(1, 'currentPassword is required'),
  newPassword: z.string({ required_error: 'newPassword is required' }).min(1, 'newPassword is required'),
})

const PasswordResetRequestBody = z.object({
  email: z.string({ required_error: 'email is required' }).email('email must be a valid email address'),
})

const PasswordResetBody = z.object({
  token: z.string({ required_error: 'token is required' }).min(1, 'token is required'),
  password: z.string({ required_error: 'password is required' }).min(1, 'password is required'),
})

const VerifyEmailBody = z.object({
  token: z.string({ required_error: 'token is required' }).min(1, 'token is required'),
})

module.exports = {
  RegisterBody,
  UpdateProfileBody,
  ChangePasswordBody,
  PasswordResetRequestBody,
  PasswordResetBody,
  VerifyEmailBody,
}
