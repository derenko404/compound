/**
 * The whole state (notes included) as one JSON blob in localStorage: the data of people who use the app without
 * an account, or (under its own key per account) the device's copy of a signed-in account, for working offline.
 * The key keeps the old `roadmap-` prefix: renaming it would hide existing device data.
 */
import { emptyState, type State } from '../../core/domain/types'

export class LocalStore {
  static readonly KEY = 'roadmap-log-v2'
  private readonly key: string

  constructor(key = LocalStore.KEY) {
    this.key = key
  }

  // Whether anything was ever saved under this key.
  has() {
    return localStorage.getItem(this.key) !== null
  }

  read(): State {
    try {
      const raw = localStorage.getItem(this.key)
      return raw ? { ...emptyState(), ...JSON.parse(raw) } : emptyState()
    } catch {
      return emptyState()
    }
  }

  write(s: State) {
    localStorage.setItem(this.key, JSON.stringify(s))
  }

  // Reads the blob, lets `change` edit it, and writes it back.
  async edit(change: (s: State) => void) {
    const s = this.read()
    change(s)
    this.write(s)
  }

  clear() {
    localStorage.removeItem(this.key)
  }
}
