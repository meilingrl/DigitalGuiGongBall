import assert from 'node:assert/strict'
import test from 'node:test'
import { defaultConfigs, designConfigSchema } from '../shared/design'
import { inspirations } from '../shared/inspirations'
import { createObservationConfig, findStudy, studies, studyCreationPath } from '../src/data/studies'

test('every public study carries its canonical inspiration into the matching editor template', () => {
  for (const inspiration of inspirations) {
    const study = findStudy(inspiration.id)
    assert.ok(study)
    const path = new URL(studyCreationPath(study), 'https://local.invalid')
    assert.equal(path.pathname, '/atelier')
    assert.equal(path.searchParams.get('template'), inspiration.templateId)
    assert.equal(path.searchParams.get('inspiration'), inspiration.id)
    assert.equal(path.searchParams.has('design'), false)
  }
  assert.equal(studies.length, inspirations.length)
})

test('creation URL preserves the actual observation configuration for each guide', () => {
  for (const study of studies) {
    const config = {
      ...createObservationConfig(study.id, 'separated')!,
      patternScale: 21, aperture: 0.71, cutaway: true, separation: 0.65,
      activeLayer: 2, material: 'bronze' as const, autoRotate: true,
    }
    const path = new URL(studyCreationPath(study, config), 'https://local.invalid')
    assert.equal(path.searchParams.get('template'), study.templateId)
    assert.equal(path.searchParams.get('inspiration'), study.id)
    assert.deepEqual(JSON.parse(path.searchParams.get('design')!), config)
  }
})

test('creation URL excludes invalid and mismatched observation configurations', () => {
  const study = findStudy('nested-structure')!
  const fallback = studyCreationPath(study)
  assert.equal(studyCreationPath(study, { ...defaultConfigs.linglong, patternScale: 100 }), fallback)
  assert.equal(studyCreationPath(study, { ...defaultConfigs.linglong, activeLayer: 6 }), fallback)
  assert.equal(studyCreationPath(study, { ...defaultConfigs.ruyi }), fallback)
})

test('unknown study IDs never fall back to a different study or model', () => {
  for (const id of ['missing-study', '', ['nested-structure'], undefined]) {
    assert.equal(findStudy(id), undefined)
    assert.equal(createObservationConfig(id, 'whole'), undefined)
  }
})

test('observation steps produce valid, visibly distinct scene states', () => {
  for (const study of studies) {
    const whole = createObservationConfig(study.id, 'whole')!
    const cutaway = createObservationConfig(study.id, 'cutaway')!
    const separated = createObservationConfig(study.id, 'separated')!
    for (const config of [whole, cutaway, separated]) assert.ok(designConfigSchema.safeParse(config).success)
    assert.equal(whole.cutaway, false)
    assert.equal(whole.separation, 0)
    assert.equal(cutaway.cutaway, true)
    assert.equal(cutaway.separation, 0)
    assert.equal(separated.cutaway, false)
    assert.equal(separated.separation, 1)
    assert.equal(separated.activeLayer, 0)
    assert.equal(whole.autoRotate, false, 'motion starts only after a user action')
  }
})

test('public observation changes cannot mutate shared templates or a later reader session', () => {
  const baseline = structuredClone(defaultConfigs)
  const config = createObservationConfig('nested-structure', 'cutaway')!
  config.layers = 2
  config.aperture = 0.8
  config.activeLayer = 2
  assert.deepEqual(defaultConfigs, baseline)
  assert.deepEqual(createObservationConfig('nested-structure', 'whole'), baseline.linglong)
})
