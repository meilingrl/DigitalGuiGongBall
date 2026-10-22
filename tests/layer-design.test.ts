import assert from 'node:assert/strict'
import { test } from 'node:test'
import { reactive } from 'vue'
import { defaultConfig, defaultConfigs, designConfigSchema } from '../shared/design.js'
import { cloneDesign } from '../src/lib/draft.js'
import { getLayerPattern, withLayerPattern } from '../shared/layerDesign.js'

const outer = { templateId: 'lianhua' as const, patternScale: 10, aperture: .7 }
const inner = { templateId: 'ruyi' as const, patternScale: 20, aperture: .4 }
const configV2 = { ...defaultConfig, schemaVersion: 2 as const, layerPatterns: { outer, inner } }

test('accepts complete v2 roles without losing either independent layer pattern', () => {
  const result = designConfigSchema.safeParse(configV2)
  assert.equal(result.success, true)
  if (result.success) assert.deepEqual(result.data, configV2)
})

test('keeps v1 output and serialized field order unchanged for drafts and pending requests', () => {
  for (const config of Object.values(defaultConfigs)) {
    const parsed = designConfigSchema.parse(config)
    assert.deepEqual(parsed, config)
    assert.equal(JSON.stringify(parsed), JSON.stringify(config))
    assert.equal('layerPatterns' in parsed, false)
  }
})

for (const [name, change] of [
  ['missing roles', { layerPatterns: undefined }],
  ['missing outer', { layerPatterns: { inner } }],
  ['missing inner', { layerPatterns: { outer } }],
  ['unknown role', { layerPatterns: { outer, inner, middle: outer } }],
  ['unknown version', { schemaVersion: 3 }],
  ['unknown root field', { unexpected: true }],
  ['invalid focus', { activeLayer: 5 }],
] as const) {
  test(`rejects v2 ${name}`, () => {
    assert.equal(designConfigSchema.safeParse({ ...configV2, ...change }).success, false)
  })
}
for (const role of ['outer', 'inner'] as const) {
  for (const change of [
    { templateId: 'missing' }, { patternScale: 7 }, { patternScale: 25 }, { patternScale: 12.5 },
    { aperture: .34 }, { aperture: .81 }, { aperture: Number.NaN }, { aperture: Infinity },
    { templateId: undefined }, { patternScale: undefined }, { aperture: undefined }, { extra: true },
  ]) {
    test(`rejects invalid ${role} layer ${JSON.stringify(change)}`, () => {
      assert.equal(designConfigSchema.safeParse({ ...configV2, layerPatterns: { ...configV2.layerPatterns, [role]: { ...configV2.layerPatterns[role], ...change } } }).success, false)
    })
  }
}

test('clones a reactive v2 design into independent plain layer objects', () => {
  const config = reactive(configV2)
  const copy = cloneDesign(config)
  assert.deepEqual(copy, configV2)
  assert.equal(copy.schemaVersion, 2)
  if (copy.schemaVersion !== 2) return
  copy.layerPatterns.outer.patternScale = 24
  copy.layerPatterns.inner.aperture = .8
  assert.equal(config.layerPatterns.outer.patternScale, 10)
  assert.equal(config.layerPatterns.inner.aperture, .4)
  assert.doesNotThrow(() => structuredClone(copy))
})

for (const role of ['outer', 'inner'] as const) {
  test(`first ${role} edit initializes both roles from v1 and keeps the other role and defaults intact`, () => {
    const original = { ...defaultConfig, material: 'jade' as const, separation: .6, activeLayer: 2 }
    const before = structuredClone(original)
    const changed = withLayerPattern(reactive(original), role, role === 'outer' ? outer : inner)
    const root = { templateId: 'linglong', patternScale: 12, aperture: .55 }
    assert.deepEqual(changed, {
      ...before, schemaVersion: 2,
      layerPatterns: { outer: role === 'outer' ? outer : root, inner: role === 'inner' ? inner : root },
    })
    assert.deepEqual(original, before)
    assert.deepEqual(getLayerPattern(changed, 1), root)
    assert.doesNotThrow(() => structuredClone(changed))
    changed.layerPatterns.outer.aperture = .8
    assert.equal(changed.layerPatterns.inner.aperture, role === 'inner' ? .4 : .55)
    assert.deepEqual(original, before)
  })

  test(`editing v2 ${role} preserves all unedited values and returns independent roles`, () => {
    const original = cloneDesign(configV2)
    const changed = withLayerPattern(reactive(original), role, { patternScale: 24 })
    assert.deepEqual(changed, { ...configV2, layerPatterns: { ...configV2.layerPatterns, [role]: { ...configV2.layerPatterns[role], patternScale: 24 } } })
    assert.deepEqual(original, configV2)
    changed.layerPatterns.outer.aperture = .8
    changed.layerPatterns.inner.aperture = .8
    assert.deepEqual(original, configV2)
  })
}

test('effective layer patterns follow outer and inner roles across layer count changes', () => {
  const root = { templateId: 'linglong', patternScale: 12, aperture: .55 }
  for (const layers of [2, 3, 6]) {
    const resized = { ...configV2, layers }
    assert.deepEqual(getLayerPattern(resized, 0), outer)
    assert.deepEqual(getLayerPattern(resized, layers - 1), inner)
    for (let index = 1; index < layers - 1; index++) assert.deepEqual(getLayerPattern(resized, index), root)
    for (let index = 0; index < layers; index++) assert.deepEqual(getLayerPattern({ ...defaultConfig, layers }, index), root)
  }
})

test('resolved patterns are independent three-field values, including the legacy and middle defaults', () => {
  for (const [config, index, expected] of [[defaultConfig, 0, { templateId: 'linglong', patternScale: 12, aperture: .55 }], [configV2, 0, outer], [configV2, 1, { templateId: 'linglong', patternScale: 12, aperture: .55 }], [configV2, 3, inner]] as const) {
    const before = structuredClone(config)
    const pattern = getLayerPattern(config, index)
    assert.deepEqual({ ...pattern }, expected)
    pattern.patternScale = 24
    assert.deepEqual(config, before)
  }
})
