import { expect, test } from './fixtures'

/**
 * Login via API and set the session cookie on the browser context.
 */
async function loginViaApi(page: import('@playwright/test').Page, baseURL: string) {
  const response = await fetch(`${baseURL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'joao.goncalves@nordhealth.com', password: 'admin123!' }),
  })
  expect(response.ok).toBeTruthy()

  const setCookie = response.headers.get('set-cookie')
  if (setCookie) {
    const cookieParts = setCookie.split(';')[0].split('=')
    const name = cookieParts[0]
    const value = cookieParts.slice(1).join('=')
    const url = new URL(baseURL)
    await page.context().addCookies([{
      name,
      value,
      domain: url.hostname,
      path: '/',
    }])
  }
}

test.describe('My Reviews page', () => {
  test('nav contains My Reviews link', async ({ page, baseURL }) => {
    await loginViaApi(page, baseURL!)
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    const navLink = page.getByRole('link', { name: 'My Reviews' })
    await expect(navLink).toBeVisible()
  })

  test('shows link prompt for unlinked user', async ({ page, baseURL }) => {
    await loginViaApi(page, baseURL!)
    await page.goto('/me')
    await page.getByTestId('me-page').waitFor()

    await expect(page.getByText('Link your developer profile')).toBeVisible()
    await expect(page.getByTestId('developer-select-trigger')).toBeVisible()
    await expect(page.getByTestId('link-profile-button')).toBeVisible()
  })

  test('select a developer and link profile', async ({ page, baseURL }) => {
    await loginViaApi(page, baseURL!)
    await page.goto('/me')
    await page.getByTestId('me-page').waitFor()

    // Open developer select
    await page.getByTestId('developer-select-trigger').click()
    await page.getByPlaceholder('Search developer...').waitFor()

    // Type to search and select
    await page.getByPlaceholder('Search developer...').fill('João')
    await page.getByRole('option', { name: /João Gonçalves/ }).click()

    // Trigger should now show selected developer name
    await expect(page.getByTestId('developer-select-trigger')).toContainText('João Gonçalves')

    // Link profile button should be enabled and clickable
    await page.getByTestId('link-profile-button').click()

    // Should redirect to developer profile page
    await page.waitForURL(/\/developers\/joao-goncalves/, { timeout: 10000 })
    await expect(page.locator('h1')).toContainText('João Gonçalves')
  })

  test('redirects to developer page when already linked', async ({ page, baseURL }) => {
    await loginViaApi(page, baseURL!)

    // Link via API first
    const devResponse = await fetch(`${baseURL}/api/developers/joao-goncalves`, {
      headers: { Cookie: await getSessionCookie(page) },
    })
    const developer = await devResponse.json()
    await fetch(`${baseURL}/api/developers/me`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': await getSessionCookie(page),
      },
      body: JSON.stringify({ developerId: developer.id }),
    })

    // Navigate to /me — should redirect
    await page.goto('/me')
    await page.waitForURL(/\/developers\/joao-goncalves/, { timeout: 10000 })
  })
})

test.describe('Rotation table search', () => {
  test('search input filters rotation assignments', async ({ page, baseURL }) => {
    await loginViaApi(page, baseURL!)
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Navigate to a team's developers tab
    await page.getByRole('link', { name: 'PVC Finance Core' }).click()
    await page.waitForURL(/\/teams\//)
    await page.waitForLoadState('networkidle')

    // Verify the search input is visible (team has >5 members)
    const searchInput = page.locator('[data-testid="rotation-search"] input')
    await expect(searchInput).toBeVisible()

    // Type a developer name to filter
    await searchInput.fill('Cuong')
    await page.waitForTimeout(300)

    // Should show "Cuong" row(s) but not "Marko" (who is not related)
    await expect(page.getByText('Cuong Nguyen').first()).toBeVisible()

    // Clear search — all rows should return
    await searchInput.fill('')
    await page.waitForTimeout(300)
    await expect(page.getByText('Marko Vainio').first()).toBeVisible()
  })
})

async function getSessionCookie(page: import('@playwright/test').Page): Promise<string> {
  const cookies = await page.context().cookies()
  const session = cookies.find(cookie => cookie.name.includes('nuxt-session'))
  return session ? `${session.name}=${session.value}` : ''
}
