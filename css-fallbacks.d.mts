import type { Plugin } from 'postcss'
/** Adds plain colour fallbacks for color-mix() for older browsers. */
export default function colorMixFallbacks(): Plugin
export function fallbackValue(value: string): string
