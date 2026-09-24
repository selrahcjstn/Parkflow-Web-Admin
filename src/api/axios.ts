import axios from 'axios'

// Using '/api' allows Vite's dev server proxy to forward requests to the local backend (http://localhost:5044) in dev,
// and vercel.json / reverse-proxy to forward to http://54.90.173.98:5000 in production.
const defaultBaseUrl = '/api'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || defaultBaseUrl,
  headers: { 'Content-Type': 'application/json' }
})

api.interceptors.request.use((config) => {
  const url = config.url || ''
  const isPublicAuthRoute =
    url.includes('/auth/register') ||
    url.includes('/auth/register-manual') ||
    url.includes('/auth/send-email-otp') ||
    url.includes('/auth/verify-email-otp') ||
    url.includes('/guards/create') ||
    url.includes('/admin/register') ||
    url.includes('/users/login') ||
    url.includes('/login')

  const rawToken = localStorage.getItem('parkflow_token')
  const token = rawToken && rawToken !== 'undefined' && rawToken !== 'null' ? rawToken.trim() : null

  if (token && !isPublicAuthRoute) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const url = error.config?.url || ''
      const isPublicAuthRoute =
        url.includes('/auth/register') ||
        url.includes('/auth/register-manual') ||
        url.includes('/auth/send-email-otp') ||
        url.includes('/auth/verify-email-otp') ||
        url.includes('/guards/create') ||
        url.includes('/admin/register') ||
        url.includes('/users/login') ||
        url.includes('/login')

      if (!isPublicAuthRoute) {
        localStorage.removeItem('parkflow_token')
        if (window.location.pathname !== '/login') {
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(error)
  }
)

export default api
