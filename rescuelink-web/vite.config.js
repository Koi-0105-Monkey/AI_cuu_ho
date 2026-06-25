import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  esbuild: {
    jsx: 'automatic',
  },
  test: {
    environment: 'jsdom',
    globals: true,
    testTimeout: 15000,
    css: false,
    server: {
      deps: {
        inline: ['leaflet', 'react-leaflet', '@phosphor-icons/react'],
      },
    },
  },
})
