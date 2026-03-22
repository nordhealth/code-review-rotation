import { rmSync } from 'node:fs'
import { join } from 'node:path'
import { stopServer } from '../setup'

const ENV_FILE = join(__dirname, '.env.test')

export default async function globalTeardown() {
  stopServer()
  try {
    rmSync(ENV_FILE)
  }
  catch {}
  // eslint-disable-next-line no-console
  console.log('[playwright] Server stopped')
}
