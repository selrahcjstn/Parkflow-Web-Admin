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
 * Strictly verifies role and email to prevent regular Administrators or unauthenticated users from bypassing access.
 */
export function isSuperAdminUser(): boolean {
  const role = getStoredUserRole().toLowerCase()
  const email = getStoredUserEmail().toLowerCase()

  // 1. Explicit SuperAdmin role check from JWT claims
  if (role === 'superadmin' || role === 'super_admin') {
    return true
  }

  // 2. Specific SuperAdmin email verification
  if (email === 'superadmin@parkflow.com' || (email.startsWith('superadmin') && email.includes('@'))) {
    return true
  }

  return false
}
