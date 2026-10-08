export function getRoleLabel(role?: string): string {
  if (!role) return 'N/A'
  // The legacy API code UniversityStaff means Faculty; the spaced label is staff.
  if (role.trim().toLowerCase() === 'university staff') return 'University Staff'
  const code = role.toLowerCase().replace(/[\s_-]/g, '')
  if (code === 'universitystaff' || code === 'faculty' || code === 'facultymember') return 'Faculty'
  if (code === 'nonacademicpersonnel' || code === 'staff') return 'University Staff'
  if (code === 'student') return 'Student'
  if (code === 'guard' || code === 'securityguard') return 'Security Guard'
  if (code === 'admin' || code === 'superadmin') return 'Administrator'
  return role
}
