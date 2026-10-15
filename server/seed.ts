import type { DatabaseSync } from 'node:sqlite'
import { defaultConfigs } from '../shared/design.js'
import { hashPassword } from './auth.js'

// Public local demonstration credential. This account is never created by ordinary startup.
export const demoCredentials = { username: 'demo', password: 'Guigong2026!' } as const

export async function seedDatabase(db: DatabaseSync): Promise<{ accountCreated: boolean }> {
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(demoCredentials.username)
  const passwordHash = existing ? undefined : await hashPassword(demoCredentials.password)
  const time = new Date().toISOString()
  let accountCreated = false
  db.exec('BEGIN IMMEDIATE')
  try {
    if (passwordHash) {
      const inserted = db.prepare(`INSERT INTO users(id, username, display_name, password_hash, created_at)
        VALUES('demo-user', ?, '体验创作者', ?, ?) ON CONFLICT(username) DO NOTHING`)
        .run(demoCredentials.username, passwordHash, time)
      accountCreated = inserted.changes === 1
    }
    const owner = db.prepare('SELECT id FROM users WHERE username = ?').get(demoCredentials.username)!
    const insert = db.prepare(`INSERT INTO works(id, owner_id, title, description, config_json, version, created_at, updated_at)
      VALUES(?, ?, ?, ?, ?, 1, ?, ?) ON CONFLICT(id) DO NOTHING`)
    insert.run('demo-linglong', String(owner.id), '玲珑 · 初见', '四层同心结构，试着展开观察球体内部。', JSON.stringify(defaultConfigs.linglong), time, time)
    insert.run('demo-ruyi', String(owner.id), '如意 · 青玉', '青玉色的三层如意球，探索开孔与光影。', JSON.stringify(defaultConfigs.ruyi), time, time)
    db.exec('COMMIT')
  } catch (error) { db.exec('ROLLBACK'); throw error }
  return { accountCreated }
}
