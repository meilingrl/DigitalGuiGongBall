import assert from 'node:assert/strict'
import { once } from 'node:events'
import { mkdtemp, rm } from 'node:fs/promises'
import type { Server } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { TestContext } from 'node:test'
import { createApp, type AppOptions } from '../app.js'
import { defaultConfig } from '../../shared/design.js'

export const workInput = { title: '玲珑初作', description: '可恢复的作品', config: defaultConfig }
const origin = 'http://localhost:5173'

export async function workFixture(t: TestContext, options: Partial<AppOptions> = {}) {
  const directory = await mkdtemp(join(tmpdir(), 'guigong-lifecycle-'))
  const dbPath = join(directory, 'test.sqlite')
  let instance: ReturnType<typeof createApp>
  let server: Server
  let base: string
  async function open() {
    instance = createApp({ dbPath, allowedOrigins: [origin], ...options })
    server = instance.app.listen(0, '127.0.0.1')
    await once(server, 'listening')
    const address = server.address()
    assert.ok(address && typeof address !== 'string')
    base = `http://127.0.0.1:${address.port}`
  }
  async function close() {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
    instance.close()
  }
  await open()
  t.after(async () => { await close(); await rm(directory, { recursive: true, force: true }) })
  async function rawRequest(path: string, options: { method?: string; body?: unknown; cookie?: string; key?: string; expectedUserId?: string } = {}) {
    const headers: Record<string, string> = { Origin: origin }
    if (options.cookie) headers.Cookie = options.cookie
    if (options.key !== undefined) headers['Idempotency-Key'] = options.key
    if (options.expectedUserId !== undefined) headers['X-Expected-User-Id'] = options.expectedUserId
    if (options.body !== undefined) headers['Content-Type'] = 'application/json'
    const response = await fetch(`${base}${path}`, {
      method: options.method ?? 'GET', headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    })
    return response
  }
  async function request(...args: Parameters<typeof rawRequest>) {
    const response = await rawRequest(...args)
    const text = await response.text()
    return { status: response.status, headers: response.headers, data: text ? JSON.parse(text) : null }
  }
  return {
    dbPath, request, rawRequest,
    async restart() { await close(); await open() },
    async signup(username = 'artisan') {
      const response = await request('/api/auth/register', {
        method: 'POST', body: { username, displayName: '创作者', password: 'test-pass-123' },
      })
      assert.equal(response.status, 201)
      const cookie = response.headers.get('set-cookie')?.split(';')[0]
      assert.ok(cookie)
      return cookie
    },
  }
}
