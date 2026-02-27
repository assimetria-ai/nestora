// @custom — Nestora product config
import type { info as SystemInfo } from '../@system/info'

export const customInfo: Partial<typeof SystemInfo> = {
  name: 'Nestora',
  tagline: 'Find your somewhere.',
  url: import.meta.env.VITE_APP_URL ?? 'https://nestora.com',
  supportEmail: 'support@nestora.com',
}
