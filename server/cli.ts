import { readConfig } from './config.js'
import { openDatabase } from './database.js'
import { demoCredentials, seedDatabase } from './seed.js'

const command = process.argv[2]
if (command !== 'init' && command !== 'seed') {
  console.error('Usage: tsx server/cli.ts <init|seed>')
  process.exitCode = 1
} else {
  const config = readConfig()
  const db = openDatabase(config.dbPath)
  try {
    if (command === 'seed') {
      const result = await seedDatabase(db)
      if (result.accountCreated) {
        console.log(`演示数据已就绪。公开本地体验账号: ${demoCredentials.username} / ${demoCredentials.password}`)
      } else {
        console.log('演示数据已就绪。demo 账号已存在，保留当前密码；未重置已有作品。')
      }
    } else {
      console.log('数据库已初始化。没有创建演示账号。')
    }
  } finally { db.close() }
}
