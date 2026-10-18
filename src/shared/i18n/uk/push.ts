import type { en } from '@/shared/i18n/en'

export const push: typeof en['push'] = {
  morningTitle: 'Доброго ранку ☀️',
  morning: (list) => `Сьогодні: ${list}. Почніть із найлегшого.`,
  eveningTitle: (done, total) => (done ? `Виконано ${done} з ${total}. Чудово!` : 'День ще можна надолужити'),
  evening: (list) => `Залишилось: ${list}. Кожна позначка рахується.`,
  lastTitle: 'Останній шанс на сьогодні 🌙',
  last: (list) => `${list}. Кілька хвилин, і день завершено.`,
  more: (n) => `ще ${n}`,
  helloTitle: 'Нагадування увімкнено ✅',
  hello: 'До зустрічі зранку й увечері. Години можна змінити в Налаштуваннях.',
}
