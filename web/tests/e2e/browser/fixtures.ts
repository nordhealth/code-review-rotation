import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test as base } from '@playwright/test'

const ENV_FILE = join(__dirname, '.env.test')

function getBaseUrl(): string {
  return readFileSync(ENV_FILE, 'utf-8').trim()
}

export const test = base.extend({
  // eslint-disable-next-line no-empty-pattern
  baseURL: [async ({}, use) => {
    await use(getBaseUrl())
  }, { scope: 'worker' }],
})

export { expect } from '@playwright/test'
