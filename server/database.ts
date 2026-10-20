import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { DatabaseSync } from 'node:sqlite'

export const SCHEMA_VERSION = 3

export const V2_MIGRATION = `
          ALTER TABLE works ADD COLUMN deleted_at TEXT;
          DROP INDEX IF EXISTS works_owner_updated_idx;
          CREATE INDEX works_owner_state_updated_idx ON works(owner_id, deleted_at, updated_at DESC, id DESC);
          CREATE TABLE mutation_journal (
            owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            key TEXT NOT NULL,
            method TEXT NOT NULL,
            path TEXT NOT NULL,
            body_hash TEXT NOT NULL,
            status INTEGER NOT NULL CHECK(status BETWEEN 200 AND 299),
            response_json TEXT NOT NULL,
            created_at TEXT NOT NULL,
            PRIMARY KEY(owner_id, key)
          );
`

export function openDatabase(filename: string): DatabaseSync {
  if (filename !== ':memory:') mkdirSync(dirname(resolve(filename)), { recursive: true, mode: 0o700 })
  const db = new DatabaseSync(filename)
  try {
    db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;')
    db.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        applied_at TEXT NOT NULL
      );
    `)
    db.exec('BEGIN IMMEDIATE')
    try {
      const migrated = db.prepare('SELECT version FROM schema_migrations WHERE version = 1').get()
      if (!migrated) {
        db.exec(`
          CREATE TABLE users (
            id TEXT PRIMARY KEY,
            username TEXT NOT NULL UNIQUE COLLATE NOCASE,
            display_name TEXT NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TEXT NOT NULL
          );
          CREATE TABLE sessions (
            token_hash TEXT PRIMARY KEY,
            user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            created_at INTEGER NOT NULL,
            expires_at INTEGER NOT NULL
          );
          CREATE INDEX sessions_user_idx ON sessions(user_id);
          CREATE INDEX sessions_expiry_idx ON sessions(expires_at);
          CREATE TABLE works (
            id TEXT PRIMARY KEY,
            owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            title TEXT NOT NULL CHECK(length(title) BETWEEN 1 AND 80),
            description TEXT NOT NULL CHECK(length(description) <= 1000),
            config_json TEXT NOT NULL,
            version INTEGER NOT NULL DEFAULT 1 CHECK(version >= 1),
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
          );
          CREATE INDEX works_owner_updated_idx ON works(owner_id, updated_at DESC);
        `)
        db.prepare('INSERT INTO schema_migrations(version, applied_at) VALUES(1, ?)').run(new Date().toISOString())
      }
      db.exec('COMMIT')
    } catch (error) {
      db.exec('ROLLBACK')
      throw error
    }
    db.exec('BEGIN IMMEDIATE')
    try {
      const migratedV2 = db.prepare('SELECT version FROM schema_migrations WHERE version = 2').get()
      if (!migratedV2) {
        db.exec(V2_MIGRATION)
        db.prepare('INSERT INTO schema_migrations(version, applied_at) VALUES(2, ?)').run(new Date().toISOString())
      }
      db.exec('COMMIT')
    } catch (error) {
      db.exec('ROLLBACK')
      throw error
    }
    db.exec('BEGIN IMMEDIATE')
    try {
      if (!db.prepare('SELECT version FROM schema_migrations WHERE version = 3').get()) {
        db.exec(`
          ALTER TABLE works ADD COLUMN inspiration_id TEXT;
          ALTER TABLE works ADD COLUMN preview_version INTEGER;
          CREATE TABLE work_previews (
            work_id TEXT PRIMARY KEY REFERENCES works(id) ON DELETE CASCADE,
            version INTEGER NOT NULL CHECK(version >= 1),
            image_png BLOB NOT NULL CHECK(length(image_png) BETWEEN 57 AND 262144)
          );
        `)
        db.prepare('INSERT INTO schema_migrations(version, applied_at) VALUES(3, ?)').run(new Date().toISOString())
      }
      db.exec('COMMIT')
    } catch (error) { db.exec('ROLLBACK'); throw error }
    return db
  } catch (error) {
    db.close()
    throw error
  }
}
