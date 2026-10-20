import { designConfigSchema, type TemplateId } from '../../shared/design'

export function readCreationConfig(templateId: TemplateId, value: unknown) {
  if (typeof value !== 'string' || value.length > 1200) return undefined
  try {
    const parsed = designConfigSchema.safeParse(JSON.parse(value))
    return parsed.success && parsed.data.templateId === templateId ? parsed.data : undefined
  } catch { return undefined }
}

/** Only resume known app destinations. Never use an untrusted redirect as a URL. */
export function safeReturnPath(value: unknown): string {
  if (typeof value !== 'string' || value.length > 1000 || /[\u0000-\u0020\u007f\\]/u.test(value)) return '/hub/home'
  try {
    const url = new URL(value, 'https://guigong.local')
    if (url.origin !== 'https://guigong.local' || `${url.pathname}${url.search}${url.hash}` !== value) return '/hub/home'
    if (!/^\/(?:atelier(?:\/[a-zA-Z0-9_-]+)?|hub\/(?:home|workshop|museum|works(?:\/[a-zA-Z0-9_-]+)?|studies\/[a-z-]+))$/.test(url.pathname)) return '/hub/home'
    return value
  } catch { return '/hub/home' }
}

export function loginPath(destination: string): string {
  return `/login?redirect=${encodeURIComponent(safeReturnPath(destination))}`
}
