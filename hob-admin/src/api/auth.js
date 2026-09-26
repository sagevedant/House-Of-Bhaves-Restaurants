import api, { AUTH_TOKEN_KEY } from './index'

/**
 * Login with access token
 * @param {string} token 
 * @returns {Promise<any>}
 */
export async function login(token) {
  const response = await api.post('/login', { token })
  const sessionToken = response.data?.token || token
  localStorage.setItem(AUTH_TOKEN_KEY, sessionToken)
  return response.data
}

/**
 * Clear stored token and redirect to /login
 */
export function logout() {
  localStorage.removeItem(AUTH_TOKEN_KEY)
  window.location.href = '/login'
}

/**
 * Check if current operator is authenticated
 */
export function isAuthenticated() {
  return !!localStorage.getItem(AUTH_TOKEN_KEY)
}
