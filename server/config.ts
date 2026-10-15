import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

if (existsSync('.env')) process.loadEnvFile('.env')

function integer(name: string, fallback: number, min: number, max: number): number {
  const raw = process.env[name]
  if (raw === undefined || raw === '') return fallback
  const value = Number(raw)
  if (!Number.isInteger(value) || value < min || value > max) throw new Error(`${name} must be an integer between ${min} and ${max}`)
  return value
}

function allowedOrigins(): string[] {
  const configured = process.env.ALLOWED_ORIGINS?.split(',').map((value) => value.trim()).filter(Boolean)
  const origins = configured ?? ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3001', 'http://127.0.0.1:3001']
  if (!origins.length) throw new Error('ALLOWED_ORIGINS must include at least one origin')
  for (const origin of origins) {
    const url = new URL(origin)
    if (!['http:', 'https:'].includes(url.protocol) || url.origin !== origin) throw new Error('ALLOWED_ORIGINS entries must be complete HTTP(S) origins without paths')
  }
  return origins
}

export function readConfig() {
  const secure = process.env.SECURE_COOKIES ?? 'false'
  if (!['true', 'false'].includes(secure)) throw new Error('SECURE_COOKIES must be true or false')
  return {
    dbPath: resolve(process.env.DATABASE_PATH || 'data/guigong.sqlite'),
    port: integer('PORT', 3001, 1, 65535),
    host: process.env.HOST || '127.0.0.1',
    allowedOrigins: allowedOrigins(),
    sessionTtlMs: integer('SESSION_TTL_HOURS', 168, 1, 720) * 60 * 60_000,
    secureCookies: secure === 'true',
    staticDir: resolve('dist'),
  }
}
