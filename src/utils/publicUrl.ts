/**
 * 将「相对于项目 public 目录」的资源路径转为浏览器可请求的 URL。
 *
 * - 支持 Vite `base` 子路径部署（如 GitHub Pages），避免 `/materials/...` 落到站点根目录 404。
 * - 数据里可写 `materials/a.webp`、`/materials/a.webp` 或完整 `https://...`。
 */
export function resolvePublicUrl(path: string | undefined): string | undefined {
  if (path == null || path === '') return undefined
  const trimmed = path.trim()
  if (/^https?:\/\//i.test(trimmed)) return trimmed

  const relative = trimmed.replace(/^\/+/, '')
  const base = import.meta.env.BASE_URL || '/'
  if (base === '/' || base === '') return `/${relative}`

  const normalizedBase = base.endsWith('/') ? base.slice(0, -1) : base
  return `${normalizedBase}/${relative}`
}
