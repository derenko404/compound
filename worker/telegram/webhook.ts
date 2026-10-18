import { findUrls } from '../../core/domain/finds'
import type { MessengerPort } from '../../core/ports/messenger'
import type { BotMessage, TelegramBotService } from '../../core/services/telegram-bot.service'
import type { ExecutionContext } from '../env'

interface TgEntity { type: string; url?: string }
interface TgMessage {
  chat: { id: number }
  from?: { username?: string }
  text?: string
  caption?: string
  entities?: TgEntity[]
  caption_entities?: TgEntity[]
  reply_to_message?: TgMessage
}

/**
 * The bot's webhook at /tg: checks Telegram's secret header, answers at once (slow pages would otherwise make
 * Telegram retry the update), and does the work in the background, replying through the messenger.
 */
export class TelegramWebhook {
  private readonly secret: string
  private readonly bot: TelegramBotService
  private readonly messenger: MessengerPort

  constructor(deps: { secret: string; bot: TelegramBotService; messenger: MessengerPort }) {
    this.secret = deps.secret
    this.bot = deps.bot
    this.messenger = deps.messenger
  }

  async handle(req: Request, ctx: ExecutionContext): Promise<Response> {
    if (req.method !== 'POST' || req.headers.get('x-telegram-bot-api-secret-token') !== this.secret) return new Response('Forbidden', { status: 403 })
    const update = (await req.json()) as { message?: TgMessage }
    const m = update.message
    if (m) ctx.waitUntil(this.reply(m).catch((e) => console.error('tg', e)))
    return new Response('ok')
  }

  private async reply(m: TgMessage) {
    const text = await this.bot.handle(this.toBotMessage(m))
    await this.messenger.send(m.chat.id, text)
  }

  private toBotMessage(m: TgMessage): BotMessage {
    return {
      chatId: m.chat.id,
      username: m.from?.username ?? null,
      text: m.text ?? m.caption ?? '',
      textLinks: this.textLinks(m),
      replyLinks: m.reply_to_message ? [...new Set([...findUrls(m.reply_to_message.text ?? m.reply_to_message.caption ?? ''), ...this.textLinks(m.reply_to_message)])] : [],
    }
  }

  // Links hidden behind text (Telegram's text_link entities).
  private textLinks(m: TgMessage) {
    return [...(m.entities ?? []), ...(m.caption_entities ?? [])].flatMap((e) => (e.type === 'text_link' && e.url ? [e.url] : []))
  }
}
