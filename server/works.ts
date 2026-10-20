import { randomUUID } from 'node:crypto'
import type { DatabaseSync } from 'node:sqlite'
import type { z } from 'zod'
import { designConfigSchema, type Work } from '../shared/design.js'
import { ApiError } from './errors.js'
import { decodePreview } from './preview.js'
import { inspirationIdSchema } from '../shared/inspirations.js'
import type { createWorkSchema, duplicateWorkSchema, updateWorkSchema, workSearchSchema } from './validation.js'

function workFromRow(row: Record<string, unknown>): Work {
  return {
    id: String(row.id), title: String(row.title), description: String(row.description),
    config: designConfigSchema.parse(JSON.parse(String(row.config_json))), version: Number(row.version),
    createdAt: String(row.created_at), updatedAt: String(row.updated_at),
    deletedAt: row.deleted_at === null ? null : String(row.deleted_at),
    inspirationId: row.inspiration_id === null ? null : inspirationIdSchema.parse(row.inspiration_id),
    previewVersion: row.preview_version === row.version ? Number(row.preview_version) : null,
  }
}

export function createWorks(db: DatabaseSync, now: () => number) {
  function find(ownerId: string, id: string, activeOnly = true): Work {
    const row = db.prepare(`SELECT * FROM works WHERE id = ? AND owner_id = ? ${activeOnly ? 'AND deleted_at IS NULL' : ''}`).get(id, ownerId)
    if (!row) throw new ApiError(404, 'NOT_FOUND', '找不到这件作品')
    return workFromRow(row)
  }
  function requireVersion(work: Work, version: number, increments = false) {
    if (work.version !== version) throw new ApiError(409, 'VERSION_CONFLICT', '作品已在其他页面更新，请重新打开后再操作')
    if (increments && version >= Number.MAX_SAFE_INTEGER) throw new ApiError(409, 'VERSION_CONFLICT', '作品版本已达到上限，请复制为新作品')
  }
  function create(ownerId: string, input: z.infer<typeof createWorkSchema>): Work {
    const id = randomUUID()
    const time = new Date(now()).toISOString()
    db.prepare('INSERT INTO works(id, owner_id, title, description, config_json, version, created_at, updated_at, inspiration_id) VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)')
      .run(id, ownerId, input.title, input.description, JSON.stringify(input.config), time, time, input.inspirationId ?? null)
    return find(ownerId, id)
  }
  return {
    find, create,
    savePreview(ownerId: string, id: string, version: number, dataUrl: string): Work {
      // Decode outside the write lock; the version check and write stay atomic.
      const bytes = decodePreview(dataUrl)
      db.exec('BEGIN IMMEDIATE')
      try {
        requireVersion(find(ownerId, id), version)
        db.prepare(`INSERT INTO work_previews(work_id, version, image_png) VALUES (?, ?, ?)
          ON CONFLICT(work_id) DO UPDATE SET version = excluded.version, image_png = excluded.image_png`).run(id, version, bytes)
        db.prepare('UPDATE works SET preview_version = ? WHERE id = ? AND owner_id = ?').run(version, id, ownerId)
        const result = find(ownerId, id)
        db.exec('COMMIT')
        return result
      } catch (error) { db.exec('ROLLBACK'); throw error }
    },
    preview(ownerId: string, id: string, version: number): Buffer {
      // A single owner-scoped read prevents old bytes escaping during a racing save.
      const row = db.prepare(`SELECT p.image_png FROM work_previews p JOIN works w ON w.id = p.work_id
        WHERE w.id = ? AND w.owner_id = ? AND w.deleted_at IS NULL
          AND w.version = ? AND w.preview_version = w.version AND p.version = w.version`).get(id, ownerId, version)
      if (!row) throw new ApiError(404, 'NOT_FOUND', '当前版本尚无作品预览')
      return Buffer.from(row.image_png as Uint8Array)
    },
    list(ownerId: string, { search, state, page, pageSize }: z.infer<typeof workSearchSchema>) {
      const filter = `owner_id = ? AND deleted_at IS ${state === 'active' ? '' : 'NOT '}NULL AND (instr(title, ?) > 0 OR instr(description, ?) > 0)`
      // One read transaction keeps count and page consistent with other processes.
      db.exec('BEGIN')
      try {
        const total = Number(db.prepare(`SELECT count(*) AS total FROM works WHERE ${filter}`).get(ownerId, search, search)!.total)
        const rows = db.prepare(`SELECT * FROM works WHERE ${filter} ORDER BY updated_at DESC, id DESC LIMIT ? OFFSET ?`)
          .all(ownerId, search, search, pageSize, (page - 1) * pageSize)
        const works = rows.map(workFromRow)
        db.exec('COMMIT')
        return { works, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } }
      } catch (error) { db.exec('ROLLBACK'); throw error }
    },
    update(ownerId: string, id: string, input: z.infer<typeof updateWorkSchema>): Work {
      const source = find(ownerId, id)
      requireVersion(source, input.version, true)
      db.prepare(`UPDATE works SET title = ?, description = ?, config_json = ?, inspiration_id = ?, preview_version = NULL, version = version + 1, updated_at = ?
        WHERE id = ? AND owner_id = ? AND version = ? AND deleted_at IS NULL`)
        .run(input.title, input.description, JSON.stringify(input.config), input.inspirationId === undefined ? source.inspirationId : input.inspirationId, new Date(now()).toISOString(), id, ownerId, input.version)
      return find(ownerId, id)
    },
    duplicate(ownerId: string, id: string, input: z.infer<typeof duplicateWorkSchema>): Work {
      const source = find(ownerId, id)
      requireVersion(source, input.version)
      let title = source.title.slice(0, 76)
      // A default-title boundary may split a surrogate pair. Preserve valid text.
      if (/[\uD800-\uDBFF]$/.test(title)) title = title.slice(0, -1)
      const copy = create(ownerId, { title: input.title ?? `${title}（副本）`, description: source.description, config: source.config, inspirationId: source.inspirationId })
      if (source.previewVersion === source.version) {
        const cloned = db.prepare('INSERT INTO work_previews(work_id, version, image_png) SELECT ?, 1, image_png FROM work_previews WHERE work_id = ? AND version = ?')
          .run(copy.id, source.id, source.version)
        if (cloned.changes) db.prepare('UPDATE works SET preview_version = 1 WHERE id = ?').run(copy.id)
      }
      return find(ownerId, copy.id)
    },
    changeState(ownerId: string, id: string, version: number, state: 'trash' | 'active'): Work {
      const source = find(ownerId, id, false)
      requireVersion(source, version, true)
      if ((source.deletedAt !== null) === (state === 'trash')) {
        throw new ApiError(409, 'WORK_STATE_CONFLICT', state === 'trash' ? '作品已在回收站中' : '作品已恢复，请刷新列表')
      }
      const time = new Date(now()).toISOString()
      const preview = source.previewVersion === version
        ? db.prepare('UPDATE work_previews SET version = ? WHERE work_id = ? AND version = ?').run(version + 1, id, version).changes > 0 : false
      db.prepare('UPDATE works SET deleted_at = ?, version = version + 1, preview_version = ?, updated_at = ? WHERE id = ? AND owner_id = ? AND version = ?')
        .run(state === 'trash' ? time : null, preview ? version + 1 : null, time, id, ownerId, version)
      return find(ownerId, id, false)
    },
  }
}
