// Random ids and secrets from the platform's crypto (browser and worker alike).
export const random = {
  // URL-safe base64 of n random bytes.
  base64url(bytes: number) {
    const b = crypto.getRandomValues(new Uint8Array(bytes))
    return btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  },
  // n characters a person can read back without mixing up (no 0/O, 1/l).
  readable(n: number) {
    const abc = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    return [...crypto.getRandomValues(new Uint8Array(n))].map((b) => abc[b % abc.length]).join('')
  },
}
