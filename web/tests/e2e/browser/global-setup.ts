import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { startServer } from '../setup'

const currentDirectory = dirname(fileURLToPath(import.meta.url))
const ENV_FILE = join(currentDirectory, '.env.test')

export default async function globalSetup() {
  const baseUrl = await startServer()
  writeFileSync(ENV_FILE, baseUrl)
  // eslint-disable-next-line no-console
  console.log(`[playwright] Server started at ${baseUrl}`)
}
