import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { queryTestDb, startServer, stopServer } from '../setup'

const isE2E = process.env.TEST_E2E === 'true'
const RUN = Date.now()

describe.skipIf(!isE2E)('auth happy paths (regression)', () => {
  let baseUrl: string

  beforeAll(async () => {
    baseUrl = await startServer()
  }, 20000)

  afterAll(() => {
    stopServer()
  })

  // --- Email confirmation happy path ---

  it('registers, confirms via token, and logs in', async () => {
    const email = `confirm.hp.${RUN}@nordhealth.com`

    // Register
    const registerResponse = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'testpass123!', firstName: 'Confirm', lastName: 'Happy' }),
    })
    if (registerResponse.status !== 200) {
      console.error('[DEBUG] Register failed:', registerResponse.status, await registerResponse.clone().text())
    }
    expect(registerResponse.status).toBe(200)

    // Small delay to ensure server commits
    await new Promise(resolve => setTimeout(resolve, 200))

    // Get token from DB
    const rows = await queryTestDb('SELECT confirmation_token FROM users WHERE email = ?', [email])
    expect(rows.length).toBe(1)
    const token = rows[0].confirmation_token as string
    expect(token).toBeTruthy()

    // Confirm
    const confirmResponse = await fetch(`${baseUrl}/api/auth/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
    expect(confirmResponse.status).toBe(200)
    const confirmData = await confirmResponse.json()
    expect(confirmData.message).toContain('confirmed')

    // Token should be cleared
    const afterRows = await queryTestDb('SELECT confirmation_token, email_confirmed FROM users WHERE email = ?', [email])
    expect(afterRows[0].confirmation_token).toBeNull()
    expect(afterRows[0].email_confirmed).toBe(1)

    // Login should work
    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'testpass123!' }),
    })
    expect(loginResponse.status).toBe(200)
  })

  it('returns already confirmed for re-confirmation', async () => {
    const email = `reconfirm.${RUN}@nordhealth.com`

    // Register and confirm
    await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'testpass123!', firstName: 'Re', lastName: 'Confirm' }),
    })
    const rows = await queryTestDb('SELECT confirmation_token FROM users WHERE email = ?', [email])
    const token = rows[0].confirmation_token as string
    await fetch(`${baseUrl}/api/auth/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })

    // The token is now cleared — using it again should fail
    const response = await fetch(`${baseUrl}/api/auth/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
    expect(response.status).toBe(400)
  })

  // --- Password reset happy path ---

  it('requests reset, resets password, and logs in with new password', async () => {
    const email = `reset.hp.${RUN}@nordhealth.com`

    // Register + confirm via DB
    await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'original123!', firstName: 'Reset', lastName: 'Happy' }),
    })
    await queryTestDb('UPDATE users SET email_confirmed = 1, confirmation_token = NULL WHERE email = ?', [email])

    // Request password reset
    const forgotResponse = await fetch(`${baseUrl}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    expect(forgotResponse.status).toBe(200)

    // Get reset token from DB
    const rows = await queryTestDb('SELECT reset_password_token FROM users WHERE email = ?', [email])
    const resetToken = rows[0].reset_password_token as string
    expect(resetToken).toBeTruthy()

    // Reset password
    const resetResponse = await fetch(`${baseUrl}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: resetToken, password: 'newpass123!' }),
    })
    expect(resetResponse.status).toBe(200)
    const resetData = await resetResponse.json()
    expect(resetData.message).toContain('Password updated')

    // Token should be cleared
    const afterRows = await queryTestDb('SELECT reset_password_token FROM users WHERE email = ?', [email])
    expect(afterRows[0].reset_password_token).toBeNull()

    // Old password should fail
    const oldLoginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'original123!' }),
    })
    expect(oldLoginResponse.status).toBe(401)

    // New password should work
    const newLoginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'newpass123!' }),
    })
    expect(newLoginResponse.status).toBe(200)
  })

  // --- Change password happy path ---

  it('changes password and verifies new password works', async () => {
    const email = `changepw.hp.${RUN}@nordhealth.com`

    // Register + confirm via DB
    await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'original123!', firstName: 'Change', lastName: 'PW' }),
    })
    await queryTestDb('UPDATE users SET email_confirmed = 1, confirmation_token = NULL WHERE email = ?', [email])

    // Login
    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'original123!' }),
    })
    const cookie = loginResponse.headers.get('set-cookie')?.split(';')[0] ?? ''

    // Change password
    const changeResponse = await fetch(`${baseUrl}/api/auth/change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
      body: JSON.stringify({ currentPassword: 'original123!', newPassword: 'changed123!' }),
    })
    expect(changeResponse.status).toBe(200)
    const changeData = await changeResponse.json()
    expect(changeData.message).toContain('changed')

    // Old password should fail
    const oldLoginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'original123!' }),
    })
    expect(oldLoginResponse.status).toBe(401)

    // New password should work
    const newLoginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'changed123!' }),
    })
    expect(newLoginResponse.status).toBe(200)
  })

  // --- Logout session invalidation ---

  it('logout clears the session cookie', async () => {
    const email = `logout.hp.${RUN}@nordhealth.com`

    await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'testpass123!', firstName: 'Logout', lastName: 'Test' }),
    })
    await queryTestDb('UPDATE users SET email_confirmed = 1, confirmation_token = NULL WHERE email = ?', [email])

    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'testpass123!' }),
    })
    const cookie = loginResponse.headers.get('set-cookie')?.split(';')[0] ?? ''

    // Logout — response should contain a Set-Cookie that clears the session
    const logoutResponse = await fetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: { Cookie: cookie },
    })
    expect(logoutResponse.status).toBe(200)
    const logoutSetCookie = logoutResponse.headers.get('set-cookie')
    expect(logoutSetCookie).toBeTruthy()
  })
})
