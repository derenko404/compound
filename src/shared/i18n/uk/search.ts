import type { en } from '@/shared/i18n/en'

export const search: typeof en['search'] = {
  title: 'Пошук',
  open: 'Шукати всюди',
  placeholder: 'Шукайте теми, нотатки, списки, завдання',
  hint: 'Знайдіть тему, крок, ресурс, проєкт, нотатку, пункт списку, завдання чи звичку.',
  nothing: 'Нічого не знайдено.',
  listsPlaceholder: 'Шукайте списки та їхні пункти',
  kinds: {
    topic: 'Теми', skill: 'Навички', step: 'Кроки', task: 'Завдання тем', resource: 'Ресурси', project: 'Проєкти',
    list: 'Списки', listItem: 'У ваших списках', routine: 'Завдання', habit: 'Звички', note: 'Нотатник',
  },
}
