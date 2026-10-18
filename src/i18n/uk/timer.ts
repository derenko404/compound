import type { en } from '../en'
import { plural } from '../plural'

export const timer: typeof en['timer'] = {
  title: 'Таймер',
  lead: 'Виберіть тривалість, запустіть і зосередьтеся до сигналу.',
  settings: 'Налаштування таймера',
  length: 'Тривалість',
  lengths: { short: 'Короткий', long: 'Довгий', custom: 'Свій' },
  customLength: 'Своя тривалість',
  fewer: 'Менше хвилин',
  more: 'Більше хвилин',
  running: 'Фокус',
  ready: 'Готовий',
  paused: 'Пауза',
  reset: 'Скинути',
  pause: 'Пауза',
  start: 'Почати',
  resume: 'Продовжити',
  sound: 'Звук під час роботи',
  sounds: { off: 'Вимк.', tick: 'Цокання', rain: 'Дощ', brown: 'Глибокий' },
  range: (max) => `Від 1 до ${max} хвилин.`,
  shortMinutes: 'Короткий, хвилин',
  longMinutes: 'Довгий, хвилин',
  backTo: (short, long) => `Повернути ${short} і ${long} хв`,
  timesUp: 'Час вийшов',
  minutesDone: (n) => `${plural(n, { one: '# хвилину', few: '# хвилини', many: '# хвилин', other: '# хвилини' })} позаду.`,
}
