import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { startServer } from '../setup'

const ENV_FILE = join(__dirname, '.env.test')

export default async function globalSetup() {
  const baseUrl = await startServer()
  writeFileSync(ENV_FILE, baseUrl)
  // eslint-disable-next-line no-console
  console.log(`[playwright] Server started at ${baseUrl}`)
}
