import { resolveAdminEndpoints } from './endpointPolicy'

const configuredApiUrl = import.meta.env.VITE_API_URL
const rawApiUrl = configuredApiUrl && /^https:\/\//i.test(configuredApiUrl)
  ? configuredApiUrl
  : (import.meta.env.DEV ? '/api' : `${window.location.origin}/api`)

const configuredHubUrl = import.meta.env.VITE_SIGNALR_HUB_URL
const rawHubUrl = import.meta.env.DEV
  ? (configuredHubUrl || (import.meta.env.VITE_BACKEND_URL ? `${import.meta.env.VITE_BACKEND_URL.replace(/\/$/, '')}/hubs/notifications` : undefined))
  : (configuredHubUrl && /^https:\/\//i.test(configuredHubUrl) ? configuredHubUrl : undefined)

const endpoints = resolveAdminEndpoints(rawApiUrl, window.location.origin, import.meta.env.DEV, rawHubUrl)
export const API_URL = endpoints.apiUrl
export const SERVER_BASE_URL = endpoints.serverUrl
export const HUB_URL = endpoints.hubUrl
