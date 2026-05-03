import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * Normalizes API target URL for Vite proxy.
 * Accepts values with or without trailing /api segment.
 * @param {string | undefined} rawUrl
 * @returns {string}
 */
function resolveApiProxyTarget(rawUrl) {
  const fallback = 'http://localhost:5000'
  if (!rawUrl) return fallback
  return rawUrl.replace(/\/api\/?$/i, '')
}

const apiProxyTarget = resolveApiProxyTarget(
  process.env.VITE_API_URL || process.env.E2E_API_URL
)

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('react') || id.includes('react-router-dom')) return 'react'
          if (id.includes('i18next') || id.includes('react-i18next')) return 'i18n'
          if (id.includes('@dnd-kit')) return 'dnd'
          return 'vendor'
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: apiProxyTarget,
        changeOrigin: true,
      },
    },
  },
})
