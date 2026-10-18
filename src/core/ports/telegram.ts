/** The bot's side (worker): which account a chat belongs to, and the one-time codes Settings makes. */
export interface TelegramLinkRepositoryPort {
  userForChat(chatId: number): Promise<string | null>
  // The account and creation time behind a connect code, or null.
  code(code: string): Promise<{ userId: string; createdAt: string } | null>
  // Links the chat to the account (unlinking it from any other) and drops the account's codes.
  link(userId: string, chatId: number, username: string | null): Promise<void>
}

/** The signed-in account's side (Settings → Connect Telegram): its linked chat, connect codes, unlinking. */
export interface TelegramAccountRepositoryPort {
  linked(): Promise<{ chat_id: number; username: string | null } | null>
  addCode(code: string): Promise<void>
  unlink(): Promise<void>
}
