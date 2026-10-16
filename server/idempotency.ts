import { createHash } from 'node:crypto'
import type { DatabaseSync } from 'node:sqlite'
import { z } from 'zod'
import type { Work } from '../shared/design.js'
import { ApiError } from './errors.js'

export interface MutationResult {
  status: number
  body: { work: Work }
}

function canonicalValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalValue)
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
      .map(([key, entry]) => [key, canonicalValue(entry)]))
  }
  return value
}

export function parseIdempotencyKey(header: string | undefined): string | undefined {
  if (header === undefined) return undefined
  if (!z.uuid().safeParse(header).success) {
    throw new ApiError(400, 'INVALID_IDEMPOTENCY_KEY', '请求标识必须是 UUID，请重新发起操作')
  }
  return header.toLowerCase()
}

// The callback and its response journal share the same synchronous write transaction.
// Replays return the saved snapshot before checking today's work version or state.
export function executeMutation(db: DatabaseSync, request: {
  ownerId: string; key: string | undefined; method: string; path: string; input: object; now: () => number
}, mutation: () => MutationResult): MutationResult {
  const bodyHash = createHash('sha256').update(JSON.stringify(canonicalValue(request.input))).digest('hex')
  db.exec('BEGIN IMMEDIATE')
  try {
    if (request.key !== undefined) {
      const previous = db.prepare('SELECT method, path, body_hash, status, response_json FROM mutation_journal WHERE owner_id = ? AND key = ?')
        .get(request.ownerId, request.key)
      if (previous) {
        if (previous.method !== request.method || previous.path !== request.path || previous.body_hash !== bodyHash) {
          throw new ApiError(409, 'IDEMPOTENCY_CONFLICT', '这个请求标识已用于其他操作，请刷新后重试')
        }
        const replay = { status: Number(previous.status), body: JSON.parse(String(previous.response_json)) as MutationResult['body'] }
        db.exec('COMMIT')
        return replay
      }
    }
    const result = mutation()
    if (request.key !== undefined) {
      db.prepare(`INSERT INTO mutation_journal(owner_id, key, method, path, body_hash, status, response_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(request.ownerId, request.key, request.method, request.path, bodyHash, result.status, JSON.stringify(result.body), new Date(request.now()).toISOString())
    }
    db.exec('COMMIT')
    return result
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}
