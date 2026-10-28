import { API_URL, SERVER_BASE_URL } from '@/api/config'

/**
 * Utility for formatting document URLs and ensuring reliable viewing
 * in ParkFlow Web Admin.
 *
 * For PDFs stored in Cloudinary that encounter 401 ACL/security restrictions
 * or lack inline Content-Disposition headers, this routes them through
 * the backend proxy endpoint `/api/files/document`.
 */

export function isPdfDoc(url?: string): boolean {
  if (!url) return false
  const lower = url.toLowerCase().trim()
  if (lower.includes("format=image")) return false
  return (
    lower.endsWith('.pdf') ||
    lower.includes('/raw/upload/') ||
    lower.includes('.pdf?') ||
    lower.includes('.pdf&') ||
    lower.includes('resource_type=raw') ||
    lower.includes('/files/document')
  )
}

export function formatDocUrl(url?: string, fallback: string = ''): string {
  if (!url || !url.trim()) return fallback
  const trimmed = url.trim()
  if (trimmed === 'pending' || trimmed === 'null' || trimmed === 'undefined') return fallback
  if (
    trimmed.includes('storage.parkflow.com') ||
    trimmed.includes('example.com') ||
    trimmed.includes('invalid-domain')
  ) {
    return fallback
  }
  if (
    trimmed.startsWith('file://') ||
    trimmed.startsWith('content://') ||
    trimmed.startsWith('ph://')
  ) {
    return fallback
  }

  // If already proxied, keep as is
  if (trimmed.includes('/files/document')) {
    try {
      const signed = new URL(trimmed, SERVER_BASE_URL)
      if (signed.origin !== new URL(SERVER_BASE_URL).origin || signed.username || signed.password || signed.pathname !== '/api/files/document') return fallback
      return signed.toString()
    } catch { return fallback }
  }

  // Route PDF documents through proxy endpoint
  if (isPdfDoc(trimmed)) {
    const apiBase = API_URL
    return `${apiBase}/files/document?url=${encodeURIComponent(trimmed)}`
  }

  // Standard web images can load directly
  if (trimmed.startsWith('http://')) return `${API_URL}/files/document?url=${encodeURIComponent(trimmed)}`
  if (trimmed.startsWith('https://') || trimmed.startsWith('data:')) return trimmed

  // Local relative path (e.g. "uploads/...")
  const rootDomain = SERVER_BASE_URL
  return `${rootDomain}/${trimmed.replace(/^\//, '')}`
}

export function getDocDownloadUrl(url?: string): string {
  if (!url) return '#'
  const docUrl = formatDocUrl(url)
  return docUrl.includes('?') ? `${docUrl}&download=true` : `${docUrl}?download=true`
}
