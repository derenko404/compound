import type { MessengerPort } from '../../core/ports/messenger'

/** The Telegram Bot API, for the bot's replies. Link previews are off: the reply already names the link. */
export class TelegramClient implements MessengerPort {
  private readonly token: string

  constructor(token: string) {
    this.token = token
  }

  async send(chatId: number, text: string) {
    await fetch(`https://api.telegram.org/bot${this.token}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, link_preview_options: { is_disabled: true } }),
    })
  }
}
