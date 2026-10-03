/**
 * Formats a 24-hour time string (e.g. "08:00:00", "17:00", "17:00:00") or ISO string to 12-hour AM/PM format (e.g. "8:00 AM", "5:00 PM").
 */
export function formatTime12(timeStr?: string | null): string {
  if (!timeStr) return ''
  const trimmed = timeStr.trim()
  if (!trimmed) return ''

  // Already 12-hour format e.g. "8:00 AM" or "05:00 PM"
  if (/^\d{1,2}:\d{2}(?::\d{2})?\s*(AM|PM|am|pm)$/i.test(trimmed)) {
    return trimmed
  }

  // ISO string or contains 'T' e.g. "2026-10-03T08:00:00"
  if (trimmed.includes('T')) {
    const afterT = trimmed.split('T')[1]
    if (afterT) {
      return formatTime12(afterT)
    }
  }

  const parts = trimmed.split(':')
  if (parts.length >= 2) {
    let hours = parseInt(parts[0] || '0', 10)
    const minutes = (parts[1] || '00').slice(0, 2)
    const ampm = hours >= 12 ? 'PM' : 'AM'
    hours = hours % 12 || 12
    return `${hours}:${minutes} ${ampm}`
  }

  return trimmed
}

/**
 * Formats a time range to 12-hour format (e.g. "8:00 AM - 5:00 PM")
 */
export function formatTimeRange12(startTime?: string | null, endTime?: string | null, separator = ' - '): string {
  if (!startTime && !endTime) return ''
  const start = formatTime12(startTime)
  const end = formatTime12(endTime)
  if (start && end) return `${start}${separator}${end}`
  return start || end || ''
}
