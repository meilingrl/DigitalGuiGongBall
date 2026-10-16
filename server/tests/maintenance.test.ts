import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { once } from 'node:events'
import { copyFileSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import { syncBuiltinESMExports } from 'node:module'
import { DatabaseSync } from 'node:sqlite'
import { test, type TestContext } from 'node:test'
import { createApp } from '../app.js'
import { openDatabase } from '../database.js'

// API import is deferred so the first red test exercises the missing CLI itself.
async function maintenance() { return import('../maintenance/index.js') }

const configuration = {
  schemaVersion: 1, templateId: 'linglong', layers: 4, patternScale: 12,
  aperture: 0.55, material: 'ivory', separation: 0, cutaway: false,
  autoRotate: false, activeLayer: 0,
}

function directory(t: TestContext) {
  const value = mkdtempSync(join(realpathSync(tmpdir()), 'guigong-maintenance-'))
  t.after(() => rmSync(value, { recursive: true, force: true }))
  return value
}

function populate(db: DatabaseSync) {
  db.prepare('INSERT INTO users(id,username,display_name,password_hash,created_at) VALUES(?,?,?,?,?)')
    .run('owner-1', 'private-account', 'Private name', 'private-password-hash', '2026-10-16T00:00:00.000Z')
  db.prepare('INSERT INTO works(id,owner_id,title,description,config_json,version,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)')
    .run('work-1', 'owner-1', '私有作品', '', JSON.stringify(configuration), 3, '2026-10-16T00:00:00.000Z', '2026-10-16T00:00:00.000Z')
  db.prepare('INSERT INTO sessions(token_hash,user_id,created_at,expires_at) VALUES(?,?,?,?)')
    .run('private-token-hash', 'owner-1', 1, 9999999999999)
}

function source(t: TestContext) {
  const root = directory(t)
  const filename = join(root, 'source.sqlite')
  const db = openDatabase(filename)
  db.exec('PRAGMA wal_checkpoint(TRUNCATE)')
  populate(db)
  t.after(() => db.close())
  return { root, filename, db }
}

function cli(args: string[], env: NodeJS.ProcessEnv = {}) {
  return spawnSync(process.execPath, ['--import', 'tsx', 'server/maintenance/cli.ts', ...args], {
    cwd: resolve('.'), encoding: 'utf8', env: { ...process.env, ...env },
  })
}

test('CLI produces a usable snapshot from an explicitly selected live WAL source', (t) => {
  const fixture = source(t)
  const to = join(fixture.root, 'backups', 'cli.sqlite')
  const result = cli(['backup', '--from', fixture.filename, '--to', to])
  assert.equal(result.status, 0, result.stderr)
  const db = new DatabaseSync(to, { readOnly: true })
  try { assert.equal(db.prepare('SELECT title FROM works').get()!.title, '私有作品') } finally { db.close() }
  const output = JSON.parse(result.stdout)
  assert.equal(output.operation, 'backup')
  for (const secret of ['private-account', 'Private name', 'private-password-hash', 'private-token-hash', '私有作品']) {
    assert.equal(result.stdout.includes(secret), false)
    assert.equal(result.stderr.includes(secret), false)
  }
})

test('snapshot captures committed WAL rows and stays independent of later live writes', async (t) => {
  const fixture = source(t)
  assert.ok(statSync(`${fixture.filename}-wal`).size > 0)
  const naive = join(fixture.root, 'main-only.sqlite')
  copyFileSync(fixture.filename, naive)
  const mainOnly = new DatabaseSync(naive, { readOnly: true })
  try { assert.equal(mainOnly.prepare('SELECT count(*) AS n FROM works').get()!.n, 0) } finally { mainOnly.close() }
  const to = join(fixture.root, 'backups', 'snapshot.sqlite')
  const result = (await maintenance()).backupDatabase({ from: fixture.filename, to })
  fixture.db.prepare('UPDATE works SET title=? WHERE id=?').run('Later edit', 'work-1')
  const snapshot = new DatabaseSync(to, { readOnly: true })
  try {
    assert.equal(snapshot.prepare('SELECT title FROM works').get()!.title, '私有作品')
    assert.equal(snapshot.prepare('PRAGMA integrity_check').get()!.integrity_check, 'ok')
    assert.deepEqual(snapshot.prepare('PRAGMA foreign_key_check').all(), [])
    assert.equal(snapshot.prepare('SELECT count(*) AS n FROM sessions').get()!.n, 1)
  } finally { snapshot.close() }
  assert.equal(result.sha256, createHash('sha256').update(readFileSync(to)).digest('hex'))
  assert.equal(result.bytes, statSync(to).size)
  assert.equal(statSync(to).mode & 0o777, 0o600)
  assert.equal(statSync(dirname(to)).mode & 0o777, 0o700)
  assert.ok(Number.isFinite(Date.parse(result.createdAt)))
})

test('restore preserves works and password hashes, revokes sessions and leaves snapshot bytes unchanged', async (t) => {
  const fixture = source(t)
  const { backupDatabase, restoreDatabase } = await maintenance()
  const snapshot = join(fixture.root, 'snapshot.sqlite')
  backupDatabase({ from: fixture.filename, to: snapshot })
  const before = readFileSync(snapshot)
  const to = join(fixture.root, 'restored', 'new.sqlite')
  const result = restoreDatabase({ from: snapshot, to })
  const restored = new DatabaseSync(to, { readOnly: true })
  try {
    assert.equal(restored.prepare('SELECT title,version FROM works').get()!.title, '私有作品')
    assert.equal(restored.prepare('SELECT version FROM works').get()!.version, 3)
    assert.equal(restored.prepare('SELECT password_hash FROM users').get()!.password_hash, 'private-password-hash')
    assert.equal(restored.prepare('SELECT count(*) AS n FROM sessions').get()!.n, 0)
  } finally { restored.close() }
  assert.equal(result.sessionsInvalidated, 1)
  assert.deepEqual(readFileSync(snapshot), before)
  assert.equal(fixture.db.prepare('SELECT count(*) AS n FROM sessions').get()!.n, 1)
})

test('restored application rejects the old cookie but accepts the retained password and works', async (t) => {
  const root = directory(t)
  const from = join(root, 'account.sqlite')
  async function start(filename: string) {
    const instance = createApp({ dbPath: filename })
    const server = instance.app.listen(0, '127.0.0.1')
    await once(server, 'listening')
    const address = server.address()
    assert.ok(address && typeof address !== 'string')
    const url = `http://127.0.0.1:${address.port}`
    t.after(async () => { await new Promise<void>((done) => server.close(() => done())); instance.close() })
    async function request(path: string, body?: unknown, cookie?: string) {
      return fetch(`${url}${path}`, { method: body ? 'POST' : 'GET', headers: {
        Origin: 'http://localhost:5173', 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}),
      }, body: body ? JSON.stringify(body) : undefined })
    }
    return request
  }
  const request = await start(from)
  const account = { username: 'restorer', displayName: '恢复测试', password: 'recover-test-123' }
  const registration = await request('/api/auth/register', account)
  assert.equal(registration.status, 201)
  const cookie = registration.headers.get('set-cookie')!.split(';')[0]!
  const work = await request('/api/works', { title: '恢复后作品', description: '', config: configuration }, cookie)
  assert.equal(work.status, 201)
  const { backupDatabase, restoreDatabase } = await maintenance()
  const snapshot = join(root, 'snapshot.sqlite')
  backupDatabase({ from, to: snapshot })
  const to = join(root, 'new.sqlite')
  restoreDatabase({ from: snapshot, to })
  const restoredRequest = await start(to)
  assert.equal((await restoredRequest('/api/auth/me', undefined, cookie)).status, 401)
  const login = await restoredRequest('/api/auth/login', { username: account.username, password: account.password })
  assert.equal(login.status, 200)
  const freshCookie = login.headers.get('set-cookie')!.split(';')[0]!
  const works = await restoredRequest('/api/works', undefined, freshCookie)
  assert.equal((await works.json()).works[0].title, '恢复后作品')
})

test('refuses same paths, existing empty/nonempty targets and target SQLite companions without altering them', async (t) => {
  const fixture = source(t)
  const { backupDatabase, restoreDatabase } = await maintenance()
  for (const operation of [backupDatabase, restoreDatabase]) {
    assert.throws(() => operation({ from: fixture.filename, to: fixture.filename }), { code: 'SAME_PATH' })
    for (const value of ['', 'keep this file']) {
      const to = join(fixture.root, `existing-${operation.name}-${value.length}.sqlite`)
      writeFileSync(to, value)
      assert.throws(() => operation({ from: fixture.filename, to }), { code: 'TARGET_EXISTS' })
      assert.equal(readFileSync(to, 'utf8'), value)
    }
    for (const suffix of ['-wal', '-shm', '-journal']) {
      const to = join(fixture.root, `companion-${operation.name}-${suffix}.sqlite`)
      writeFileSync(to + suffix, 'existing companion')
      assert.throws(() => operation({ from: fixture.filename, to }), { code: 'TARGET_EXISTS' })
      assert.equal(existsSync(to), false)
      assert.equal(readFileSync(to + suffix, 'utf8'), 'existing companion')
    }
  }
})

test('refuses symlinked source, destination and destination parent, including dangling links', async (t) => {
  const fixture = source(t)
  const { backupDatabase } = await maintenance()
  const linkedSource = join(fixture.root, 'source-link.sqlite')
  symlinkSync(fixture.filename, linkedSource)
  assert.throws(() => backupDatabase({ from: linkedSource, to: join(fixture.root, 'no.sqlite') }), { code: 'UNSAFE_PATH' })
  const target = join(fixture.root, 'target-link.sqlite')
  symlinkSync(join(fixture.root, 'missing.sqlite'), target)
  assert.throws(() => backupDatabase({ from: fixture.filename, to: target }), { code: 'UNSAFE_PATH' })
  assert.equal(lstatSync(target).isSymbolicLink(), true)
  const linkedDirectory = join(fixture.root, 'linked')
  symlinkSync(fixture.root, linkedDirectory)
  assert.throws(() => backupDatabase({ from: fixture.filename, to: join(linkedDirectory, 'new.sqlite') }), { code: 'UNSAFE_PATH' })
})

test('missing source cannot create a new ambient database or any output directory', async (t) => {
  const root = directory(t)
  const { backupDatabase } = await maintenance()
  const from = join(root, 'mistyped.sqlite')
  const to = join(root, 'new-directory', 'backup.sqlite')
  assert.throws(() => backupDatabase({ from, to }), { code: 'SOURCE_MISSING' })
  assert.equal(existsSync(from), false)
  assert.deepEqual(readdirSync(root), [])
})

test('a destination created during publication survives while the partial private snapshot is cleaned', async (t) => {
  const fixture = source(t)
  const { backupDatabase, restoreDatabase } = await maintenance()
  for (const operation of [backupDatabase, restoreDatabase]) {
    const target = join(fixture.root, `${operation.name}-race.sqlite`)
    const originalLink = fs.linkSync
    // Order an actual filesystem race deterministically: publication still calls
    // the real exclusive hard-link operation against the newly existing file.
    const mocked = t.mock.method(fs, 'linkSync', (from, to) => {
      writeFileSync(to, 'concurrently created; preserve')
      originalLink(from, to)
    })
    syncBuiltinESMExports()
    try {
      assert.throws(() => operation({ from: fixture.filename, to: target }), { code: 'TARGET_EXISTS' })
      assert.equal(readFileSync(target, 'utf8'), 'concurrently created; preserve')
      assert.equal(readdirSync(fixture.root).some((name) => name.startsWith('.guigong-maintenance-')), false)
      assert.equal(fixture.db.prepare('SELECT count(*) AS n FROM sessions').get()!.n, 1)
    } finally { mocked.mock.restore(); syncBuiltinESMExports() }
  }
})

test('rejects corrupt and unknown SQLite sources with no partial target or unrelated cleanup', async (t) => {
  const root = directory(t)
  const { backupDatabase, restoreDatabase } = await maintenance()
  for (const kind of ['corrupt', 'unknown', 'future', 'trigger', 'foreign-key', 'integrity']) {
    const from = join(root, `${kind}.sqlite`)
    if (kind === 'corrupt') writeFileSync(from, 'not sqlite')
    else {
      const db = kind === 'unknown' ? new DatabaseSync(from) : openDatabase(from)
      if (kind === 'unknown') db.exec('CREATE TABLE arbitrary(value TEXT)')
      if (kind === 'future') db.exec("INSERT INTO schema_migrations VALUES(999, 'future')")
      if (kind === 'trigger') db.exec("CREATE TRIGGER unexpected AFTER DELETE ON sessions BEGIN DELETE FROM works; END")
      if (kind === 'foreign-key') {
        db.exec('PRAGMA foreign_keys=OFF')
        db.prepare('INSERT INTO sessions VALUES(?,?,?,?)').run('invalid', 'missing-user', 1, 2)
      }
      if (kind === 'integrity') {
        populate(db)
        db.exec('PRAGMA ignore_check_constraints=ON; UPDATE works SET version=0')
      }
      db.close()
    }
    const before = readFileSync(from)
    const output = join(root, `${kind}-output`)
    mkdirSync(output, { mode: 0o700 })
    writeFileSync(join(output, 'unrelated.txt'), 'preserve')
    for (const operation of [backupDatabase, restoreDatabase]) {
      assert.throws(() => operation({ from, to: join(output, 'new.sqlite') }), (error: unknown) => {
        assert.ok(error instanceof Error)
        assert.ok(['INVALID_DATABASE', 'UNSUPPORTED_SCHEMA'].includes((error as Error & { code: string }).code))
        assert.equal(error.message.includes('private-'), false)
        return true
      })
      assert.deepEqual(readdirSync(output), ['unrelated.txt'])
      assert.equal(readFileSync(join(output, 'unrelated.txt'), 'utf8'), 'preserve')
      assert.deepEqual(readFileSync(from), before)
    }
  }
})

test('migrates only a known v1 snapshot into the new restored file', async (t) => {
  const root = directory(t)
  const from = join(root, 'v1.sqlite')
  const legacy = new DatabaseSync(from)
  legacy.exec(`
    CREATE TABLE schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL);
    CREATE TABLE users (id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE COLLATE NOCASE, display_name TEXT NOT NULL, password_hash TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL);
    CREATE INDEX sessions_user_idx ON sessions(user_id);
    CREATE INDEX sessions_expiry_idx ON sessions(expires_at);
    CREATE TABLE works (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, title TEXT NOT NULL CHECK(length(title) BETWEEN 1 AND 80), description TEXT NOT NULL CHECK(length(description) <= 1000), config_json TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1 CHECK(version >= 1), created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE INDEX works_owner_updated_idx ON works(owner_id, updated_at DESC);
    INSERT INTO schema_migrations VALUES(1, '2026-10-16T00:00:00.000Z');
  `)
  populate(legacy)
  legacy.close()
  const before = readFileSync(from)
  const { restoreDatabase } = await maintenance()
  const to = join(root, 'restored.sqlite')
  const result = restoreDatabase({ from, to })
  assert.equal(result.schemaVersion, 2)
  const restored = new DatabaseSync(to, { readOnly: true })
  try {
    assert.deepEqual(restored.prepare('SELECT version FROM schema_migrations ORDER BY version').all().map((row) => row.version), [1, 2])
    assert.equal(restored.prepare('SELECT title,deleted_at FROM works').get()!.deleted_at, null)
    assert.equal(restored.prepare('SELECT count(*) AS n FROM sessions').get()!.n, 0)
    assert.equal(restored.prepare('SELECT count(*) AS n FROM mutation_journal').get()!.n, 0)
  } finally { restored.close() }
  assert.deepEqual(readFileSync(from), before)
})

test('CLI validates arguments, defaults only the backup source, and refuses overwrite on repeated commands', (t) => {
  const fixture = source(t)
  const to = join(fixture.root, 'cli-default.sqlite')
  const first = cli(['backup', '--to', to], { DATABASE_PATH: fixture.filename })
  assert.equal(first.status, 0, first.stderr)
  const before = readFileSync(to)
  const second = cli(['backup', '--from', fixture.filename, '--to', to])
  assert.equal(second.status, 1)
  assert.match(second.stderr, /TARGET_EXISTS/)
  assert.deepEqual(readFileSync(to), before)
  const restored = join(fixture.root, 'cli-restored.sqlite')
  assert.equal(cli(['restore', '--from', to, '--to', restored]).status, 0)
  assert.equal(cli(['restore', '--from', to, '--to', restored]).status, 1)
  for (const args of [[], ['restore', '--to', join(fixture.root, 'no.sqlite')], ['backup'], ['backup', '--to', 'a', '--to', 'b'], ['backup', '--to', 'a', '--unknown', 'x'], ['backup', '--to']]) {
    const result = cli(args)
    assert.equal(result.status, 1)
    assert.match(result.stderr, /Usage:/)
  }
})

test('rejects a token-colliding SQL schema whose version column lost its NOT NULL constraint', async (t) => {
  const root = directory(t)
  const from = join(root, 'token-collision.sqlite')
  const known = openDatabase(':memory:')
  const schema = known.prepare('SELECT type,sql FROM sqlite_schema WHERE sql IS NOT NULL ORDER BY name').all()
  known.close()
  const changed = new DatabaseSync(from)
  try {
    for (const row of schema.filter((row) => row.type === 'table')) {
      changed.exec(String(row.sql).replace('version INTEGER NOT NULL', 'version INTEGERNOT NULL'))
    }
    for (const row of schema.filter((row) => row.type === 'index')) changed.exec(String(row.sql))
    changed.exec("INSERT INTO schema_migrations VALUES(1,'now'),(2,'now')")
    populate(changed)
    changed.exec('UPDATE works SET version=NULL')
    const column = changed.prepare('PRAGMA table_info(works)').all().find((row) => row.name === 'version')!
    assert.equal(column.type, 'INTEGERNOT')
    assert.equal(column.notnull, 0)
  } finally { changed.close() }
  const before = readFileSync(from)
  const { backupDatabase, restoreDatabase } = await maintenance()
  for (const operation of [backupDatabase, restoreDatabase]) {
    const to = join(root, `${operation.name}.sqlite`)
    assert.throws(() => operation({ from, to }), { code: 'UNSUPPORTED_SCHEMA' })
    assert.equal(existsSync(to), false)
    assert.deepEqual(readFileSync(from), before)
    assert.equal(readdirSync(root).some((name) => name.startsWith('.guigong-maintenance-')), false)
  }
})

test('a valid foreign WAL appearing during publication fails and preserves the WAL while removing only the new main link', async (t) => {
  const fixture = source(t)
  const { backupDatabase, restoreDatabase } = await maintenance()
  for (const operation of [backupDatabase, restoreDatabase]) {
    const foreignPath = join(fixture.root, `${operation.name}-foreign.sqlite`)
    operation({ from: fixture.filename, to: foreignPath })
    const foreign = openDatabase(foreignPath)
    try {
      foreign.exec('PRAGMA wal_checkpoint(TRUNCATE)')
      foreign.prepare('UPDATE works SET title=? WHERE id=?').run('foreign WAL change', 'work-1')
      const wal = readFileSync(`${foreignPath}-wal`)
      assert.ok(wal.length > 32)
      assert.equal(foreign.prepare('SELECT title FROM works').get()!.title, 'foreign WAL change')
      const target = join(fixture.root, `${operation.name}-wal-race.sqlite`)
      const originalLink = fs.linkSync
      const mocked = t.mock.method(fs, 'linkSync', (from, to) => {
        writeFileSync(`${to}-wal`, wal)
        originalLink(from, to)
      })
      syncBuiltinESMExports()
      try {
        assert.throws(() => operation({ from: fixture.filename, to: target }), { code: 'TARGET_EXISTS' })
        assert.equal(existsSync(target), false)
        assert.deepEqual(readFileSync(`${target}-wal`), wal)
        assert.equal(readdirSync(fixture.root).some((name) => name.startsWith('.guigong-maintenance-')), false)
        assert.equal(fixture.db.prepare('SELECT title FROM works').get()!.title, '私有作品')
        assert.equal(fixture.db.prepare('SELECT count(*) AS n FROM sessions').get()!.n, 1)
      } finally { mocked.mock.restore(); syncBuiltinESMExports() }
    } finally { foreign.close() }
  }
})

test('publication failure never unlinks a main file replaced by another actor after the hard link', async (t) => {
  const fixture = source(t)
  const { backupDatabase, restoreDatabase } = await maintenance()
  for (const operation of [backupDatabase, restoreDatabase]) {
    const target = join(fixture.root, `${operation.name}-replaced.sqlite`)
    const originalLink = fs.linkSync
    const mocked = t.mock.method(fs, 'linkSync', (from, to) => {
      originalLink(from, to)
      fs.unlinkSync(to)
      writeFileSync(to, 'replacement main; preserve')
      writeFileSync(`${to}-shm`, 'replacement companion; preserve')
    })
    syncBuiltinESMExports()
    try {
      assert.throws(() => operation({ from: fixture.filename, to: target }), { code: 'TARGET_EXISTS' })
      assert.equal(readFileSync(target, 'utf8'), 'replacement main; preserve')
      assert.equal(readFileSync(`${target}-shm`, 'utf8'), 'replacement companion; preserve')
      assert.equal(readdirSync(fixture.root).some((name) => name.startsWith('.guigong-maintenance-')), false)
    } finally { mocked.mock.restore(); syncBuiltinESMExports() }
  }
})
