import { createHash } from 'node:crypto'
import { chmodSync, closeSync, fsyncSync, linkSync, lstatSync, mkdirSync, mkdtempSync, openSync, readSync, rmdirSync, statSync, unlinkSync } from 'node:fs'
import { dirname, join, parse, resolve } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { openDatabase, SCHEMA_VERSION } from '../database.js'

export type MaintenanceCode = 'INVALID_ARGUMENT' | 'UNSAFE_PATH' | 'SOURCE_MISSING' | 'SAME_PATH' | 'TARGET_EXISTS' | 'INVALID_DATABASE' | 'UNSUPPORTED_SCHEMA' | 'IO_ERROR'

export class MaintenanceError extends Error {
  constructor(readonly code: MaintenanceCode, message: string) {
    super(message)
    this.name = 'MaintenanceError'
  }
}

export interface MaintenanceOptions { from: string; to: string }
export interface MaintenanceResult {
  operation: 'backup' | 'restore'
  schemaVersion: number
  sha256: string
  bytes: number
  createdAt: string
  sessionsInvalidated?: number
}

const companions = ['', '-wal', '-shm', '-journal']

// Trusted v1 DDL is deliberately fixed: an arbitrary SQLite file must never be
// handed to migrations merely because it claims a recognized migration number.
const legacySchema = `
  CREATE TABLE schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL);
  CREATE TABLE users (id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE COLLATE NOCASE, display_name TEXT NOT NULL, password_hash TEXT NOT NULL, created_at TEXT NOT NULL);
  CREATE TABLE sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL);
  CREATE INDEX sessions_user_idx ON sessions(user_id);
  CREATE INDEX sessions_expiry_idx ON sessions(expires_at);
  CREATE TABLE works (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, title TEXT NOT NULL CHECK(length(title) BETWEEN 1 AND 80), description TEXT NOT NULL CHECK(length(description) <= 1000), config_json TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1 CHECK(version >= 1), created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
  CREATE INDEX works_owner_updated_idx ON works(owner_id, updated_at DESC);
`

function errorCode(error: unknown): string | undefined {
  return typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : undefined
}

function existing(path: string) {
  try { return lstatSync(path) } catch (error) {
    if (errorCode(error) === 'ENOENT') return undefined
    throw error
  }
}

function absolutePath(value: string): string {
  if (typeof value !== 'string' || !value.trim() || value.includes('\0') || value === ':memory:') {
    throw new MaintenanceError('INVALID_ARGUMENT', 'Use explicit filesystem database paths.')
  }
  return resolve(value)
}

function assertNoSymlinks(path: string): void {
  const root = parse(path).root
  let current = root
  for (const part of path.slice(root.length).split('/').filter(Boolean)) {
    current = join(current, part)
    const info = existing(current)
    if (info?.isSymbolicLink()) throw new MaintenanceError('UNSAFE_PATH', 'Symbolic links are not accepted for database paths.')
    if (!info) break
    if (current !== path && !info.isDirectory()) throw new MaintenanceError('UNSAFE_PATH', 'A database parent must be a directory.')
  }
}

function assertPathsAbsent(to: string, suffixes: readonly string[]): void {
  for (const suffix of suffixes) {
    const info = existing(to + suffix)
    if (info?.isSymbolicLink()) throw new MaintenanceError('UNSAFE_PATH', 'Symbolic links are not accepted for database paths.')
    if (info) throw new MaintenanceError('TARGET_EXISTS', 'The destination or a SQLite companion already exists; choose a new filename.')
  }
}

function assertTargetAbsent(to: string): void {
  assertNoSymlinks(to)
  assertPathsAbsent(to, companions)
}

function validatePaths(options: MaintenanceOptions): { from: string; to: string } {
  const from = absolutePath(options.from)
  const to = absolutePath(options.to)
  if (from === to) throw new MaintenanceError('SAME_PATH', 'Source and destination must be different files.')
  assertNoSymlinks(from)
  assertNoSymlinks(to)
  const info = existing(from)
  if (!info) throw new MaintenanceError('SOURCE_MISSING', 'Source database does not exist.')
  if (!info.isFile()) throw new MaintenanceError('UNSAFE_PATH', 'Source must be a regular database file.')
  // SQLite can open these files itself; do not let it follow an unexpected link.
  for (const suffix of companions.slice(1)) {
    const companion = existing(from + suffix)
    if (companion && !companion.isFile()) throw new MaintenanceError('UNSAFE_PATH', 'Source SQLite companions must be regular files.')
  }
  assertTargetAbsent(to)
  return { from, to }
}

function normalizeSql(sql: string): string {
  // Compare tokens, not concatenated words: INTEGER NOT NULL must differ from
  // the nullable declaration INTEGERNOT NULL. Quoted values remain exact.
  const tokens = sql.match(/'(?:''|[^'])*'|"(?:""|[^"])*"|`(?:``|[^`])*`|\[[^\]]*\]|[A-Za-z_\u0080-\uFFFF][A-Za-z0-9_$\u0080-\uFFFF]*|(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?|<=|>=|<>|!=|==|\|\||<<|>>|[^\s]/g) ?? []
  return JSON.stringify(tokens.map((token) => /^["'`\[]/.test(token) ? token : token.toLowerCase()))
}

function schemaSignature(db: DatabaseSync): string {
  const rows = db.prepare('SELECT type,name,tbl_name,sql FROM sqlite_schema ORDER BY name LIMIT 64').all()
  if (rows.length >= 64) throw new MaintenanceError('UNSUPPORTED_SCHEMA', 'Database schema is not a supported project schema.')
  return JSON.stringify(rows.map((row) => {
    if ((row.sql !== null && (typeof row.sql !== 'string' || row.sql.length > 16384)) || String(row.name).length > 128) {
      throw new MaintenanceError('UNSUPPORTED_SCHEMA', 'Database schema is not a supported project schema.')
    }
    // Check SQLite's interpreted structure as well as DDL tokens. Bound names
    // prevent unknown schema identifiers from becoming SQL text.
    const structure = row.type === 'table' ? {
      columns: db.prepare('SELECT cid,name,type,"notnull",dflt_value,pk,hidden FROM pragma_table_xinfo(?) ORDER BY cid').all(String(row.name)),
      foreignKeys: db.prepare('SELECT id,seq,"table","from","to",on_update,on_delete,match FROM pragma_foreign_key_list(?) ORDER BY id,seq').all(String(row.name)),
      indexes: db.prepare('SELECT name,"unique",origin,partial FROM pragma_index_list(?) ORDER BY name').all(String(row.name)),
    } : row.type === 'index'
      ? db.prepare('SELECT seqno,cid,name,"desc",coll,"key" FROM pragma_index_xinfo(?) ORDER BY seqno').all(String(row.name))
      : null
    return [row.type, row.name, row.tbl_name, row.sql === null ? null : normalizeSql(String(row.sql)), structure]
  }))
}

function knownSchemas(): Map<string, number> {
  const current = openDatabase(':memory:')
  const legacy = new DatabaseSync(':memory:', { allowExtension: false })
  try {
    legacy.exec(legacySchema)
    return new Map([[schemaSignature(legacy), 1], [schemaSignature(current), SCHEMA_VERSION]])
  } finally { current.close(); legacy.close() }
}

function validateDatabase(db: DatabaseSync): number {
  const version = knownSchemas().get(schemaSignature(db))
  if (!version) throw new MaintenanceError('UNSUPPORTED_SCHEMA', 'Database schema is not a supported project schema.')
  const migrations = db.prepare('SELECT version FROM schema_migrations ORDER BY version LIMIT 16').all().map((row) => row.version)
  if (migrations.length !== version || migrations.some((value, index) => value !== index + 1)) {
    throw new MaintenanceError('UNSUPPORTED_SCHEMA', 'Database migration history is unknown or from a newer version.')
  }
  const integrity = db.prepare('PRAGMA integrity_check(1)').all()
  if (integrity.length !== 1 || integrity[0]!.integrity_check !== 'ok' || db.prepare('PRAGMA foreign_key_check').get()) {
    throw new MaintenanceError('INVALID_DATABASE', 'Database integrity or foreign key validation failed.')
  }
  return version
}

function openValidated(from: string, readOnly = true): { db: DatabaseSync; version: number } {
  let db: DatabaseSync | undefined
  try {
    db = new DatabaseSync(from, { readOnly, allowExtension: false })
    db.exec('PRAGMA trusted_schema=OFF; PRAGMA query_only=ON; PRAGMA busy_timeout=5000;')
    db.exec('BEGIN')
    const version = validateDatabase(db)
    db.exec('COMMIT')
    return { db, version }
  } catch (error) {
    db?.close()
    if (error instanceof MaintenanceError) throw error
    // SQLite may include row values in diagnostics. Never forward raw errors.
    throw new MaintenanceError('INVALID_DATABASE', 'Source is not a valid supported project database.')
  }
}

function privateParents(parent: string): string[] {
  const missing: string[] = []
  let current = parent
  while (!existing(current)) { missing.push(current); current = dirname(current) }
  const created: string[] = []
  try {
    for (const path of missing.reverse()) {
      mkdirSync(path, { mode: 0o700 })
      created.push(path)
    }
    return created
  } catch (error) {
    for (const path of created.reverse()) { try { rmdirSync(path) } catch { /* Only remove empty directories created here. */ } }
    throw error
  }
}

function digestFile(filename: string): { sha256: string; bytes: number } {
  const fd = openSync(filename, 'r')
  try {
    const hash = createHash('sha256')
    const buffer = Buffer.allocUnsafe(64 * 1024)
    let size: number
    while ((size = readSync(fd, buffer)) !== 0) hash.update(buffer.subarray(0, size))
    fsyncSync(fd)
    return { sha256: hash.digest('hex'), bytes: statSync(filename).size }
  } finally { closeSync(fd) }
}

function cleanupStage(stage: string): void {
  for (const suffix of companions) {
    try { unlinkSync(join(stage, 'snapshot.sqlite') + suffix) } catch { /* Never remove a path outside this operation's private directory. */ }
  }
  try { rmdirSync(stage) } catch { /* Do not recursively remove unexpected files. */ }
}

function publishSnapshot(staged: string, to: string): void {
  const identity = lstatSync(staged, { bigint: true })
  function ownsDestination(): boolean {
    try {
      const visible = lstatSync(to, { bigint: true })
      return visible.isFile() && visible.dev === identity.dev && visible.ino === identity.ino
    } catch (error) {
      if (errorCode(error) === 'ENOENT') return false
      throw error
    }
  }
  assertTargetAbsent(to)
  // Hard-link creation exclusively publishes the main filename. Check again
  // afterward for companions created during publication, without opening them.
  linkSync(staged, to)
  try {
    assertNoSymlinks(to)
    if (!ownsDestination()) throw new MaintenanceError('TARGET_EXISTS', 'The destination changed during publication; choose a new filename.')
    assertPathsAbsent(to, companions.slice(1))
  } catch (error) {
    // Preserve all competing sidecars and replacement files. Only undo our own
    // main-file link, identified by device + inode rather than its pathname.
    if (ownsDestination()) unlinkSync(to)
    throw error
  }
  // This is not an OS transaction over a directory. A hostile actor changing
  // the parent between filesystem calls can still race checks and cleanup;
  // maintenance destinations must have a trusted parent directory.
}

function run(operation: 'backup' | 'restore', options: MaintenanceOptions): MaintenanceResult {
  let stage: string | undefined
  let createdParents: string[] = []
  let source: DatabaseSync | undefined
  let published = false
  try {
    const { from, to } = validatePaths(options)
    const validated = openValidated(from)
    source = validated.db
    createdParents = privateParents(dirname(to))
    stage = mkdtempSync(join(dirname(to), '.guigong-maintenance-'))
    chmodSync(stage, 0o700)
    const staged = join(stage, 'snapshot.sqlite')
    closeSync(openSync(staged, 'wx', 0o600))
    // VACUUM INTO is a consistent SQLite snapshot including committed WAL rows.
    // query_only must be OFF to create its output, while the source connection
    // itself remains readOnly and extensions/trusted schema remain disabled.
    source.exec('PRAGMA query_only=OFF; PRAGMA synchronous=FULL;')
    source.prepare('VACUUM INTO ?').run(staged)
    source.close()
    source = undefined
    // SQLite omits CHECK-constraint checks for readOnly database handles.
    // This private copy can be opened read-write while query_only still blocks
    // SQL mutations, allowing integrity_check to validate those constraints.
    const snapshot = openValidated(staged, false)
    let version = snapshot.version
    snapshot.db.close()
    let sessionsInvalidated: number | undefined
    if (operation === 'restore') {
      const restored = openDatabase(staged)
      try {
        restored.exec('PRAGMA trusted_schema=OFF; PRAGMA secure_delete=ON;')
        sessionsInvalidated = Number(restored.prepare('DELETE FROM sessions').run().changes)
        version = validateDatabase(restored)
        restored.exec('PRAGMA wal_checkpoint(TRUNCATE)')
      } finally { restored.close() }
    }
    chmodSync(staged, 0o600)
    const result: MaintenanceResult = {
      operation, schemaVersion: version, ...digestFile(staged), createdAt: new Date().toISOString(),
      ...(operation === 'restore' ? { sessionsInvalidated } : {}),
    }
    publishSnapshot(staged, to)
    published = true
    return result
  } catch (error) {
    if (error instanceof MaintenanceError) throw error
    if (errorCode(error) === 'EEXIST') throw new MaintenanceError('TARGET_EXISTS', 'The destination appeared during the operation; choose a new filename.')
    throw new MaintenanceError('IO_ERROR', 'Database maintenance failed; no existing destination was overwritten.')
  } finally {
    source?.close()
    if (stage) cleanupStage(stage)
    if (!published) for (const parent of createdParents.reverse()) { try { rmdirSync(parent) } catch { /* Preserve any nonempty directory. */ } }
  }
}

/** Produces a new consistent snapshot. Never creates a missing source. */
export function backupDatabase(options: MaintenanceOptions): MaintenanceResult { return run('backup', options) }

/** Validates a known snapshot, migrates its new copy and revokes old sessions. */
export function restoreDatabase(options: MaintenanceOptions): MaintenanceResult { return run('restore', options) }
