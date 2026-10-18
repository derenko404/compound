-- Finds get a roadmap chapter, picked by the Telegram bot's AI or in the app. Null = not filed yet.
alter table public.bookmarks add column chapter text;
