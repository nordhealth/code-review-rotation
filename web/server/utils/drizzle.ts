import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'
import { drizzle } from 'drizzle-orm/libsql'
import * as schema from '../db/schema'

export * from '../db/schema'
export { and, asc, desc, eq, inArray, sql } from 'drizzle-orm'

const databaseDirectory = resolve(process.cwd(), '.data/db')
mkdirSync(databaseDirectory, { recursive: true })

export const db = drizzle({ connection: { url: `file:${databaseDirectory}/sqlite.db` }, schema })
