import axios from 'axios'

// Using '/api' allows Vite's dev server proxy to forward requests to the local backend (http://localhost:5044) in dev,
// and vercel.json / reverse-proxy to forward to http://54.90.173.98:5000 in production.
const defaultBaseUrl = '/api'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || defaultBaseUrl,
  headers: { 'Content-Type': 'application/json' }
})

api.interceptors.request.use((config) => {
  const rawToken = localStorage.getItem('parkflow_token')
  const token = rawToken && rawToken !== 'undefined' && rawToken !== 'null' ? rawToken.trim() : null

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  // Prevent browser and proxy caching on dynamic admin requests
  config.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
  config.headers['Pragma'] = 'no-cache'
  config.headers['Expires'] = '0'

  if (config.method?.toLowerCase() === 'get') {
    config.params = { ...config.params, _t: Date.now() }
  }

  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const url = error.config?.url || ''
      const isLoginRoute =
        url.includes('/users/login') ||
        url.includes('/login')

      if (!isLoginRoute) {
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
