/** Long clues get a smaller font so they never spill over the card's header or buttons (data-len on .q). */
export const qLen = (s: string | undefined): 'l' | 'xl' | undefined => (!s ? undefined : s.length > 170 ? 'xl' : s.length > 110 ? 'l' : undefined)
