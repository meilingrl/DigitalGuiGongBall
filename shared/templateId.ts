import { z } from 'zod'

export const templateIdSchema = z.enum(['linglong', 'ruyi', 'lianhua'])
export type TemplateId = z.infer<typeof templateIdSchema>
