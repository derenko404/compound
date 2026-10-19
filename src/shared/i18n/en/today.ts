// today: the Today page, its task form, the focus card and week strip, and the rows built from topics.
import { plural } from '@/shared/i18n/plural'

export const today = {
  title: 'My day',
  goals: 'Tasks',
  routines: 'Routines',
  noRoutines: 'No routines yet. Add one with +.',
  nothingPlanned: 'Nothing planned today. Add a task with +.',
  fromHabits: 'Habits',
  wellbeing: 'Wellbeing',
  fromTopics: 'Small steps',
  openTopic: 'Topic',
  thisWeek: 'This week',
  streak: (n: number) => plural(n, { one: '# day in a row', other: '# days in a row' }),
  countsForStreak: ', counts for the streak',
  addTask: 'Add a task',
  // What a row from a topic is, at the start of its sub line.
  slot: {
    focus: 'Next step',
    light: 'Next step',
    project: 'Project',
    resource: 'Resource',
    review: 'Review',
    catchup: 'Catch up',
  },
  // The task form.
  form: {
    newTitle: 'New task',
    editTitle: 'Edit task',
    submitNew: 'Add',
    // Under the quick-add field, after Return added tasks and cleared it for the next one.
    added: (n: number) => plural(n, { one: '# task added', other: '# tasks added' }),
    nameFirst: 'Give the task a name first.',
    pickDay: 'Pick at least one day.',
    task: 'Task',
    taskPlaceholder: 'Watch one Hussein Nasser video',
    details: 'Details',
    optional: 'Optional',
    when: 'When',
    todayOnly: 'Today',
    once: 'Once, on a date',
    daily: 'Every day',
    weekly: 'On days of the week',
    monthly: 'Every month',
    date: 'Date',
    dayOfMonth: 'Day of month',
    lastDay: 'Last day',
    countsLabel: 'Counts for the streak',
    countsSub: 'A day counts when every streak task due that day is ticked',
  },
  // How a task repeats, under its name.
  when: {
    daily: 'Every day',
    weekly: (days: string) => `Every ${days}`,
    monthlyOn: (day: number) => `Monthly, on day ${day}`,
    monthlyLast: 'Monthly, on the last day',
    once: (date: string) => `On ${date}`,
  },
  // Rows built from the topics.
  rows: {
    allDone: 'Everything on this topic is done.',
    tickedAgo: (skill: string, n: number) => `${skill}, ticked ${plural(n, { one: '# day', other: '# days' })} ago`,
    behind: (finish: string, target: string) => `Behind pace: you'd finish ${finish}, target ${target}`,
    behindIdle: (target: string) => `Behind pace: nothing ticked in 4 weeks, target ${target}`,
  },
  focus: {
    label: 'Focus',
    none: 'No focus topic yet. Pick one on Topics: it gets the study sessions and the weekend project.',
  },
  week: {
    upcoming: 'Upcoming',
    doneOf: (done: number, total: number) => `${done} of ${total} done`,
  },
  reminder: (n: number) => `${plural(n, { one: '# task', other: '# tasks' })} left today. Keep the streak alive.`,
}
