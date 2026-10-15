import { createApp } from './app.js'
import { readConfig } from './config.js'

const config = readConfig()
const instance = createApp(config)
const server = instance.app.listen(config.port, config.host, () => {
  console.log(`鬼工球 API: http://${config.host}:${config.port}`)
})

let closing = false
function shutdown() {
  if (closing) return
  closing = true
  server.close((error) => {
    instance.close()
    if (error) process.exitCode = 1
  })
  // A stuck client cannot keep a development process alive indefinitely.
  setTimeout(() => server.closeAllConnections(), 5000).unref()
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
server.on('error', (error) => {
  console.error(`API 启动失败: ${error.message}`)
  instance.close()
  process.exitCode = 1
})
