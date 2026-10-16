import { z } from 'zod'
import type { StorageLike } from './drafts'

export interface PendingAction {
  action: 'duplicate' | 'trash' | 'restore'
  id: string
  title: string
  version: number
  key: string
}

const namespace = 'guigong:collection-pending:v1:'
const maxBytes = 4 * 1024
const lifetime = 7 * 24 * 60 * 60 * 1000
const clockSkew = 5 * 60 * 1000
const encoder = new TextEncoder()
const unavailable = '无法使用此设备的待确认操作存储，请保留页面并确认服务端操作结果。'
const invalidRecord = '已忽略此设备中损坏、过期或不符合限制的待确认操作。'
const invalidWrite = '待确认操作格式或大小不符合限制，未写入本机。'
const failedWrite = '待确认操作未能写入本机，请检查浏览器存储空间并保留当前页面。'

const userIdSchema = z.string().min(1).max(128).refine(value => !/[\u0000-\u001f\u007f]/u.test(value))
const timestampSchema = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER)
const actionSchema = z.strictObject({
  action: z.enum(['duplicate', 'trash', 'restore']),
  id: z.string().min(1).max(128).regex(/^[a-zA-Z0-9_-]+$/),
  title: z.string().min(1).max(80).refine(value => !value.includes('\u0000')),
  version: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  key: z.string().uuid(),
})
const recordSchema = z.strictObject({
  schemaVersion: z.literal(1), userId: userIdSchema, updatedAt: timestampSchema, attempt: actionSchema,
})

function keyFor(userId: string): string | null {
  if (!userIdSchema.safeParse(userId).success) return null
  // Reject malformed Unicode before attempting any storage access.
  try { return namespace + encodeURIComponent(userId) } catch { return null }
}

function discard(storage: StorageLike, key: string): { attempt: null; notice: string } {
  try {
    storage.removeItem(key)
    return { attempt: null, notice: invalidRecord }
  } catch {
    return { attempt: null, notice: unavailable }
  }
}

/** This restores an unacknowledged API attempt, never proof of server success. */
export function readPendingAction(storage: StorageLike | undefined, userId: string, now = Date.now()): { attempt: PendingAction | null; notice?: string } {
  const key = keyFor(userId)
  if (!key || !timestampSchema.safeParse(now).success) return { attempt: null, notice: invalidRecord }
  if (!storage) return { attempt: null, notice: unavailable }
  let raw: string | null
  try { raw = storage.getItem(key) } catch { return { attempt: null, notice: unavailable } }
  if (raw === null) return { attempt: null }
  if (encoder.encode(raw).length > maxBytes) return discard(storage, key)
  try {
    const parsed = recordSchema.safeParse(JSON.parse(raw))
    if (parsed.success && parsed.data.userId === userId && parsed.data.updatedAt > now - lifetime && parsed.data.updatedAt <= now + clockSkew) {
      return { attempt: parsed.data.attempt }
    }
  } catch { /* Invalid JSON is never retried as an API request. */ }
  return discard(storage, key)
}

/** Preserve the exact key and payload; setItem failure retains the previous record. */
export function writePendingAction(storage: StorageLike | undefined, userId: string, attempt: PendingAction, now = Date.now()): { ok: boolean; notice?: string } {
  const key = keyFor(userId)
  if (!key) return { ok: false, notice: invalidWrite }
  let serialized: string
  try {
    // Zod clones reactive input without normalizing immutable request fields.
    const parsed = recordSchema.safeParse({ schemaVersion: 1, userId, updatedAt: now, attempt })
    if (!parsed.success) return { ok: false, notice: invalidWrite }
    serialized = JSON.stringify(parsed.data)
    if (encoder.encode(serialized).length > maxBytes) return { ok: false, notice: invalidWrite }
  } catch { return { ok: false, notice: invalidWrite } }
  if (!storage) return { ok: false, notice: unavailable }
  try {
    storage.setItem(key, serialized)
    return { ok: true }
  } catch { return { ok: false, notice: failedWrite } }
}

export function removePendingAction(storage: StorageLike | undefined, userId: string): { ok: boolean; notice?: string } {
  const key = keyFor(userId)
  if (!key) return { ok: false, notice: invalidRecord }
  if (!storage) return { ok: false, notice: unavailable }
  try {
    storage.removeItem(key)
    return { ok: true }
  } catch { return { ok: false, notice: unavailable } }
}
