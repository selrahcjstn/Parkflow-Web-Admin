export function getRoleLabel(role?: string): string {
  if (!role) return 'N/A'
  if (role === 'UniversityStaff' || role === 'Faculty' || role === 'FacultyMember') return 'Faculty Member'
  if (role === 'NonAcademicPersonnel' || role === 'Staff') return 'University Staff'
  if (role === 'Student') return 'Student'
  if (role === 'Guard' || role === 'SecurityGuard') return 'Security Guard'
  if (role === 'Admin' || role === 'SuperAdmin') return 'Administrator'
  return role
}
