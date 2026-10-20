import { test } from 'node:test'
import assert from 'node:assert/strict'
import { safeReturnPath, readCreationConfig } from '../src/lib/journey.js'
import { defaultConfigs } from '../shared/design.js'

test('login returns to the original local creative intent', () => {
  const intent = '/atelier?template=ruyi&inspiration=openwork-rhythm'
  assert.equal(safeReturnPath(intent), intent)
  assert.equal(safeReturnPath('/hub/works/123'), '/hub/works/123')
})

test('observation parameters survive login and invalid or mismatched designs are ignored', () => {
  const config = { ...defaultConfigs.ruyi, separation: 1, activeLayer: 2, aperture: .72 }
  const encoded = JSON.stringify(config)
  const intent = `/atelier?template=ruyi&inspiration=openwork-rhythm&design=${encodeURIComponent(encoded)}`
  assert.equal(safeReturnPath(intent), intent)
  assert.deepEqual(readCreationConfig('ruyi', encoded), config)
  assert.equal(readCreationConfig('linglong', encoded), undefined)
  assert.equal(readCreationConfig('ruyi', '{'), undefined)
  assert.equal(readCreationConfig('ruyi', JSON.stringify({ ...config, layers: 999 })), undefined)
  assert.equal(readCreationConfig('ruyi', [encoded]), undefined)
})

test('login rejects external, encoded, ambiguous and recursive return targets', () => {
  for (const path of ['https://evil.test', '//evil.test', '/\\evil.test', '/login?redirect=/atelier', '/%2f%2fevil.test', '/hub/../login', ['/atelier'], '/atelier\n', '/unknown', '/atelier#\u0000']) {
    assert.equal(safeReturnPath(path), '/hub/home', String(path))
  }
})
