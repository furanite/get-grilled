import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { META_CSP, SECURITY_HEADERS } from './security-headers.mjs'
import colorMixFallbacks from './css-fallbacks.mjs'
import offlinePlugin, { APP_VERSION } from './offline-copy.mjs'

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
  plugins: [react(), cspMeta, offlinePlugin()],
  // The version shown in What's new
  define: { __APP_VERSION__: JSON.stringify(APP_VERSION) },
  base: './',
  // Fallback colours for browsers without color-mix(), such as older Chrome on school touch screens.
  css: { postcss: { plugins: [colorMixFallbacks()] } },
  preview: { headers: SECURITY_HEADERS },
})
