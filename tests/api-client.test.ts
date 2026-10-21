import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer, type RequestListener } from 'node:http'
import { api, ApiError } from '../src/lib/api.js'

async function withServer(handler: RequestListener, action: (url: string) => Promise<void>) {
  const server = createServer(handler)
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  const address = server.address() as { port: number }
  try { await action(`http://127.0.0.1:${address.port}`) }
  finally { await new Promise<void>(resolve => server.close(() => resolve())) }
}

test('API client sends real JSON requests and parses the server response', async () => {
  await withServer((req, res) => {
    assert.equal(req.method, 'POST')
    assert.equal(req.headers['content-type'], 'application/json')
    let body = ''
    req.on('data', data => { body += data })
    req.on('end', () => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ title: JSON.parse(body).title })) })
  }, async url => {
    assert.deepEqual(await api(url, { method: 'POST', body: { title: '玲珑' } }), { title: '玲珑' })
  })
})

test('API client preserves 409 conflict instead of reporting success', async () => {
  await withServer((_req, res) => {
    res.writeHead(409, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: { code: 'VERSION_CONFLICT', message: '作品已有更新，请重新打开' } }))
  }, async url => {
    await assert.rejects(api(url), (error: unknown) => error instanceof ApiError && error.status === 409 && error.message.includes('重新打开'))
  })
})

test('API client reports non-JSON proxy failures and does not synthesize data', async () => {
  await withServer((_req, res) => { res.writeHead(502); res.end('<html>Bad gateway</html>') }, async url => {
    await assert.rejects(api(url), (error: unknown) => error instanceof ApiError && error.status === 502)
  })
})

test('API client accepts logout without a JSON response', async () => {
  await withServer((_req, res) => { res.writeHead(204); res.end() }, async url => {
    assert.equal(await api(url, { method: 'POST' }), undefined)
  })
})

test('API client transmits an idempotency key unchanged for a real write request', async () => {
  const key = '518bbd3a-d913-49c1-9e20-4c1cb8d7f66b'
  await withServer((req, res) => {
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ key: req.headers['idempotency-key'] }))
  }, async url => {
    assert.deepEqual(await api(url, { method: 'POST', body: { title: '唯一请求' }, idempotencyKey: key }), { key })
  })
})

test('API client binds work reads and writes to the expected authenticated principal header', async () => {
  await withServer((req, res) => {
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ expected: req.headers['x-expected-user-id'], method: req.method }))
  }, async url => {
    assert.deepEqual(await api(url, { expectedUserId: 'current-user' }), { expected: 'current-user', method: 'GET' })
    assert.deepEqual(await api(url, { method: 'POST', body: {}, expectedUserId: 'current-user' }), { expected: 'current-user', method: 'POST' })
  })
})
