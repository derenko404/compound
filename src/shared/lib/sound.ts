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

// "Lock on" for choosing the focus topic: a low thump, a rising sweep, then a bright chord with a shimmer on top.
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

/* ---------- Background sound while the timer runs ---------- */

export type Ambient = 'off' | 'tick' | 'rain' | 'brown'
let ambient: { kind: Ambient; src: AudioBufferSourceNode; gain: GainNode } | null = null

/**
 * A looping buffer for each sound, made once. Rain: white noise softened by a filter. Brown: a deep, steady rumble.
 * Tick: a short click once a second, like a kitchen timer.
 */
function ambientBuffer(a: AudioContext, kind: Exclude<Ambient, 'off'>) {
  const rate = a.sampleRate
  const secs = kind === 'tick' ? 1 : 4
  const buf = a.createBuffer(1, rate * secs, rate)
  const d = buf.getChannelData(0)
  if (kind === 'tick') {
    for (let i = 0; i < rate * 0.012; i++) d[i] = Math.sin(i / rate * 2 * Math.PI * 2200) * (1 - i / (rate * 0.012)) * 0.6
    return buf
  }
  let last = 0
  for (let i = 0; i < d.length; i++) {
    const white = Math.random() * 2 - 1
    if (kind === 'brown') {
      last = (last + 0.02 * white) / 1.02
      d[i] = last * 3.5
    } else d[i] = white * 0.35
  }
  return buf
}

/**
 * Plays (or switches) the timer's background sound. It's chosen on the timer page, so it plays even with the
 * app's tick sounds turned off in Settings.
 */
export function playAmbient(kind: Ambient) {
  if (ambient?.kind === kind) return
  stopAmbient()
  if (kind === 'off') return
  ac ??= new AudioContext()
  if (ac.state === 'suspended') void ac.resume()
  const src = ac.createBufferSource()
  src.buffer = ambientBuffer(ac, kind)
  src.loop = true
  const gain = ac.createGain()
  gain.gain.setValueAtTime(0.0001, ac.currentTime)
  gain.gain.exponentialRampToValueAtTime(kind === 'tick' ? 0.25 : 0.12, ac.currentTime + 0.6)
  let out: AudioNode = src
  if (kind === 'rain') {
    const f = ac.createBiquadFilter()
    f.type = 'lowpass'
    f.frequency.value = 1800
    out = src.connect(f)
  }
  out.connect(gain).connect(ac.destination)
  src.start()
  ambient = { kind, src, gain }
}

export function stopAmbient() {
  if (!ambient || !ac) return
  const { src, gain } = ambient
  gain.gain.cancelScheduledValues(ac.currentTime)
  gain.gain.setValueAtTime(Math.max(gain.gain.value, 0.0001), ac.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.3)
  src.stop(ac.currentTime + 0.35)
  ambient = null
}
