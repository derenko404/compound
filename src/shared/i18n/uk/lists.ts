import type { en } from '@/shared/i18n/en'

export const lists: typeof en['lists'] = {
  title: 'Списки',
  empty: 'Списків поки немає. Створіть перший через +.',
  newList: 'Новий список',
  deleteList: 'Видалити список',
  deleteListText: 'Його пункти, позначки й нотатки буде видалено. Цю дію не можна скасувати.',
  sheet: {
    createList: 'Створити список',
    nameFirst: 'Спершу назвіть список.',
    shortName: 'Коротка назва',
    shortNamePlaceholder: '📚 Книжки',
    detail: 'Деталь під кожним пунктом',
    detailPlaceholder: 'Автор',
    detailHint: 'Наприклад, автор для книжок, рік для фільмів, виконавець для пісень',
    title: 'Заголовок',
    titlePlaceholder: '100 книжок, які варто прочитати кожному',
  },
  item: {
    addTo: (name) => `Додати до «${name}»`,
    edit: 'Змінити пункт',
    titleFirst: 'Спершу вкажіть назву.',
    title: 'Назва',
    details: 'Деталі',
    deleteText: 'Його позначку й нотатку буде видалено. Цю дію не можна скасувати.',
  },
  review: {
    label: 'Ваш відгук',
    placeholder: 'Думки, оцінка, коли і де',
    write: (title) => `Написати відгук про ${title}`,
    edit: (title) => `Змінити відгук про ${title}`,
  },
  page: {
    gone: 'Цього списку більше немає.',
    editDetails: (name) => `Змінити назву й заголовок списку «${name}»`,
    search: (name) => `Пошук у «${name}»`,
    show: 'Показати',
    filters: { all: 'Усі', todo: 'Ще не зроблено', done: 'Готово' },
    emptyList: 'Список порожній. Натисніть +, щоб додати пункти.',
    emptyFilter: 'З цим фільтром тут нічого немає.',
  },
}
