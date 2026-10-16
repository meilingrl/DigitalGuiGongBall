import { z } from 'zod'
import { designConfigSchema, type DesignConfig } from '../../shared/design'

/** The browser adapter is injected so unavailable/blocked storage never crashes editing. */
export interface StorageLike {
  readonly length: number
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
  key(index: number): string | null
}

export interface PendingSave {
  key: string
  method: 'POST' | 'PUT'
  path: string
  body: { title: string; description: string; config: DesignConfig; version?: number }
  snapshot: string
}

export interface DraftRecord {
  schemaVersion: 1
  userId: string
  target: string
  title: string
  description: string
  config: DesignConfig
  baseVersion: number | null
  updatedAt: number
  pendingSave: PendingSave | null
}

const namespace = 'guigong:drafts:v1:'
const maxBytes = 16 * 1024
const maxDrafts = 20
const lifetime = 7 * 24 * 60 * 60 * 1000
const clockSkew = 5 * 60 * 1000
const encoder = new TextEncoder()
const unavailable = '无法使用此设备草稿存储，请保留当前页面内容并保存到服务端。'
const invalidRecord = '已忽略此设备中损坏、过期或不符合限制的草稿。'
const invalidWrite = '此设备草稿格式或大小不符合限制，未写入本机。'
const failedWrite = '此设备草稿未能完整写入，请检查浏览器存储空间并保留当前页面内容。'
const pruned = '此账号的设备草稿已达上限，已清理最旧草稿。'

const userIdSchema = z.string().min(1).max(128).regex(/^[^\u0000-\u001f\u007f]+$/u)
const targetSchema = z.string().max(133).regex(/^(?:new:(?:linglong|ruyi|lianhua)|work:[a-zA-Z0-9][a-zA-Z0-9_-]{0,127})$/)
const versionSchema = z.number().int().positive().max(Number.MAX_SAFE_INTEGER)
const timestampSchema = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER)
const titleSchema = z.string().max(80).regex(/^[^\u0000]*$/u)
const descriptionSchema = z.string().max(1000).regex(/^[^\u0000]*$/u)
const snapshotSchema = z.strictObject({ title: titleSchema, description: descriptionSchema, config: designConfigSchema })
const bodySchema = snapshotSchema.extend({ title: titleSchema.refine(title => title.trim().length > 0) })
const requestFields = {
  key: z.string().uuid(),
  path: z.string().max(160),
  snapshot: z.string().max(maxBytes),
}
const pendingSchema = z.discriminatedUnion('method', [
  z.strictObject({ ...requestFields, method: z.literal('POST'), body: bodySchema }),
  z.strictObject({ ...requestFields, method: z.literal('PUT'), body: bodySchema.extend({ version: versionSchema }) }),
])
const recordSchema = z.strictObject({
  schemaVersion: z.literal(1), userId: userIdSchema, target: targetSchema,
  title: titleSchema, description: descriptionSchema, config: designConfigSchema,
  baseVersion: versionSchema.nullable(), updatedAt: timestampSchema, pendingSave: pendingSchema.nullable(),
})

function prefixFor(userId: string): string {
  return `${namespace}${encodeURIComponent(userId)}:`
}

function keyFor(userId: string, target: string): string {
  return prefixFor(userId) + encodeURIComponent(target)
}

function validUser(userId: string): boolean {
  if (!userIdSchema.safeParse(userId).success) return false
  // encodeURIComponent rejects malformed Unicode. Reject before accessing any storage.
  try { encodeURIComponent(userId); return true } catch { return false }
}

function validIdentity(userId: string, target: string): boolean {
  return validUser(userId) && targetSchema.safeParse(target).success
}

function validClock(now: number): boolean {
  return timestampSchema.safeParse(now).success
}

function parseRecord(input: unknown, userId: string, target: string, now: number): DraftRecord | null {
  // Zod produces a plain independent clone, including when passed Vue reactive objects.
  const parsed = recordSchema.safeParse(input)
  if (!parsed.success) return null
  const value = parsed.data
  if (value.userId !== userId || value.target !== target || value.updatedAt <= now - lifetime || value.updatedAt > now + clockSkew) return null
  const request = value.pendingSave
  if (request) {
    if (request.method === 'POST') {
      if (!target.startsWith('new:') || request.path !== '/api/works') return null
    } else if (!target.startsWith('work:') || request.path !== `/api/works/${target.slice(5)}`) return null
    let snapshot: z.infer<typeof snapshotSchema>
    try { snapshot = snapshotSchema.parse(JSON.parse(request.snapshot)) } catch { return null }
    // Keep the raw snapshot for dirty tracking, but compare to the normalized API body.
    if (snapshot.title.trim() !== request.body.title || snapshot.description.trim() !== request.body.description
      || JSON.stringify(snapshot.config) !== JSON.stringify(request.body.config)) return null
  }
  return value
}

type ReadResult = { draft: DraftRecord | null; notice?: string; failed?: boolean }

function discard(storage: StorageLike, key: string): ReadResult {
  try {
    storage.removeItem(key)
    return { draft: null, notice: invalidRecord }
  } catch {
    return { draft: null, notice: unavailable, failed: true }
  }
}

function readOwned(storage: StorageLike, userId: string, target: string, now: number): ReadResult {
  const key = keyFor(userId, target)
  let raw: string | null
  try { raw = storage.getItem(key) } catch { return { draft: null, notice: unavailable, failed: true } }
  if (raw === null) return { draft: null }
  if (encoder.encode(raw).length > maxBytes) return discard(storage, key)
  let value: DraftRecord | null
  try { value = parseRecord(JSON.parse(raw), userId, target, now) } catch { value = null }
  return value ? { draft: value } : discard(storage, key)
}

type ScanResult = { drafts: DraftRecord[]; notice?: string; failed: boolean }

/** Enumerate key names globally, but never read a value outside this account's exact prefix. */
function scanOwned(storage: StorageLike, userId: string, now: number): ScanResult {
  const result: ScanResult = { drafts: [], failed: false }
  const prefix = prefixFor(userId)
  const keys = new Set<string>()
  try {
    // Snapshot before removing invalid records; Web Storage indices change after removal.
    const length = storage.length
    for (let index = 0; index < length; index++) {
      const key = storage.key(index)
      if (key?.startsWith(prefix)) keys.add(key)
    }
  } catch { return { ...result, notice: unavailable, failed: true } }
  for (const key of keys) {
    let target: string
    try { target = decodeURIComponent(key.slice(prefix.length)) } catch { target = '' }
    const item = targetSchema.safeParse(target).success && keyFor(userId, target) === key
      ? readOwned(storage, userId, target, now)
      : discard(storage, key)
    if (item.draft) result.drafts.push(item.draft)
    if (item.notice && !result.failed) result.notice = item.notice
    if (item.failed) result.failed = true
  }
  return result
}

function oldestFirst(a: DraftRecord, b: DraftRecord): number {
  return a.updatedAt - b.updatedAt || (a.target < b.target ? -1 : a.target > b.target ? 1 : 0)
}

/** Recovery is local to this device; reading never means that the work reached the server. */
export function readDraft(storage: StorageLike | undefined, userId: string, target: string, now = Date.now()): { draft: DraftRecord | null; notice?: string } {
  if (!validIdentity(userId, target) || !validClock(now)) return { draft: null, notice: invalidRecord }
  if (!storage) return { draft: null, notice: unavailable }
  const result = readOwned(storage, userId, target, now)
  return result.notice ? { draft: result.draft, notice: result.notice } : { draft: result.draft }
}

/** The caller supplies updatedAt; writing does not alter the editor or a pending request. */
export function writeDraft(storage: StorageLike | undefined, draft: DraftRecord, now = Date.now()): { ok: boolean; notice?: string } {
  let value: DraftRecord | null
  let serialized: string
  try {
    if (!validClock(now) || !validIdentity(draft.userId, draft.target)) return { ok: false, notice: invalidWrite }
    value = parseRecord(draft, draft.userId, draft.target, now)
    if (!value) return { ok: false, notice: invalidWrite }
    serialized = JSON.stringify(value)
    if (encoder.encode(serialized).length > maxBytes) return { ok: false, notice: invalidWrite }
  } catch { return { ok: false, notice: invalidWrite } }
  if (!storage) return { ok: false, notice: unavailable }
  const existing = scanOwned(storage, value.userId, now)
  if (existing.failed) return { ok: false, notice: existing.notice ?? unavailable }
  const others = existing.drafts.filter(item => item.target !== value.target).sort(oldestFirst)
  const victims = others.slice(0, Math.max(0, others.length + 1 - maxDrafts))
  try {
    // Preserve the previous recoverable target and valid older drafts if setItem fails.
    storage.setItem(keyFor(value.userId, value.target), serialized)
    for (const victim of victims) storage.removeItem(keyFor(value.userId, victim.target))
  } catch { return { ok: false, notice: failedWrite } }
  const notice = victims.length ? pruned : existing.notice
  return notice ? { ok: true, notice } : { ok: true }
}

export function removeDraft(storage: StorageLike | undefined, userId: string, target: string): { ok: boolean; notice?: string } {
  if (!validIdentity(userId, target)) return { ok: false, notice: invalidRecord }
  if (!storage) return { ok: false, notice: unavailable }
  try {
    storage.removeItem(keyFor(userId, target))
    return { ok: true }
  } catch { return { ok: false, notice: unavailable } }
}

export function listDrafts(storage: StorageLike | undefined, userId: string, now = Date.now()): { drafts: DraftRecord[]; notice?: string } {
  if (!validUser(userId) || !validClock(now)) return { drafts: [], notice: invalidRecord }
  if (!storage) return { drafts: [], notice: unavailable }
  const result = scanOwned(storage, userId, now)
  const ordered = result.drafts.sort(oldestFirst)
  const excess = ordered.slice(0, Math.max(0, ordered.length - maxDrafts))
  if (!result.failed) {
    for (const victim of excess) {
      try {
        storage.removeItem(keyFor(userId, victim.target))
        ordered.shift()
      } catch {
        result.failed = true
        result.notice = unavailable
        break
      }
    }
    if (excess.length && !result.failed) result.notice = pruned
  }
  const drafts = ordered.reverse()
  return result.notice ? { drafts, notice: result.notice } : { drafts }
}
