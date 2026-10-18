import { playFanfare } from './sound'

// Confetti on a fixed canvas. Module-level so any view can call it.
interface Particle {
  x: number; y: number; vx: number; vy: number; life: number; size: number
  color: string; rot: number; vr: number; shape: number; slow?: boolean
}

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches
let canvas: HTMLCanvasElement | null = null
let ctx: CanvasRenderingContext2D | null = null
let parts: Particle[] = []
let raf = 0

function size() {
  if (!canvas || !ctx) return
  const r = devicePixelRatio || 1
  canvas.width = innerWidth * r
  canvas.height = innerHeight * r
  ctx.setTransform(r, 0, 0, r, 0, 0)
}

export function mountFx(el: HTMLCanvasElement) {
  canvas = el
  ctx = el.getContext('2d')
  size()
  addEventListener('resize', size)
  return () => removeEventListener('resize', size)
}

function tick() {
  if (!ctx) return
  ctx.clearRect(0, 0, innerWidth, innerHeight)
  parts = parts.filter((p) => p.life > 0 && p.y < innerHeight + 40)
  for (const p of parts) {
    p.x += p.vx; p.y += p.vy; p.vy += p.slow ? 0.03 : 0.18; p.vx *= 0.99; p.rot += p.vr; p.life -= p.slow ? 0.006 : 0.022
    ctx.save()
    ctx.globalAlpha = Math.max(0, Math.min(1, p.life))
    ctx.translate(p.x, p.y)
    ctx.rotate(p.rot)
    ctx.fillStyle = p.color
    if (p.shape === 0) ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2)
    else if (p.shape === 1) { ctx.beginPath(); ctx.arc(0, 0, p.size / 2.4, 0, Math.PI * 2); ctx.fill() }
    else { ctx.beginPath(); ctx.moveTo(0, -p.size / 2); ctx.lineTo(p.size / 2, p.size / 2); ctx.lineTo(-p.size / 2, p.size / 2); ctx.closePath(); ctx.fill() }
    ctx.restore()
  }
  raf = parts.length ? requestAnimationFrame(tick) : 0
  if (!raf) ctx.clearRect(0, 0, innerWidth, innerHeight)
}

// Resolves an element's --c custom property to a concrete colour string.
export function colorOf(el: Element) {
  const probe = document.createElement('span')
  probe.style.color = getComputedStyle(el).getPropertyValue('--c').trim() || 'var(--accent)'
  el.appendChild(probe)
  const c = getComputedStyle(probe).color
  probe.remove()
  return c
}

export function burst(el: Element, count = 18) {
  if (reduced()) return
  const r = el.getBoundingClientRect()
  const x = r.left + r.width / 2
  const y = r.top + r.height / 2
  const color = colorOf(el)
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2
    const v = 2 + Math.random() * 4.5
    parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 2, life: 1, size: 3 + Math.random() * 4, color, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, shape: i % 3 })
  }
  if (!raf) raf = requestAnimationFrame(tick)
}

// "I'm the focus now!": the screen dims around the element, a targeting reticle snaps onto it,
// and particles fly out in waves. Everything removes itself.
export function lockOn(el: Element) {
  if (reduced()) return
  const r = el.getBoundingClientRect()
  const color = colorOf(el)
  const cx = r.left + r.width / 2
  const cy = r.top + r.height / 2
  const add = (cls: string, style: Partial<CSSStyleDeclaration>, html = '') => {
    const d = document.createElement('div')
    d.className = cls
    d.innerHTML = html
    Object.assign(d.style, style)
    d.style.setProperty('--lock-c', color)
    document.body.appendChild(d)
    d.addEventListener('animationend', (e) => { if (e.target === d) d.remove() })
    return d
  }
  const hole = `${Math.max(r.width, r.height) * 0.62}px`
  add('lock-shade', { background: `radial-gradient(circle at ${cx}px ${cy}px, transparent ${hole}, rgb(0 0 0 / .6) calc(${hole} + 120px))` })
  add('lock-reticle', { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` }, '<i></i><i></i><i></i><i></i>')
  ;[0, 180, 360].forEach((t, i) => setTimeout(() => burst(el, 30 - i * 6), t))
}

export function celebrate() {
  playFanfare()
  if (reduced()) return
  const root = getComputedStyle(document.documentElement)
  const cols = ['--c-tech', '--c-product', '--c-mgmt', '--c-biz', '--c-eng', '--c-money'].map((v) => root.getPropertyValue(v).trim())
  for (let i = 0; i < 160; i++) {
    parts.push({
      x: Math.random() * innerWidth, y: -20 - Math.random() * innerHeight * 0.5, vx: (Math.random() - 0.5) * 2, vy: 2 + Math.random() * 3,
      life: 1.6, size: 5 + Math.random() * 5, color: cols[i % cols.length], rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3, shape: i % 3, slow: true,
    })
  }
  if (!raf) raf = requestAnimationFrame(tick)
}

export { toast } from 'sonner'

