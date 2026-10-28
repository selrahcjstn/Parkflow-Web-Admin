import { resolveAdminEndpoints } from './endpointPolicy'

const endpoints = resolveAdminEndpoints(import.meta.env.VITE_API_URL, window.location.origin, import.meta.env.DEV,
  import.meta.env.VITE_SIGNALR_HUB_URL || (import.meta.env.DEV && import.meta.env.VITE_BACKEND_URL
    ? `${import.meta.env.VITE_BACKEND_URL.replace(/\/$/, '')}/hubs/notifications` : undefined))
export const API_URL = endpoints.apiUrl
export const SERVER_BASE_URL = endpoints.serverUrl
export const HUB_URL = endpoints.hubUrl
