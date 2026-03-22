import { expect, test } from './fixtures'

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.locator('#login-email').fill('joao.goncalves')
  await page.locator('#login-password').fill('admin123!')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL('/')
}

/**
 * Clean up API keys created during tests via the API.
 */
async function deleteTestKeys(page: import('@playwright/test').Page, prefix: string) {
  const response = await page.request.get('/api/keys')
  if (!response.ok())
    return
  const keys = await response.json() as { id: string, name: string }[]
  for (const key of keys) {
    if (key.name.startsWith(prefix)) {
      await page.request.delete(`/api/keys/${key.id}`)
    }
  }
}

const TEST_PREFIX = 'PW_TEST_'

test.describe('API Keys page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/api-keys')
    await page.getByTestId('api-keys-page').waitFor()
  })

  test.afterEach(async ({ page }) => {
    await deleteTestKeys(page, TEST_PREFIX)
  })

  test('shows default state with create button and usage section', async ({ page }) => {
    await expect(page.getByTestId('create-key-button')).toBeVisible()
    await expect(page.getByTestId('usage-section')).toBeVisible()
    await expect(page.getByTestId('key-revealed')).not.toBeVisible()
    await expect(page.getByTestId('create-key-form')).not.toBeVisible()
  })

  test('opens and closes create form', async ({ page }) => {
    await expect(page.getByTestId('create-key-form')).not.toBeVisible()

    await page.getByTestId('create-key-button').click()
    await expect(page.getByTestId('create-key-form')).toBeVisible()
    await expect(page.getByTestId('key-name-input')).toBeVisible()

    // Generate button should be disabled with empty name
    await expect(page.getByTestId('generate-key-button').locator('button')).toBeDisabled()

    await page.getByTestId('cancel-create-button').click()
    await expect(page.getByTestId('create-key-form')).not.toBeVisible()
  })

  test('generates a key and shows reveal state', async ({ page }) => {
    await page.getByTestId('create-key-button').click()
    await page.getByTestId('key-name-input').fill(`${TEST_PREFIX}Reveal`)
    await page.getByTestId('generate-key-button').click()

    // Reveal state
    await expect(page.getByTestId('key-revealed')).toBeVisible()
    const keyValue = await page.getByTestId('revealed-key-value').textContent()
    expect(keyValue?.trim()).toMatch(/^rl_/)

    // Copy and test sections visible
    await expect(page.getByTestId('copy-key-button')).toBeVisible()
    await expect(page.getByTestId('test-key-section')).toBeVisible()
    const curlText = await page.getByTestId('curl-command').textContent()
    expect(curlText).toContain('Authorization: Bearer')

    // Default UI hidden during reveal
    await expect(page.getByTestId('create-key-button')).not.toBeVisible()
    await expect(page.getByTestId('usage-section')).not.toBeVisible()

    // Done returns to default state
    await page.getByTestId('done-button').click()
    await expect(page.getByTestId('key-revealed')).not.toBeVisible()
    await expect(page.getByTestId('create-key-button')).toBeVisible()
  })

  test('shows created key in table after dismissing reveal', async ({ page }) => {
    const keyName = `${TEST_PREFIX}Table`

    await page.getByTestId('create-key-button').click()
    await page.getByTestId('key-name-input').fill(keyName)
    await page.getByTestId('generate-key-button').click()
    await expect(page.getByTestId('key-revealed')).toBeVisible()

    await page.getByTestId('done-button').click()

    await expect(page.getByTestId('keys-table')).toBeVisible()
    await expect(page.getByTestId(`key-row-${keyName}`)).toBeVisible()
  })

  test('revokes a key from the table', async ({ page }) => {
    const keyName = `${TEST_PREFIX}Revoke`

    await page.getByTestId('create-key-button').click()
    await page.getByTestId('key-name-input').fill(keyName)
    await page.getByTestId('generate-key-button').click()
    await page.getByTestId('done-button').click()
    await expect(page.getByTestId(`key-row-${keyName}`)).toBeVisible()

    // Revoke
    const row = page.getByTestId(`key-row-${keyName}`)
    await row.getByTestId('revoke-key-button').click()

    // Confirm dialog
    const dialog = page.getByRole('alertdialog')
    await expect(dialog).toBeVisible()
    await dialog.getByRole('button', { name: 'Revoke' }).click()

    await expect(page.getByTestId(`key-row-${keyName}`)).not.toBeVisible()
  })

  test('copy button shows copied feedback', async ({ page }) => {
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])

    await page.getByTestId('create-key-button').click()
    await page.getByTestId('key-name-input').fill(`${TEST_PREFIX}Copy`)
    await page.getByTestId('generate-key-button').click()
    await expect(page.getByTestId('key-revealed')).toBeVisible()

    await page.getByTestId('copy-key-button').click()
    await expect(page.getByTestId('copy-key-button')).toContainText('Copied')
    await expect(page.getByTestId('copy-key-button')).toContainText('Copy', { timeout: 5000 })
  })
})
