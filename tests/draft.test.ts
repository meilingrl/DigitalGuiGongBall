import { test } from 'node:test'
import assert from 'node:assert/strict'
import { reactive } from 'vue'
import { defaultConfig } from '../shared/design.js'
import { cloneDesign } from '../src/lib/draft.js'

test('clones a reactive editor config into independent plain JSON for the API', () => {
  const config = reactive({ ...defaultConfig })
  const copy = cloneDesign(config)
  assert.deepEqual(copy, defaultConfig)
  copy.layers = 6
  assert.equal(config.layers, defaultConfig.layers)
  assert.doesNotThrow(() => structuredClone(copy))
})
