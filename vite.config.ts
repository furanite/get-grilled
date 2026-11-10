import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { SECURITY_HEADERS } from './security-headers.mjs'

// Relative base so the build works from any folder or static host.
// The preview server sends the same strict headers a self-hosted copy uses, so the browser tests run under them.
export default defineConfig({
  plugins: [react()],
  base: './',
  preview: { headers: SECURITY_HEADERS },
})
