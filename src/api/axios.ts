import axios, { type AxiosResponse } from 'axios'
import { createRequestCache } from './requestCache'
import { resetAppCache, syncCacheOwner } from '@/stores/appCache'

// Using '/api' allows Vite's dev server proxy to forward requests to the local backend (http://localhost:5044) in dev,
// and vercel.json / reverse-proxy to forward to http://54.90.173.98:5000 in production.
const defaultBaseUrl = '/api'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || defaultBaseUrl,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
})

const cache = createRequestCache<AxiosResponse>()
const transport = axios.getAdapter(api.defaults.adapter)
let owner: string | null = null
export function refreshAdminData() {
  cache.clear()
  resetAppCache()
}
api.defaults.adapter = async (config) => {
  const token = localStorage.getItem('parkflow_token')
  const sentToken = config.headers?.Authorization
  if (sentToken && sentToken !== `Bearer ${token}`) throw new axios.CanceledError('Account changed')
  if (owner !== token) {
    owner = token
    refreshAdminData()
    syncCacheOwner(token)
  }
  if (config.method?.toLowerCase() !== 'get') {
    refreshAdminData()
    try {
      return await transport(config)
    } finally {
      refreshAdminData()
    }
  }
  const key = JSON.stringify([config.baseURL, config.url, config.params])
  const response = await cache.read(key, () => transport(config))
  if (token !== localStorage.getItem('parkflow_token'))
    throw new axios.CanceledError('Account changed')
  return {
    ...response,
    config,
    data: typeof response.data === 'object' ? structuredClone(response.data) : response.data,
  }
}

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

  return config
})

api.interceptors.response.use(
  (response) => {
    const sentToken = response.config.headers?.Authorization
    if (sentToken && sentToken !== `Bearer ${localStorage.getItem('parkflow_token')}`)
      throw new axios.CanceledError('Account changed')
    return response
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      const url = error.config?.url || ''
      const isLoginRoute = url.includes('/users/login') || url.includes('/login')

      const sentToken = error.config?.headers?.Authorization
      const currentToken = localStorage.getItem('parkflow_token')
      if (!isLoginRoute && currentToken && sentToken === `Bearer ${currentToken}`) {
        refreshAdminData()
        localStorage.removeItem('parkflow_token')
        if (window.location.pathname !== '/login') {
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(error)
  },
)

export default api
