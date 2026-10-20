import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { execFileSync } from 'node:child_process'
import { openDatabase } from '../database.js'
import { seedDatabase } from '../seed.js'
import { hashPassword, verifyPassword } from '../auth.js'
import { designConfigSchema } from '../../shared/design.js'
import { validatePng } from '../preview.js'

test('seeds one demo account and two valid works idempotently without resetting edited work or password', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'guigong-seed-'))
  const path = join(directory, 'seed.sqlite')
  let db = openDatabase(path)
  try {
    const first = await seedDatabase(db)
    assert.equal(first?.accountCreated, true)
    assert.equal(db.prepare('SELECT count(*) AS count FROM users').get()!.count, 1)
    assert.equal(db.prepare('SELECT count(*) AS count FROM works').get()!.count, 2)
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get('demo')!
    const passwordHash = String(user.password_hash)
    assert.notEqual(passwordHash, 'Guigong2026!')
    assert.equal(await verifyPassword('Guigong2026!', passwordHash), true)
    assert.equal(await verifyPassword('wrong-password', passwordHash), false)
    for (const row of db.prepare('SELECT * FROM works').all()) {
      assert.equal(row.owner_id, user.id)
      assert.equal(designConfigSchema.safeParse(JSON.parse(String(row.config_json))).success, true)
    }
    db.prepare('UPDATE works SET title = ?, version = 2 WHERE id = ?').run('用户修改后的示例', 'demo-linglong')
    const again = await seedDatabase(db)
    assert.equal(again?.accountCreated, false)
    db.close()
    db = openDatabase(path)
    await seedDatabase(db)
    assert.equal(db.prepare('SELECT count(*) AS count FROM users').get()!.count, 1)
    assert.equal(db.prepare('SELECT count(*) AS count FROM works').get()!.count, 2)
    assert.equal(db.prepare('SELECT password_hash FROM users WHERE id = ?').get(user.id as string)!.password_hash, passwordHash)
    assert.equal(db.prepare('SELECT title FROM works WHERE id = ?').get('demo-linglong')!.title, '用户修改后的示例')
    assert.equal(db.prepare('SELECT count(*) AS count FROM schema_migrations').get()!.count, 3)
  } finally { db.close(); await rm(directory, { recursive: true, force: true }) }
})

test('CLI advertises a demo credential only when it creates that account and preserves an existing custom password', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'guigong-cli-'))
  const path = join(directory, 'demo.sqlite')
  const env = { ...process.env, DATABASE_PATH: path }
  const cli = () => execFileSync(process.execPath, ['--import', 'tsx', 'server/cli.ts', 'seed'], { env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  try {
    assert.match(cli(), /Guigong2026!/)
    const customPassword = 'custom-demo-password'
    let db = openDatabase(path)
    try { db.prepare('UPDATE users SET password_hash = ? WHERE username = ?').run(await hashPassword(customPassword), 'demo') }
    finally { db.close() }
    const existing = cli()
    assert.doesNotMatch(existing, /Guigong2026!/)
    assert.doesNotMatch(existing, /custom-demo-password/)
    db = openDatabase(path)
    try {
      const stored = String(db.prepare('SELECT password_hash FROM users WHERE username = ?').get('demo')!.password_hash)
      assert.equal(await verifyPassword(customPassword, stored), true)
      assert.equal(await verifyPassword('Guigong2026!', stored), false)
      assert.equal(db.prepare('SELECT count(*) AS count FROM works').get()!.count, 2)
    } finally { db.close() }
  } finally { await rm(directory, { recursive: true, force: true }) }
})

test('demo previews are real PNGs and reseeding never replaces a custom preview or edited configuration', async () => {
  const db = openDatabase(':memory:')
  try {
    await seedDatabase(db)
    const previews = db.prepare('SELECT * FROM work_previews ORDER BY work_id').all()
    assert.equal(previews.length, 2)
    for (const preview of previews) {
      assert.ok(validatePng(Buffer.from(preview.image_png as Uint8Array)).length > 1000)
      assert.equal(preview.version, 1)
      assert.equal(db.prepare('SELECT preview_version FROM works WHERE id=?').get(String(preview.work_id))!.preview_version, 1)
    }
    const custom = Buffer.from(previews[1]!.image_png as Uint8Array)
    db.prepare('UPDATE work_previews SET image_png=? WHERE work_id=?').run(custom, 'demo-linglong')
    await seedDatabase(db)
    assert.deepEqual(Buffer.from(db.prepare('SELECT image_png FROM work_previews WHERE work_id=?').get('demo-linglong')!.image_png as Uint8Array), custom)
    db.prepare('UPDATE works SET version=2,preview_version=NULL WHERE id=?').run('demo-linglong')
    const edited = { ...JSON.parse(String(db.prepare('SELECT config_json FROM works WHERE id=?').get('demo-ruyi')!.config_json)), layers: 4 }
    db.prepare('UPDATE works SET config_json=?,preview_version=NULL WHERE id=?').run(JSON.stringify(edited), 'demo-ruyi')
    await seedDatabase(db)
    assert.equal(db.prepare('SELECT count(*) AS count FROM works WHERE preview_version IS NOT NULL').get()!.count, 0)
    assert.equal(db.prepare('SELECT config_json FROM works WHERE id=?').get('demo-ruyi')!.config_json, JSON.stringify(edited))
  } finally { db.close() }
})
