/**
 * Per-test-file server setup.
 *
 * Starts a Nitro production server on a random port.
 * The server uses the pre-built .output directory.
 *
 * All test files share the same .data/db/sqlite.db database.
 * Tests MUST use unique names/emails (via RUN_ID) to avoid collisions.
 */
import type { Buffer } from 'node:buffer'
import type { ChildProcess } from 'node:child_process'
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, symlinkSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'
import { createClient } from '@libsql/client'

let serverProcess: ChildProcess | null = null
let baseUrl = ''

const LISTENING_PATTERN = /Listening on\s+(http:\/\/\S+)/
const TRAILING_SLASH_PATTERN = /\/$/
const OUTPUT_DIR = resolve(__dirname, '../../.output')
const LIBSQL_VERSION_SUFFIX = /@.*$/

const DATABASE_PATH = resolve(__dirname, '../../.data/db/sqlite.db')

export function getBaseUrl() {
  return baseUrl
}

/**
 * Query the shared test database directly via @libsql/client.
 * Useful for reading tokens/state the API doesn't expose in production mode.
 */
export async function queryTestDb(sql: string, args: unknown[] = []) {
  const client = createClient({ url: `file:${DATABASE_PATH}` })
  const result = await client.execute({ sql, args: args as never[] })
  client.close()
  return result.rows
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

  // Confirm via direct DB update
  await queryTestDb(
    'UPDATE users SET email_confirmed = 1, confirmation_token = NULL WHERE email = ?',
    [email],
  )

  // Login and return cookie
  const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const setCookie = loginResponse.headers.get('set-cookie')
  return setCookie?.split(';')[0] ?? ''
}

export async function startServer(): Promise<string> {
  // Ensure native SQLite module is available in the build output.
  // pnpm doesn't hoist @libsql/<platform> into .output/server/node_modules,
  // so we find it in the pnpm store and symlink it.
  const pnpmLibsqlDir = resolve(__dirname, '../../node_modules/.pnpm')
  if (existsSync(pnpmLibsqlDir)) {
    const libsqlDirs = readdirSync(pnpmLibsqlDir).filter(
      directory => directory.startsWith('@libsql+') && !directory.startsWith('@libsql+client'),
    )
    for (const directory of libsqlDirs) {
      // e.g. "@libsql+darwin-arm64@0.5.22" → "darwin-arm64"
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

  return new Promise((resolvePromise, reject) => {
    const timeout = setTimeout(() => reject(new Error('Server startup timed out')), 15000)

    serverProcess = spawn('node', [resolve(OUTPUT_DIR, 'server/index.mjs')], {
      env: {
        ...process.env,
        PORT: '0',
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
