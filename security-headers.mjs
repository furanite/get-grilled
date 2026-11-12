// Security headers for a self-hosted copy. Used by `vite preview` (so the browser tests run under them)
// and written to _headers by scripts/make-site.mjs for Netlify and Cloudflare Pages.
// GitHub Pages can't send headers, so the build also writes the same policy into index.html as a
// <meta> tag (see vite.config.ts); only frame-ancestors, which a <meta> tag can't carry, is left out there.
export const SECURITY_HEADERS = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self'",
    "media-src 'self' data: blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'none'",
    "frame-ancestors 'none'",
  ].join('; '),
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  // Get Grilled never needs the camera, microphone or location, so they are switched off for the page and any frame.
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
}

/** The Content-Security-Policy for a <meta> tag: the same policy minus frame-ancestors, which browsers ignore there. */
export const META_CSP = SECURITY_HEADERS['Content-Security-Policy']
  .split('; ')
  .filter((d) => !d.startsWith('frame-ancestors'))
  .join('; ')
