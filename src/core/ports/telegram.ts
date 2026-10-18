// Which account a Telegram chat belongs to, and the one-time codes Settings → Connect Telegram makes.
export interface TelegramLinkRepositoryPort {
  userForChat(chatId: number): Promise<string | null>
  // The account and creation time behind a connect code, or null.
  code(code: string): Promise<{ userId: string; createdAt: string } | null>
  // Links the chat to the account (unlinking it from any other) and drops the account's codes.
  link(userId: string, chatId: number, username: string | null): Promise<void>
}
