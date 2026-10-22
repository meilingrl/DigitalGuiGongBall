import { z } from 'zod'
import { templateIdSchema } from './templateId.js'

export const layerPatternSchema = z.strictObject({
  templateId: templateIdSchema,
  patternScale: z.number().int().min(8).max(24),
  aperture: z.number().min(0.35).max(0.8),
})

export type LayerRole = 'outer' | 'inner'
export type LayerPattern = z.infer<typeof layerPatternSchema>
