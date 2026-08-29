import axios from 'axios'

const isProduction = import.meta.env.PROD
const defaultBaseUrl = isProduction ? '/api' : 'http://localhost:5000/api'

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

  const token = localStorage.getItem('parkflow_token')
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
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api
