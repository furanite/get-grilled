/// <reference types="vite/client" />

// Font packages are CSS-only; this lets the type checker accept their side-effect imports.
declare module '@fontsource/*'

/** The app's version, from package.json (set in vite.config.ts). */
declare const __APP_VERSION__: string
