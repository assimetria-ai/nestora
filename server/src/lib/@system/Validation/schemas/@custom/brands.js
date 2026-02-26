const { z } = require('zod')

const HexColor = z.string().regex(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/, 'must be a valid hex color (e.g. #FF5733)')

const CreateBrandBody = z.object({
  name: z.string({ required_error: 'name is required' }).trim().min(1, 'name is required'),
  description: z.string().optional().nullable(),
  website_url: z.string().url('website_url must be a valid URL').optional().nullable(),
  primary_color: HexColor.optional().nullable(),
  secondary_color: HexColor.optional().nullable(),
})

const UpdateBrandBody = z.object({
  name: z.string().trim().min(1, 'name must be a non-empty string').optional(),
  description: z.string().optional().nullable(),
  website_url: z.string().url('website_url must be a valid URL').optional().nullable(),
  primary_color: HexColor.optional().nullable(),
  secondary_color: HexColor.optional().nullable(),
  status: z.enum(['active', 'inactive', 'archived']).optional(),
})

const UploadLogoBody = z.object({
  logo: z
    .string({ required_error: 'logo field (base64 data URL) is required' })
    .regex(
      /^data:image\/(png|jpeg|jpg|gif|webp|svg\+xml);base64,/,
      'logo must be a valid image data URL (png, jpeg, gif, webp, svg)'
    )
    .refine((v) => v.length <= 2_100_000, 'Logo file too large. Maximum size is ~1.5 MB.'),
})

const BrandIdParams = z.object({
  id: z.coerce.number({ invalid_type_error: 'id must be a number' }).int().positive('id must be a positive integer'),
})

const PaginationQuery = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

module.exports = { CreateBrandBody, UpdateBrandBody, UploadLogoBody, BrandIdParams, PaginationQuery }
