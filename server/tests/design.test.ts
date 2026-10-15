import assert from 'node:assert/strict'
import { test } from 'node:test'
import { designConfigSchema, templates } from '../../shared/design.js'

const validConfig = {
  schemaVersion: 1, templateId: 'linglong', layers: 4, patternScale: 12,
  aperture: 0.55, material: 'ivory', separation: 0, cutaway: false,
  autoRotate: false, activeLayer: 0,
}

test('accepts a complete, bounded design config and rejects unknown or impossible values', () => {
  assert.equal(designConfigSchema.safeParse(validConfig).success, true)
  for (const change of [
    { schemaVersion: 2 }, { templateId: 'missing' }, { layers: 1 }, { layers: 7 },
    { layers: 2.5 }, { patternScale: 7 }, { patternScale: 25 }, { aperture: 0.34 },
    { aperture: 0.81 }, { material: 'gold' }, { separation: -0.1 }, { separation: 1.1 },
    { activeLayer: -1 }, { activeLayer: 5 }, { autoRotate: 'yes' }, { unexpected: true },
  ]) assert.equal(designConfigSchema.safeParse({ ...validConfig, ...change }).success, false, JSON.stringify(change))
})

test('exposes three distinct templates whose complete configs pass runtime validation', () => {
  assert.deepEqual(templates.map((template) => template.id), ['linglong', 'ruyi', 'lianhua'])
  for (const template of templates) {
    assert.equal(template.config.templateId, template.id)
    assert.equal(designConfigSchema.safeParse(template.config).success, true)
    assert.ok(template.name.length && template.description.length)
  }
})
