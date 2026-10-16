import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { spawn } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'node:net'

// Separate process + separate database: never use the developer's demonstration data.
const directory = await mkdtemp(join(tmpdir(), 'guigong-restart-'))
const reservation = createServer()
await new Promise(resolve => reservation.listen(0, '127.0.0.1', resolve))
const port = reservation.address().port
await new Promise(resolve => reservation.close(resolve))
const origin = `http://127.0.0.1:${port}`
let child
let ended
let output = ''
let expectedUserId
const config = { schemaVersion: 1, templateId: 'lianhua', layers: 5, patternScale: 12, aperture: .65, material: 'bronze', separation: .6, cutaway: true, autoRotate: false, activeLayer: 0 }

async function start() {
  output = ''
  child = spawn(process.execPath, ['dist-server/server/index.js'], {
    cwd: process.cwd(), env: { ...process.env, HOST: '127.0.0.1', PORT: String(port), DATABASE_PATH: join(directory, 'fresh.sqlite'), ALLOWED_ORIGINS: origin, SECURE_COOKIES: 'false' },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  child.stdout.on('data', data => { output += data.toString() })
  child.stderr.on('data', data => { output += data.toString() })
  ended = new Promise((resolve, reject) => { child.once('exit', resolve); child.once('error', reject) })
  const deadline = Date.now() + 15000
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Server exited: ${output}`)
    try { if ((await fetch(`${origin}/api/health`)).ok) return }
    catch { /* readiness polling, not a substitute for the assertions below */ }
    await new Promise(resolve => setTimeout(resolve, 40))
  }
  throw new Error(`Server not ready: ${output}`)
}
async function stop(signal = 'SIGTERM') {
  if (!child || child.exitCode !== null) return
  child.kill(signal)
  await ended
  child = undefined
}
async function request(path, method = 'GET', body, cookie, key) {
  const response = await fetch(origin + path, { method, headers: { Origin: origin, ...(body ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}), ...(key ? { 'Idempotency-Key': key } : {}), ...(expectedUserId && path.startsWith('/api/works') ? { 'X-Expected-User-Id': expectedUserId } : {}) }, body: body ? JSON.stringify(body) : undefined })
  const data = await response.json()
  assert.ok(response.ok, `HTTP ${response.status} ${data.error?.code ?? ''}`)
  return { data, headers: response.headers }
}
try {
  await start()
  const page = await fetch(origin + '/hub/workshop')
  assert.equal(page.status, 200)
  assert.match(await page.text(), /<div id="app"><\/div>/)
  const login = await request('/api/auth/register', 'POST', { username: 'restart_qa', displayName: '隔离测试', password: 'OnlyForThisTest2026!' })
  const cookie = login.headers.get('set-cookie').split(';')[0]
  expectedUserId = login.data.user.id
  const createKey = randomUUID()
  const createBody = { title: '跨进程保存', description: '测试专用', config }
  const { data: { work } } = await request('/api/works', 'POST', createBody, cookie, createKey)
  await stop()
  await start()
  assert.deepEqual((await request('/api/works', 'POST', createBody, cookie, createKey)).data.work, work)
  assert.equal((await request('/api/works', 'GET', undefined, cookie)).data.pagination.total, 1)
  const reopened = await request(`/api/works/${work.id}`, 'GET', undefined, cookie)
  assert.deepEqual(reopened.data.work, work)
  assert.equal((await request('/api/auth/me', 'GET', undefined, cookie)).data.user.username, 'restart_qa')
  const updateKey = randomUUID()
  const updateBody = { title: '强制终止后仍存在', description: '', config: { ...config, material: 'jade' }, version: 1 }
  const updated = await request(`/api/works/${work.id}`, 'PUT', updateBody, cookie, updateKey)
  const copyKey = randomUUID()
  const copied = await request(`/api/works/${work.id}/duplicate`, 'POST', { version: 2 }, cookie, copyKey)
  const trashKey = randomUUID()
  const trashed = await request(`/api/works/${copied.data.work.id}/trash`, 'POST', { version: 1 }, cookie, trashKey)
  await stop('SIGKILL')
  await start()
  assert.deepEqual((await request(`/api/works/${work.id}`, 'GET', undefined, cookie)).data.work, updated.data.work)
  assert.deepEqual((await request(`/api/works/${work.id}`, 'PUT', updateBody, cookie, updateKey)).data.work, updated.data.work)
  assert.deepEqual((await request(`/api/works/${work.id}/duplicate`, 'POST', { version: 2 }, cookie, copyKey)).data.work, copied.data.work)
  assert.deepEqual((await request(`/api/works/${copied.data.work.id}/trash`, 'POST', { version: 1 }, cookie, trashKey)).data.work, trashed.data.work)
  const trashList = (await request('/api/works?state=trash', 'GET', undefined, cookie)).data
  assert.equal(trashList.pagination.total, 1)
  assert.deepEqual(trashList.works[0], trashed.data.work)
  const restored = await request(`/api/works/${copied.data.work.id}/restore`, 'POST', { version: 2 }, cookie, randomUUID())
  assert.equal(restored.data.work.version, 3)
  assert.equal(restored.data.work.deletedAt, null)
  assert.equal((await request('/api/works', 'GET', undefined, cookie)).data.pagination.total, 2)
  const freshLogin = await request('/api/auth/login', 'POST', { username: 'restart_qa', password: 'OnlyForThisTest2026!' })
  const freshCookie = freshLogin.headers.get('set-cookie').split(';')[0]
  assert.equal((await request(`/api/works/${work.id}`, 'GET', undefined, freshCookie)).data.work.version, 2)
  const otherLogin = await request('/api/auth/register', 'POST', { username: 'other_restart_qa', displayName: '另一个隔离账号', password: 'OnlyForThisTest2026!' })
  const otherCookie = otherLogin.headers.get('set-cookie').split(';')[0]
  const drift = await fetch(origin + '/api/works', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', Cookie: otherCookie, 'Idempotency-Key': createKey, 'X-Expected-User-Id': expectedUserId }, body: JSON.stringify(createBody) })
  assert.equal(drift.status, 401)
  assert.equal((await drift.json()).error.code, 'ACCOUNT_CHANGED')
  const otherList = await fetch(origin + '/api/works', { headers: { Cookie: otherCookie } })
  assert.equal((await otherList.json()).pagination.total, 0)
  console.log('PASS: empty DB → registration/save → SIGTERM → create replay → update/copy/trash → SIGKILL → all replays → restore/relogin/principal guard; real compiled HTTP server and SPA fallback')
} finally {
  await stop()
  await rm(directory, { recursive: true, force: true })
}
