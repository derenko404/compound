/**
 * The whole state (notes included) as one JSON blob in localStorage, for people who use the app without an
 * account. The key keeps the old `roadmap-` prefix: renaming it would hide existing device data.
 */
import { emptyState, type State } from '../../core/domain/types'

export class LocalStore {
  static readonly KEY = 'roadmap-log-v2'

  read(): State {
    try {
      const raw = localStorage.getItem(LocalStore.KEY)
      return raw ? { ...emptyState(), ...JSON.parse(raw) } : emptyState()
    } catch {
      return emptyState()
    }
  }

  write(s: State) {
    localStorage.setItem(LocalStore.KEY, JSON.stringify(s))
  }

  // Reads the blob, lets `change` edit it, and writes it back.
  async edit(change: (s: State) => void) {
    const s = this.read()
    change(s)
    this.write(s)
  }

  clear() {
    localStorage.removeItem(LocalStore.KEY)
  }
}
