import type { TelegramAccountRepositoryPort } from '../ports/telegram'
import { random } from './random'

/** Settings → Connect Telegram: the linked chat, a one-time code for t.me/<bot>?start=<code>, and unlinking. */
export class TelegramConnectService {
  private readonly account: TelegramAccountRepositoryPort

  constructor(account: TelegramAccountRepositoryPort) {
    this.account = account
  }

  linked() {
    return this.account.linked()
  }

  // The bot checks the code (valid 15 minutes) and saves the link.
  async newCode() {
    const code = random.base64url(18)
    await this.account.addCode(code)
    return code
  }

  unlink() {
    return this.account.unlink()
  }
}
