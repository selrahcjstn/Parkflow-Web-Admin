import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  // Default targets:
  // Development -> http://localhost:5044 (local .NET API)
  // Production / Prod-API -> http://54.90.173.98:5000 (AWS EC2 backend)
  const isDev = mode === 'development'
  const defaultBackend = isDev ? 'http://localhost:5044' : 'http://54.90.173.98:5000'
  const backendTarget = env.VITE_BACKEND_URL || defaultBackend

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
          secure: false,
        },
        '/hubs': {
          target: backendTarget,
          changeOrigin: true,
          ws: true,
          secure: false,
        },
      },
    },
  }
})
