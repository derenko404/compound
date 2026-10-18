// Sends a plain-text message to a chat (the Telegram bot's replies).
export interface MessengerPort {
  send(chatId: number, text: string): Promise<void>
}
