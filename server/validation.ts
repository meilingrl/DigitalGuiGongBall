import { z } from 'zod'
import { designConfigSchema } from '../shared/design.js'

const username = z.string().trim().min(3, '用户名需要 3–32 个字符').max(32, '用户名需要 3–32 个字符')
  .regex(/^[a-zA-Z0-9_]+$/, '用户名只能使用英文字母、数字和下划线').transform((value) => value.toLowerCase())
const password = z.string().min(8, '密码至少需要 8 个字符').max(128, '密码最多 128 个字符')

export const registerSchema = z.strictObject({
  username, password,
  displayName: z.string().trim().min(1, '请输入昵称').max(40, '昵称最多 40 个字符')
    .regex(/^[^\u0000]*$/u, '昵称不能包含空字符'),
})
export const loginSchema = z.strictObject({ username, password })

export const createWorkSchema = z.strictObject({
  title: z.string().trim().min(1, '请输入作品标题').max(80, '作品标题最多 80 个字符')
    .regex(/^[^\u0000]*$/u, '作品标题不能包含空字符'),
  description: z.string().max(1000, '作品说明最多 1000 个字符')
    .regex(/^[^\u0000]*$/u, '作品说明不能包含空字符'),
  config: designConfigSchema,
})
export const updateWorkSchema = createWorkSchema.extend({ version: z.number().int().positive().max(Number.MAX_SAFE_INTEGER) })
export const workSearchSchema = z.strictObject({ search: z.string().trim().max(80, '搜索内容最多 80 个字符').optional() })
