/**
 * Per-test-file server setup.
 *
 * Each test server uses .data/db/sqlite-test.db — completely separate from
 * the dev database (sqlite.db). The build output is patched once on first
 * startServer() call to point to the test DB.
 *
 * Tests can run while the dev server is running without conflicts.
 */
import type { Buffer } from 'node:buffer'
import type { ChildProcess } from 'node:child_process'
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { createClient } from '@libsql/client'

const currentDirectory = dirname(fileURLToPath(import.meta.url))

let serverProcess: ChildProcess | null = null
let baseUrl = ''
let patched = false

const LISTENING_PATTERN = /Listening on\s+(http:\/\/\S+)/
const TRAILING_SLASH_PATTERN = /\/$/
const OUTPUT_DIR = resolve(currentDirectory, '../../.output')
const LIBSQL_VERSION_SUFFIX = /@.*$/

const TEST_DB_DIR = resolve(currentDirectory, '../../.data/db')
const TEST_DB_PATH = resolve(TEST_DB_DIR, 'sqlite-test.db')
const DB_MODULE_PATH = join(OUTPUT_DIR, 'server/node_modules/@nuxthub/db/db.mjs')
const NITRO_BUNDLE_PATH = join(OUTPUT_DIR, 'server/chunks/nitro/nitro.mjs')
const DEV_DB_FILENAME = 'sqlite.db'
const TEST_DB_FILENAME = 'sqlite-test.db'

/** Return a random port in the ephemeral range (10000–60000). */
function randomPort() {
  return 10000 + Math.floor(Math.random() * 50000)
}

export function getBaseUrl() {
  return baseUrl
}

/**
 * Query the test database directly via @libsql/client.
 * Useful for reading tokens/state the API doesn't expose in production mode.
 */
export async function queryTestDb(sql: string, args: unknown[] = []) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const client = createClient({ url: `file:${TEST_DB_PATH}` })
      const result = await client.execute({ sql, args: args as never[] })
      client.close()
      return result.rows
    }
    catch {
      if (attempt < 2) {
        await new Promise(resolve => setTimeout(resolve, 500))
        continue
      }
      throw new Error(`queryTestDb failed after 3 attempts: ${sql}`)
    }
  }
  return []
}

/**
 * Register a user, confirm them via DB, and return their session cookie.
 * Useful for testing non-admin authorization.
 */
export async function registerAndConfirmUser(
  baseUrl: string,
  email: string,
  password: string,
  firstName: string,
  lastName: string,
): Promise<string> {
  await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, firstName, lastName }),
  })

  await queryTestDb(
    'UPDATE users SET email_confirmed = 1, confirmation_token = NULL WHERE email = ?',
    [email],
  )

  const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const setCookie = loginResponse.headers.get('set-cookie')
  return setCookie?.split(';')[0] ?? ''
}

/**
 * Patch the build output to use sqlite-test.db instead of sqlite.db.
 * Simple string replacement — keeps valid JSON, no env vars needed.
 * Only patches once per test run.
 */
function patchDbModule() {
  if (patched)
    return

  for (const filePath of [DB_MODULE_PATH, NITRO_BUNDLE_PATH]) {
    if (!existsSync(filePath))
      continue

    const content = readFileSync(filePath, 'utf-8')
    if (content.includes(TEST_DB_FILENAME))
      continue

    writeFileSync(filePath, content.replaceAll(DEV_DB_FILENAME, TEST_DB_FILENAME))
  }

  patched = true
}

/**
 * Create a fresh test database with migrations applied.
 */
async function resetTestDb() {
  mkdirSync(TEST_DB_DIR, { recursive: true })
  // Remove existing test DB and any WAL/journal files for a clean slate
  for (const suffix of ['', '-wal', '-shm', '-journal']) {
    const filePath = TEST_DB_PATH + suffix
    if (existsSync(filePath)) {
      rmSync(filePath)
    }
  }

  const client = createClient({ url: `file:${TEST_DB_PATH}` })
  const migrationsDir = resolve(currentDirectory, '../../server/db/migrations')

  if (existsSync(migrationsDir)) {
    const sqlFiles = readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort()

    for (const file of sqlFiles) {
      const sql = readFileSync(join(migrationsDir, file), 'utf-8')
      const statements = sql
        .split('--> statement-breakpoint')
        .map(statement => statement.trim())
        .filter(Boolean)

      for (const statement of statements) {
        await client.execute(statement)
      }
    }
  }

  // Enable WAL mode for concurrent access (server + queryTestDb)
  await client.execute('PRAGMA journal_mode=WAL')

  client.close()
}

export async function startServer(): Promise<string> {
  // Symlink native SQLite modules into build output (platform-agnostic)
  const pnpmLibsqlDir = resolve(currentDirectory, '../../node_modules/.pnpm')
  if (existsSync(pnpmLibsqlDir)) {
    const libsqlDirs = readdirSync(pnpmLibsqlDir).filter(
      directory => directory.startsWith('@libsql+') && !directory.startsWith('@libsql+client'),
    )
    for (const directory of libsqlDirs) {
      const platformName = directory.replace('@libsql+', '').replace(LIBSQL_VERSION_SUFFIX, '')
      const target = resolve(OUTPUT_DIR, `server/node_modules/@libsql/${platformName}`)
      if (!existsSync(target)) {
        const source = resolve(pnpmLibsqlDir, directory, `node_modules/@libsql/${platformName}`)
        if (existsSync(source)) {
          mkdirSync(resolve(OUTPUT_DIR, 'server/node_modules/@libsql'), { recursive: true })
          symlinkSync(source, target)
        }
      }
    }
  }

  // Patch build to use test DB and create a fresh one with migrations
  patchDbModule()
  await resetTestDb()

  return new Promise((resolvePromise, reject) => {
    const timeout = setTimeout(() => reject(new Error('Server startup timed out')), 15000)

    serverProcess = spawn('node', [resolve(OUTPUT_DIR, 'server/index.mjs')], {
      env: {
        ...process.env,
        PORT: String(randomPort()),
        NUXT_SESSION_PASSWORD: 'test-session-password-at-least-32-chars!!',
        NUXT_API_KEY: 'test-api-key',
        NUXT_RESEND_API_KEY: '',
        NODE_ENV: 'production',
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    serverProcess.stdout?.on('data', (data: Buffer) => {
      const output = data.toString()
      const match = output.match(LISTENING_PATTERN)
      if (match) {
        clearTimeout(timeout)
        baseUrl = match[1].replace(TRAILING_SLASH_PATTERN, '')
        resolvePromise(baseUrl)
      }
    })

    serverProcess.stderr?.on('data', (data: Buffer) => {
      const output = data.toString()
      if (output.includes('EADDRINUSE')) {
        clearTimeout(timeout)
        reject(new Error('Port already in use'))
      }
    })

    serverProcess.on('error', (error) => {
      clearTimeout(timeout)
      reject(error)
    })

    serverProcess.on('exit', (code) => {
      if (code !== null && code !== 0) {
        clearTimeout(timeout)
        reject(new Error(`Server exited with code ${code}`))
      }
    })
  })
}

export function stopServer() {
  if (serverProcess) {
    serverProcess.kill('SIGTERM')
    serverProcess = null
  }
}
