import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import tailwindcss from '@tailwindcss/vite'
import { resolveAdminEndpoints } from './src/api/endpointPolicy'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  const isDev = mode === 'development'
  const apiUrl = env.VITE_API_URL && /^https:\/\//i.test(env.VITE_API_URL)
    ? env.VITE_API_URL
    : (isDev ? '/api' : 'https://api.example.invalid/api')
  const hubUrl = env.VITE_SIGNALR_HUB_URL && env.VITE_SIGNALR_HUB_URL.startsWith(new URL(apiUrl).origin)
    ? env.VITE_SIGNALR_HUB_URL
    : undefined
  const release = !isDev ? resolveAdminEndpoints(apiUrl, 'https://build.example.invalid', false, hubUrl) : null
  const backendTarget = release?.serverUrl || env.VITE_BACKEND_URL || 'http://localhost:5044'

  return {
    plugins: [vue(), vueDevTools(), tailwindcss()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: backendTarget,
          changeOrigin: true,
          secure: !isDev,
        },
        '/hubs': {
          target: backendTarget,
          changeOrigin: true,
          ws: true,
          secure: !isDev,
        },
      },
    },
  }
})
