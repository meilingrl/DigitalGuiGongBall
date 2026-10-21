import { z } from 'zod'
import type { TemplateId } from './templateId.js'

export const inspirationIdSchema = z.enum(['nested-structure', 'openwork-rhythm', 'digital-heritage'])
export type InspirationId = z.infer<typeof inspirationIdSchema>

export const inspirations: { id: InspirationId; title: string; templateId: TemplateId; summary: string }[] = [
  { id: 'nested-structure', title: '看懂层层套叠', templateId: 'linglong', summary: '从完整球体走向内部，观察同心结构与层间空间。' },
  { id: 'openwork-rhythm', title: '发现纹样的节奏', templateId: 'ruyi', summary: '在开孔与留白之间，观察密度、光影和轮廓的关系。' },
  { id: 'digital-heritage', title: '用数字延续好奇', templateId: 'lianhua', summary: '以数字材料和原创纹样，尝试属于自己的结构表达。' },
]

export function findInspiration(id: unknown) {
  return inspirations.find(item => item.id === id)
}
