import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    // three.js is one large library and accounts for most of the bundle. The
    // default 500 kB warning would fire on every build without telling us anything.
    chunkSizeWarningLimit: 1000,
  },
})
