import { readConfig } from '../config.js'
import { backupDatabase, MaintenanceError, restoreDatabase } from './index.js'

const usage = 'Usage: tsx server/maintenance/cli.ts backup --to <new-file> [--from <existing-source>] | restore --from <snapshot> --to <new-file>'

function parseArguments(args: string[]): { command: 'backup' | 'restore'; from?: string; to: string } {
  const [command, ...rest] = args
  if (command !== 'backup' && command !== 'restore') throw new Error(usage)
  const flags = new Map<string, string>()
  for (let index = 0; index < rest.length; index += 2) {
    const name = rest[index]!
    const value = rest[index + 1]
    if (!['--from', '--to'].includes(name) || flags.has(name) || !value || value.startsWith('--')) throw new Error(usage)
    flags.set(name, value)
  }
  const to = flags.get('--to')
  const from = flags.get('--from')
  if (!to || (command === 'restore' && !from)) throw new Error(usage)
  return { command, from, to }
}

try {
  const args = parseArguments(process.argv.slice(2))
  const options = { from: args.from ?? readConfig().dbPath, to: args.to }
  const result = args.command === 'backup' ? backupDatabase(options) : restoreDatabase(options)
  console.log(JSON.stringify(result))
} catch (error) {
  if (error instanceof MaintenanceError) console.error(`${error.code}: ${error.message}`)
  else console.error(error instanceof Error && error.message === usage ? usage : 'CONFIG_ERROR: Unable to read maintenance configuration.')
  process.exitCode = 1
}
