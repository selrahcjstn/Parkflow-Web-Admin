// Using '/api' allows Vite's dev server proxy to forward requests to the local backend (http://localhost:5044) in dev,
// and vercel.json / reverse-proxy to forward to http://54.90.173.98:5000 in production.
const defaultBaseUrl = '/api'

export const API_URL = import.meta.env.VITE_API_URL || defaultBaseUrl
export const SERVER_BASE_URL = (
  typeof window !== 'undefined' && window.location?.origin
    ? window.location.origin
    : (import.meta.env.VITE_BACKEND_URL || 'http://localhost:5173')
)
export const HUB_URL = import.meta.env.VITE_SIGNALR_HUB_URL || (
  import.meta.env.VITE_BACKEND_URL
    ? `${import.meta.env.VITE_BACKEND_URL.replace(/\/$/, '')}/hubs/notifications`
    : `${SERVER_BASE_URL}/hubs/notifications`
)
