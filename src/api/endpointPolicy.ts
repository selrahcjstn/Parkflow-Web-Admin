export function resolveAdminEndpoints(apiValue: string | undefined, origin: string, development: boolean, hubValue?: string) {
  const raw = (apiValue || (development ? '/api' : '')).trim()
  if (!development && (!/^https:\/\//i.test(raw) || /[\\\x00-\x1f\x7f?#]/.test(raw)))
    throw new Error('Configure VITE_API_URL as an HTTPS API endpoint ending in /api before releasing the admin app.')
  let api: URL
  try { api = new URL(raw, origin) } catch { throw new Error('Invalid admin API endpoint configuration.') }
  if ((!development && (api.protocol !== 'https:' || new URL(origin).protocol !== 'https:')) ||
      !['http:', 'https:'].includes(api.protocol) || api.username || api.password || api.search || api.hash || api.pathname.replace(/\/+$/, '') !== '/api')
    throw new Error('Admin requests require a secure configured API and HTTPS page outside development.')
  const hub = hubValue ? new URL(hubValue, origin) : new URL('/hubs/notifications', api.origin)
  if ((!development && (hub.origin !== api.origin || hub.protocol !== 'https:')) || hub.pathname !== '/hubs/notifications' || hub.username || hub.password || hub.search || hub.hash)
    throw new Error('SignalR must use the configured API authority and /hubs/notifications path.')
  return { apiUrl: api.toString().replace(/\/+$/, ''), serverUrl: api.origin, hubUrl: hub.toString() }
}
