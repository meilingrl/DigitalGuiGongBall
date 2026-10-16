import { randomUUID } from 'node:crypto'
import type { DatabaseSync } from 'node:sqlite'
import type { z } from 'zod'
import { designConfigSchema, type Work } from '../shared/design.js'
import { ApiError } from './errors.js'
import type { createWorkSchema, duplicateWorkSchema, updateWorkSchema, workSearchSchema } from './validation.js'

function workFromRow(row: Record<string, unknown>): Work {
  return {
    id: String(row.id), title: String(row.title), description: String(row.description),
    config: designConfigSchema.parse(JSON.parse(String(row.config_json))), version: Number(row.version),
    createdAt: String(row.created_at), updatedAt: String(row.updated_at),
    deletedAt: row.deleted_at === null ? null : String(row.deleted_at),
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
    db.prepare('INSERT INTO works(id, owner_id, title, description, config_json, version, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?)')
      .run(id, ownerId, input.title, input.description, JSON.stringify(input.config), time, time)
    return { id, ...input, version: 1, createdAt: time, updatedAt: time, deletedAt: null }
  }
  return {
    find, create,
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
      requireVersion(find(ownerId, id), input.version, true)
      db.prepare(`UPDATE works SET title = ?, description = ?, config_json = ?, version = version + 1, updated_at = ?
        WHERE id = ? AND owner_id = ? AND version = ? AND deleted_at IS NULL`)
        .run(input.title, input.description, JSON.stringify(input.config), new Date(now()).toISOString(), id, ownerId, input.version)
      return find(ownerId, id)
    },
    duplicate(ownerId: string, id: string, input: z.infer<typeof duplicateWorkSchema>): Work {
      const source = find(ownerId, id)
      requireVersion(source, input.version)
      let title = source.title.slice(0, 76)
      // A default-title boundary may split a surrogate pair. Preserve valid text.
      if (/[\uD800-\uDBFF]$/.test(title)) title = title.slice(0, -1)
      return create(ownerId, { title: input.title ?? `${title}（副本）`, description: source.description, config: source.config })
    },
    changeState(ownerId: string, id: string, version: number, state: 'trash' | 'active'): Work {
      const source = find(ownerId, id, false)
      requireVersion(source, version, true)
      if ((source.deletedAt !== null) === (state === 'trash')) {
        throw new ApiError(409, 'WORK_STATE_CONFLICT', state === 'trash' ? '作品已在回收站中' : '作品已恢复，请刷新列表')
      }
      const time = new Date(now()).toISOString()
      db.prepare('UPDATE works SET deleted_at = ?, version = version + 1, updated_at = ? WHERE id = ? AND owner_id = ? AND version = ?')
        .run(state === 'trash' ? time : null, time, id, ownerId, version)
      return find(ownerId, id, false)
    },
  }
}
