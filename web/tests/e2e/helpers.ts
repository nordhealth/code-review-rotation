/**
 * Login as admin and return the session cookie string.
 */
export async function loginAsAdmin(baseUrl: string): Promise<string> {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'joao.goncalves@nordhealth.com', password: 'admin123!' }),
  })
  const setCookie = response.headers.get('set-cookie')
  return setCookie?.split(';')[0] ?? ''
}

/**
 * Make an authenticated GET request.
 */
export async function authGet(baseUrl: string, path: string, cookie: string) {
  return fetch(`${baseUrl}${path}`, {
    headers: { Cookie: cookie },
  })
}

/**
 * Make an authenticated POST request with JSON body.
 */
export async function authPost(baseUrl: string, path: string, cookie: string, body: Record<string, unknown>) {
  return fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
    body: JSON.stringify(body),
  })
}

/**
 * Make an authenticated PUT request with JSON body.
 */
export async function authPut(baseUrl: string, path: string, cookie: string, body: Record<string, unknown>) {
  return fetch(`${baseUrl}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
    body: JSON.stringify(body),
  })
}

/**
 * Make an authenticated DELETE request.
 */
export async function authDelete(baseUrl: string, path: string, cookie: string) {
  return fetch(`${baseUrl}${path}`, {
    method: 'DELETE',
    headers: { Cookie: cookie },
  })
}
