/**
 * Authentication and authorization utility functions for ParkFlow Web Admin.
 */

/**
 * Retrieves the stored role of the currently authenticated user.
 */
export function getStoredUserRole(): string {
  return (localStorage.getItem('parkflow_user_role') || '').trim()
}

/**
 * Retrieves the stored email of the currently authenticated user.
 */
export function getStoredUserEmail(): string {
  return (localStorage.getItem('parkflow_user_email') || '').trim()
}

/**
 * Returns true if the currently logged-in user has SuperAdmin role / privileges.
 * Comprehensively inspects stored role, email, and JWT payload.
 */
export function isSuperAdminUser(): boolean {
  const role = getStoredUserRole().toLowerCase().replace(/[\s_-]/g, '')
  const email = getStoredUserEmail().toLowerCase()

  // 1. Explicit SuperAdmin role check from stored role
  if (role === 'superadmin' || role.includes('superadmin') || role === '5') {
    return true
  }

  // 2. Specific SuperAdmin email verification
  if (email.includes('superadmin') || email.includes('super_admin')) {
    return true
  }

  // 3. Inspect JWT token payload directly
  try {
    const token = localStorage.getItem('parkflow_token')
    if (token && token.includes('.')) {
      const parts = token.split('.')
      if (parts[1]) {
        const payload = JSON.parse(window.atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
        const rawRole = String(
          payload.role ||
          payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ||
          payload.Role ||
          payload.userRole ||
          payload.UserRole ||
          payload.profile_type ||
          payload.ProfileType ||
          ''
        ).toLowerCase().replace(/[\s_-]/g, '')

        if (rawRole === 'superadmin' || rawRole.includes('superadmin') || rawRole === '5') {
          return true
        }

        const tokenEmail = String(
          payload.email ||
          payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] ||
          payload.unique_name ||
          ''
        ).toLowerCase()

        if (tokenEmail.includes('superadmin') || tokenEmail.includes('super_admin')) {
          return true
        }
      }
    }
  } catch (err) {}

  return false
}
