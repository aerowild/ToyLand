import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 8888,
    open: true,
    // WSL + Windows-mounted (/mnt/c) filesystems don't deliver inotify events, so Vite's
    // watcher misses edits and HMR serves stale code. Polling fixes hot-reload on WSL.
    watch: { usePolling: true, interval: 300 }
  },
  build: {
    // three.js is intentionally code-split into an on-demand chunk (loaded only when a
    // 3D view opens), so the default 500 kB warning for that deferred chunk is expected.
    chunkSizeWarningLimit: 1000
  }
})
