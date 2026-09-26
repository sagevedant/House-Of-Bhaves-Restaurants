import api from './index'

/**
 * Fetch all clients/tenants
 * @returns {Promise<any>}
 */
export async function getClients() {
  const response = await api.get('/clients')
  return response.data
}

/**
 * Fetch single client details by ID
 * @param {string|number} id 
 * @returns {Promise<any>}
 */
export async function getClient(id) {
  const response = await api.get(`/clients/${id}`)
  return response.data
}

/**
 * Create a new clinic client
 * @param {object} payload 
 * @returns {Promise<any>}
 */
export async function createClient(payload) {
  const response = await api.post('/clients', payload)
  return response.data
}

/**
 * Update an existing client
 * @param {string|number} id 
 * @param {object} payload 
 * @returns {Promise<any>}
 */
export async function updateClient(id, payload) {
  const response = await api.patch(`/clients/${id}`, payload)
  return response.data
}

/**
 * Set active/revoked access status for a client
 * @param {string|number} id 
 * @param {boolean} active 
 * @returns {Promise<any>}
 */
export async function setClientAccess(id, active) {
  const response = await api.patch(`/clients/${id}/access`, { active })
  return response.data
}

/**
 * Rotate webhook permanent token
 * @param {string|number} id 
 * @returns {Promise<any>}
 */
export async function rotateToken(id) {
  const response = await api.post(`/clients/${id}/rotate-token`)
  return response.data
}

/**
 * Delete a client permanently
 * @param {string|number} id 
 * @returns {Promise<any>}
 */
export async function deleteClient(id) {
  const response = await api.delete(`/clients/${id}`)
  return response.data
}

/**
 * Fetch client booking records (paginated)
 * @param {string|number} id 
 * @param {number} page 
 * @returns {Promise<any>}
 */
export async function getClientBookings(id, page = 1) {
  const response = await api.get(`/clients/${id}/bookings`, {
    params: { page },
  })
  return response.data
}
