/**
 * Web Push over Web Crypto, so it runs on Workers without a library: VAPID (RFC 8292) signs who is sending, and
 * the payload is encrypted for the browser with aes128gcm (RFC 8291). The private key is a P-256 JWK
 * (VAPID_PRIVATE_KEY); its x and y give the public key the app subscribes with.
 */
import type { PushResult, PushSenderPort, PushTarget } from '../../core/ports/push'

const enc = new TextEncoder()
// Web Crypto wants bytes over a plain ArrayBuffer.
type Bytes = Uint8Array<ArrayBuffer>

const b64url = (bytes: Bytes) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const fromB64url = (s: string): Bytes => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4)), (c) => c.charCodeAt(0))

const concat = (...parts: Bytes[]): Bytes => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0))
  let i = 0
  for (const p of parts) { out.set(p, i); i += p.length }
  return out
}

// HKDF-SHA256 (extract and expand) to `length` bytes.
async function hkdf(salt: Bytes, ikm: Bytes, info: Bytes, length: number) {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits'])
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, key, length * 8))
}

// RFC 8291: one record, padded with the 0x02 delimiter, under a fresh key pair and salt.
async function encrypt(target: PushTarget, payload: string) {
  const uaPublic = fromB64url(target.p256dh)
  const authSecret = fromB64url(target.auth)
  const local = (await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])) as CryptoKeyPair
  const asPublic = new Uint8Array((await crypto.subtle.exportKey('raw', local.publicKey)) as ArrayBuffer)
  const uaKey = await crypto.subtle.importKey('raw', uaPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, [])
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, local.privateKey, 256))

  const ikm = await hkdf(authSecret, shared, concat(enc.encode('WebPush: info\0'), uaPublic, asPublic), 32)
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const cek = await hkdf(salt, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16)
  const nonce = await hkdf(salt, ikm, enc.encode('Content-Encoding: nonce\0'), 12)

  const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt'])
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, concat(enc.encode(payload), new Uint8Array([2]))))
  // Header: salt, record size, key id length and the sender's public key.
  const header = new Uint8Array(21)
  header.set(salt)
  new DataView(header.buffer).setUint32(16, 4096)
  header[20] = asPublic.length
  return concat(header, asPublic, cipher)
}

export class WebPushClient implements PushSenderPort {
  private readonly jwk: JsonWebKey
  private readonly subject: string
  private signingKey?: Promise<CryptoKey>

  // subject: a mailto: or https: contact for push services (Apple requires one).
  constructor(privateJwk: string, subject: string) {
    this.jwk = JSON.parse(privateJwk) as JsonWebKey
    this.subject = subject
  }

  // The public key in the form browsers take as applicationServerKey (uncompressed point, base64url).
  get publicKey() {
    return b64url(concat(new Uint8Array([4]), fromB64url(this.jwk.x!), fromB64url(this.jwk.y!)))
  }

  private async vapid(endpoint: string) {
    this.signingKey ??= crypto.subtle.importKey('jwk', this.jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign'])
    const part = (o: object) => b64url(enc.encode(JSON.stringify(o)))
    const unsigned = `${part({ typ: 'JWT', alg: 'ES256' })}.${part({ aud: new URL(endpoint).origin, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: this.subject })}`
    const sig = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, await this.signingKey, enc.encode(unsigned)))
    return `vapid t=${unsigned}.${b64url(sig)}, k=${this.publicKey}`
  }

  async send(target: PushTarget, payload: string): Promise<PushResult> {
    try {
      const res = await fetch(target.endpoint, {
        method: 'POST',
        headers: {
          Authorization: await this.vapid(target.endpoint),
          'Content-Encoding': 'aes128gcm',
          'Content-Type': 'application/octet-stream',
          // A reminder is stale after a couple of hours.
          TTL: String(2 * 3600),
          Urgency: 'normal',
        },
        body: await encrypt(target, payload),
      })
      if (res.status === 404 || res.status === 410) return 'gone'
      if (!res.ok) {
        console.error('push', res.status, await res.text().catch(() => ''))
        return 'failed'
      }
      return 'sent'
    } catch (e) {
      console.error('push', e)
      return 'failed'
    }
  }
}
