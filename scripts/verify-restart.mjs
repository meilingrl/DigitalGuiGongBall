import assert from 'node:assert/strict'
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
async function request(path, method = 'GET', body, cookie) {
  const response = await fetch(origin + path, { method, headers: { Origin: origin, ...(body ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}) }, body: body ? JSON.stringify(body) : undefined })
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
  const { data: { work } } = await request('/api/works', 'POST', { title: '跨进程保存', description: '测试专用', config }, cookie)
  await stop()
  await start()
  const reopened = await request(`/api/works/${work.id}`, 'GET', undefined, cookie)
  assert.deepEqual(reopened.data.work, work)
  assert.equal((await request('/api/auth/me', 'GET', undefined, cookie)).data.user.username, 'restart_qa')
  const updated = await request(`/api/works/${work.id}`, 'PUT', { title: '强制终止后仍存在', description: '', config: { ...config, material: 'jade' }, version: 1 }, cookie)
  await stop('SIGKILL')
  await start()
  assert.deepEqual((await request(`/api/works/${work.id}`, 'GET', undefined, cookie)).data.work, updated.data.work)
  const freshLogin = await request('/api/auth/login', 'POST', { username: 'restart_qa', password: 'OnlyForThisTest2026!' })
  const freshCookie = freshLogin.headers.get('set-cookie').split(';')[0]
  assert.equal((await request('/api/works', 'GET', undefined, freshCookie)).data.works[0].version, 2)
  console.log('PASS: empty DB → registration → save → SIGTERM restart → update → SIGKILL restart → relogin/read; real compiled HTTP server and SPA fallback')
} finally {
  await stop()
  await rm(directory, { recursive: true, force: true })
}
