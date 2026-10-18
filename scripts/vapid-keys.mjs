/**
 * Makes a VAPID key pair for push reminders. Run once: node scripts/vapid-keys.mjs <file>
 * The private key (a JWK) goes to <file>, for `npx wrangler secret put VAPID_PRIVATE_KEY < <file>`; delete the file
 * afterwards. The public key is printed: set it as VITE_VAPID_PUBLIC_KEY in .env and in Cloudflare's build variables.
 */
import { generateKeyPairSync } from 'node:crypto'
import { writeFileSync } from 'node:fs'

const file = process.argv[2]
if (!file) throw new Error('Usage: node scripts/vapid-keys.mjs <file for the private key>')
const jwk = generateKeyPairSync('ec', { namedCurve: 'P-256' }).privateKey.export({ format: 'jwk' })
writeFileSync(file, JSON.stringify(jwk), { mode: 0o600 })
const raw = Buffer.concat([Buffer.from([4]), Buffer.from(jwk.x, 'base64url'), Buffer.from(jwk.y, 'base64url')])
console.log(`VITE_VAPID_PUBLIC_KEY=${raw.toString('base64url')}`)
