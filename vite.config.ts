import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { META_CSP, SECURITY_HEADERS } from './security-headers.mjs'

// Relative base so the build works from any folder or static host.
// The preview server sends the same strict headers a self-hosted copy uses, so the browser tests run under them.
// The built page also carries the policy as a <meta> tag, because GitHub Pages can't send headers.
// Build only: the dev server needs an inline script for hot reload.
const cspMeta = {
  name: 'csp-meta',
  apply: 'build' as const,
  transformIndexHtml: (html: string) =>
    html.replace(/<meta http-equiv="Content-Security-Policy"[^>]*>/, `<meta http-equiv="Content-Security-Policy" content="${META_CSP}" />`),
}

export default defineConfig({
  plugins: [react(), cspMeta],
  base: './',
  preview: { headers: SECURITY_HEADERS },
})
