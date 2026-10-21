import { defaultConfigs, type Work } from '../../shared/design.js'

/** Complete current Work fixture; legacy wire payloads must stay explicit. */
export function makeWork(overrides: Partial<Work> = {}): Work {
  return {
    id: 'a-work',
    title: '作品',
    description: '',
    version: 1,
    deletedAt: null,
    createdAt: '',
    updatedAt: '',
    inspirationId: null,
    previewVersion: null,
    ...overrides,
    config: structuredClone(overrides.config ?? defaultConfigs.linglong),
  }
}
