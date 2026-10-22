import type { en } from '@/shared/i18n/en'

export const notebook: typeof en['notebook'] = {
  title: 'Нотатник',
  add: 'Додати нотатку, ідею чи посилання',
  searchLabel: 'Пошук у нотатнику',
  searchPlaceholder: 'Шукайте за текстом, посиланням або #тегом',
  filter: 'Фільтр',
  all: 'Усі',
  empty: 'Тут поки порожньо. Натисніть +, щоб додати нотатку, ідею чи посилання.',
  today: 'Сьогодні',
  yesterday: 'Вчора',
  sheet: {
    writeFirst: 'Спершу напишіть щось.',
    note: 'Нотатка',
    notePlaceholder: 'Думка, яку варто зберегти, ідея або посилання і чому воно важливе',
    aiContext: 'Контекст від ШІ',
    aiContextHint: 'Його написав ШІ, коли бот зберіг цей запис. Змінити його не можна.',
    tags: 'Теги',
    tagPlaceholder: 'Тег',
  },
  card: {
    entry: 'запис',
    deleteEntry: 'Видалити запис',
    deleteAsk: 'Видалити цей запис?',
    deleteText: 'Його буде остаточно видалено з нотатника.',
    opensNewTab: 'відкриється в новій вкладці',
    viaTelegram: 'через Telegram',
  },
  kinds: { video: 'Відео', post: 'Допис', site: 'Сайт' },
}
