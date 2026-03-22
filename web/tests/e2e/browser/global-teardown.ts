import { rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { stopServer } from '../setup'

const currentDirectory = dirname(fileURLToPath(import.meta.url))
const ENV_FILE = join(currentDirectory, '.env.test')

export default async function globalTeardown() {
  stopServer()
  try {
    rmSync(ENV_FILE)
  }
  catch {}
  // eslint-disable-next-line no-console
  console.log('[playwright] Server stopped')
}
