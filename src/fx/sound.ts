// Small synthesized sounds (Web Audio), so there are no audio files to ship.
const KEY = 'roadmap-sound'
let ac: AudioContext | null = null

export const soundOn = () => {
  try {
    return localStorage.getItem(KEY) !== 'off'
  } catch {
    return true
  }
}
export const setSoundOn = (on: boolean) => localStorage.setItem(KEY, on ? 'on' : 'off')

function ctx() {
  if (!soundOn()) return null
  ac ??= new AudioContext()
  if (ac.state === 'suspended') void ac.resume()
  return ac
}

function tone(a: AudioContext, freq: number, start: number, dur: number, type: OscillatorType = 'sine', gain = 0.18) {
  const o = a.createOscillator()
  const g = a.createGain()
  o.type = type
  o.frequency.setValueAtTime(freq, start)
  g.gain.setValueAtTime(0.0001, start)
  g.gain.exponentialRampToValueAtTime(gain, start + 0.012)
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur)
  o.connect(g).connect(a.destination)
  o.start(start)
  o.stop(start + dur + 0.02)
}

// Short rising "pop" when a task is ticked. Pitch climbs with progress (0..1).
export function playTick(progress = 0) {
  const a = ctx()
  if (!a) return
  const t = a.currentTime
  const base = 520 + progress * 360
  tone(a, base, t, 0.09, 'triangle', 0.16)
  tone(a, base * 1.5, t + 0.05, 0.14, 'sine', 0.12)
}

export function playUntick() {
  const a = ctx()
  if (!a) return
  tone(a, 330, a.currentTime, 0.08, 'sine', 0.08)
}

// Major arpeggio for finishing the day or a milestone.
export function playFanfare() {
  const a = ctx()
  if (!a) return
  const t = a.currentTime
  ;[523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(a, f, t + i * 0.09, 0.35, 'triangle', 0.15))
  tone(a, 1318.5, t + 0.4, 0.6, 'sine', 0.08)
}

// "Lock on" for choosing the focus track: a low thump, a rising sweep, then a bright chord with a shimmer on top.
export function playFocus() {
  const a = ctx()
  if (!a) return
  const t = a.currentTime
  const sweep = (from: number, to: number, start: number, dur: number, gain: number, type: OscillatorType) => {
    const o = a.createOscillator()
    const g = a.createGain()
    o.type = type
    o.frequency.setValueAtTime(from, start)
    o.frequency.exponentialRampToValueAtTime(to, start + dur * 0.8)
    g.gain.setValueAtTime(0.0001, start)
    g.gain.exponentialRampToValueAtTime(gain, start + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur)
    o.connect(g).connect(a.destination)
    o.start(start)
    o.stop(start + dur + 0.02)
  }
  sweep(140, 45, t, 0.35, 0.35, 'sine') // thump
  sweep(220, 990, t + 0.04, 0.24, 0.1, 'sawtooth') // charge up
  ;[659.25, 987.77, 1318.5].forEach((f) => tone(a, f, t + 0.26, 0.7, 'triangle', 0.11)) // the chord
  ;[1975.5, 2637].forEach((f, i) => tone(a, f, t + 0.34 + i * 0.07, 0.35, 'sine', 0.05)) // shimmer
}
