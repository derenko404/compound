import type { en } from '@/shared/i18n/en'

export const lists: typeof en['lists'] = {
  title: 'Списки',
  empty: 'Списків поки немає. Натисніть «Додати», щоб створити перший.',
  newList: 'Новий список',
  deleteList: 'Видалити список',
  deleteListText: 'Його пункти й позначки буде видалено. Цю дію не можна скасувати.',
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
    deleteText: 'Його позначку буде видалено. Цю дію не можна скасувати.',
  },
  page: {
    gone: 'Цього списку більше немає.',
    editDetails: (name) => `Змінити назву й заголовок списку «${name}»`,
    search: (name) => `Пошук у «${name}»`,
    show: 'Показати',
    filters: { all: 'Усі', todo: 'Ще не зроблено', done: 'Готово' },
    emptyList: 'Список порожній. Натисніть «Додати», щоб додати пункти.',
    emptyFilter: 'З цим фільтром тут нічого немає.',
  },
}
