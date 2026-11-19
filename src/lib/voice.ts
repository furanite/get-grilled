/**
 * Read-aloud: the device's own built-in voice reads a clue when it opens. Off unless the host switches it on
 * (Display options). Nothing is recorded or sent anywhere; the browser speaks the text on the device.
 *
 * Clues that name a Prophet or a Companion (they carry an honorific sign or phrase) are never read aloud:
 * the host reads those. Nor are clues with vowelled Arabic or the ornate brackets (Qur'anic text, hadith wording):
 * a machine voice must never recite or mangle the words of the Qur'an. The voice only ever narrates the clue text; it never speaks as any person.
 */
let enabled = false
export const setVoiceEnabled = (on: boolean) => {
  enabled = on
  if (!on) stopSpeaking()
}
export const voiceAvailable = () => typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined'

/** Honorific signs (﵀ ﵁ ﵂ ﵃ ﵄ ﵇ ﵈ ...), ﷺ, and the honorifics written out. */
const HONOURED = /[﵀-﵏ﷺﷻ]|عليه(?:ا|م)? السلام|رضي الله|رضوان الله|صلى الله عليه|peace be upon|may allah be pleased/i

/** Vowel marks, Qur'anic annotation signs and the ornate parentheses that mark Qur'anic text. */
const SACRED_TEXT = /[\u064B-\u065F\u0670\u06D6-\u06ED\uFD3E\uFD3F]/

/** Whether read-aloud leaves this clue to the host. */
export const hostReads = (text: string) => HONOURED.test(text) || SACRED_TEXT.test(text)

/** Text as it should be spoken: no picture markers or stray symbols. */
const speakable = (text: string) => text.replace(/\{img:[^}]*\}/g, '').replace(/[_*#|]+/g, ' ').replace(/\s+/g, ' ').trim()

export function speakClue(text: string, lang: 'en' | 'ar') {
  if (!enabled || !voiceAvailable() || !text || hostReads(text)) return
  const say = speakable(text)
  if (!say) return
  try {
    const synth = window.speechSynthesis
    synth.cancel()
    const u = new SpeechSynthesisUtterance(say)
    const want = lang === 'ar' || /[؀-ۿ]/.test(say) ? 'ar' : 'en'
    const v = synth.getVoices().find((x) => x.lang.toLowerCase().startsWith(want) && x.default) ?? synth.getVoices().find((x) => x.lang.toLowerCase().startsWith(want))
    if (v) u.voice = v
    u.lang = v?.lang ?? (want === 'ar' ? 'ar-SA' : 'en-GB')
    u.rate = 0.9
    synth.speak(u)
  } catch {
    // A browser that refuses to speak simply stays quiet.
  }
}

export function stopSpeaking() {
  try {
    if (voiceAvailable()) window.speechSynthesis.cancel()
  } catch {
    /* nothing to stop */
  }
}
