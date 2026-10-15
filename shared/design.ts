import { z } from 'zod'

export const templateIdSchema = z.enum(['linglong', 'ruyi', 'lianhua'])
export const designConfigSchema = z.strictObject({
  schemaVersion: z.literal(1),
  templateId: templateIdSchema,
  layers: z.number().int().min(2).max(6),
  patternScale: z.number().int().min(8).max(24),
  aperture: z.number().min(0.35).max(0.8),
  material: z.enum(['ivory', 'jade', 'bronze']),
  separation: z.number().min(0).max(1),
  cutaway: z.boolean(),
  autoRotate: z.boolean(),
  activeLayer: z.number().int().min(0).max(6),
}).refine((config) => config.activeLayer <= config.layers, {
  message: '聚焦层不能超过球体层数', path: ['activeLayer'],
})

export type DesignConfig = z.infer<typeof designConfigSchema>
export type TemplateId = DesignConfig['templateId']

export interface User {
  id: string
  username: string
  displayName: string
}

export interface Work {
  id: string
  title: string
  description: string
  config: DesignConfig
  version: number
  createdAt: string
  updatedAt: string
}

export interface Template {
  id: TemplateId
  name: string
  subtitle: string
  description: string
  config: DesignConfig
}

export const defaultConfigs: Record<TemplateId, DesignConfig> = {
  linglong: {
    schemaVersion: 1, templateId: 'linglong', layers: 4, patternScale: 12,
    aperture: 0.55, material: 'ivory', separation: 0, cutaway: false,
    autoRotate: false, activeLayer: 0,
  },
  ruyi: {
    schemaVersion: 1, templateId: 'ruyi', layers: 3, patternScale: 16,
    aperture: 0.48, material: 'jade', separation: 0, cutaway: false,
    autoRotate: false, activeLayer: 0,
  },
  lianhua: {
    schemaVersion: 1, templateId: 'lianhua', layers: 5, patternScale: 10,
    aperture: 0.62, material: 'bronze', separation: 0, cutaway: false,
    autoRotate: false, activeLayer: 0,
  },
}

export const defaultConfig: DesignConfig = defaultConfigs.linglong

export const templates: Template[] = [
  {
    id: 'linglong', name: '玲珑', subtitle: '层层相套，通透有序',
    description: '均匀排布的圆形镂空与四层同心球，适合探索鬼工球的基本空间结构。',
    config: defaultConfigs.linglong,
  },
  {
    id: 'ruyi', name: '如意', subtitle: '流转曲线，温润如玉',
    description: '以舒展的如意轮廓形成错落开孔，搭配青玉材质与三层球体。',
    config: defaultConfigs.ruyi,
  },
  {
    id: 'lianhua', name: '莲华', subtitle: '花瓣交叠，内外相映',
    description: '莲瓣韵律与五层球体交织，借青铜色泽观察层次和光影变化。',
    config: defaultConfigs.lianhua,
  },
]
