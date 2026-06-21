import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 8888,
    open: true
  },
  build: {
    // three.js is intentionally code-split into an on-demand chunk (loaded only when a
    // 3D view opens), so the default 500 kB warning for that deferred chunk is expected.
    chunkSizeWarningLimit: 1000
  }
})
