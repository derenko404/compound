// topics: the Topics index, a topic's page, its forms, its content (skills, resources, projects) and sharing.
export const topics = {
  // Resource kinds, by the ids in content.ts RESOURCE_KINDS: group titles and filter chips (plural), the form's Type (one).
  resourceKinds: {
    book: 'Books', course: 'Courses', video: 'Videos', article: 'Articles', podcast: 'Podcasts',
    doc: 'Docs and guides', tool: 'Tools and apps', practice: 'Practice', other: 'Other',
  },
  resourceKind: {
    book: 'Book', course: 'Course', video: 'Video', article: 'Article', podcast: 'Podcast',
    doc: 'Doc or guide', tool: 'Tool or app', practice: 'Practice', other: 'Other',
  },
  // Project sizes, by the values in content.ts PROJECT_SIZES.
  sizes: {
    small: { label: 'Small', means: 'a few hours to a few days' },
    medium: { label: 'Medium', means: 'one to a few weeks' },
    big: { label: 'Big', means: 'a month or more' },
  },
  focus: 'Focus',
  setFocus: 'Set focus',
  goals: 'Goals',
  goalsBy: (month: string) => `Where you'll be by ${month}`,

  index: {
    title: 'Topics',
    lead: 'Your roadmap, one topic per skill area, all running in parallel.',
    yours: 'Your topics',
    other: 'Other',
    newTopic: 'New topic',
    empty: 'No topics yet. Tap + to add one.',
    deleteTopic: "Its skills, resources and projects go with it. Notes filed under it stay in your notebook. This can't be undone.",
  },

  card: {
    // perWeek is already formatted, finish is a short month and year.
    pace: (perWeek: string, finish: string) => `${perWeek} steps a week, done around ${finish}`,
    late: (month: string) => `, after your ${month} target`,
    counts: (skills: number, resources: number) => `${skills} skills, ${resources} resources`,
  },

  page: {
    gone: 'This topic no longer exists.',
    back: 'Topics',
    editDetails: (name: string) => `Edit ${name}'s details`,
    about: (name: string) => `About ${name}`,
    // Under the topic's name: its next step.
    allDone: 'Every step is done.',
    stepsDone: 'Steps done',
    allLearned: 'All learned',
    aboutEmpty: 'Nothing here yet. Tap Edit, then the name.',
    inProgress: 'In progress:',
    andMore: (n: number) => ` and ${n} more`,
    deleteTopic: 'Delete topic',
    deleteProject: (code: string, name: string) => `Delete ${code} ${name}?`,
    deleteSkill: "Its steps and their ticks go with it. This can't be undone.",
    notesEmpty: 'Nothing here yet. Add notes, ideas and links with +, or send them to your Telegram bot.',
  },

  tabs: { skills: 'Skills', resources: 'Resources', projects: 'Projects', notebook: 'Notebook' },
  add: { skill: 'New skill', resource: 'New resource', project: 'New project', note: 'New note' },
  empty: {
    projects: 'No projects yet.',
    skills: 'No skills yet. Tap + to add one.',
    resources: 'No resources yet.',
    steps: 'No steps yet.',
  },
  resources: {
    search: 'Search by title or note',
    typeFilter: 'Resource type',
    all: 'All',
    free: 'Free',
    newTab: 'opens in a new tab',
  },
  skills: {
    stepsInOrder: 'Steps, in order',
    now: (name: string) => `${name}, now`,
  },
  project: {
    status: { todo: 'Not started', doing: 'In progress', done: 'Done' },
    changeStatus: (name: string, status: string) => `${name}: ${status}. Change status`,
    doneWhen: 'Done when',
    trains: 'Trains',
    size: 'Size',
  },

  // The forms.
  form: {
    newTopic: 'New topic',
    createTopic: 'Create topic',
    topicNameFirst: 'Give the topic a name first.',
    name: 'Name',
    topicNamePlaceholder: 'Technical',
    topicNameHint: 'Keep it short: it shows on tags and buttons',
    about: 'About',
    aboutPlaceholder: 'What this topic is about, why it matters, and advice for learning it',
    aboutHint: 'Separate paragraphs with an empty line',
    duration: 'Duration',
    finishAround: (month: string) => `Finish around ${month}. Your pace shows whether you'll make it.`,
    noTargetHint: 'No target: pace just shows when you would finish.',
    months: (n: number) => `${n} months`,
    noTarget: 'No target',
    keywords: 'Keywords',
    keywordsHint: 'Helps us in categorization',
    keywordsPlaceholder: 'budget',

    newProject: 'New project',
    projectNameFirst: 'Give the project a name first.',
    projectNamePlaceholder: 'URL shortener on AWS',
    projectCodeHint: (code: string) => `Its code is ${code}. Mention it in any text to link here.`,
    goal: 'Goal',
    steps: 'Steps',
    doneWhen: 'Done when',
    trains: 'Trains',
    trainsPlaceholder: 'A skill it practises',
    size: 'Size',

    newResource: 'New resource',
    editResource: 'Edit resource',
    resourceTitleFirst: 'Give the resource a title first.',
    title: 'Title',
    titlePlaceholder: 'Designing Data-Intensive Applications',
    link: 'Link',
    type: 'Type',
    note: 'Note',
    free: 'Free',

    newSkill: 'New skill',
    editSkill: 'Edit skill',
    skillNameFirst: 'Give the skill a name first.',
    skillNamePlaceholder: 'Startups',
    intro: 'Description (optional)',
    introPlaceholder: 'What this skill is and why it matters',
    stepsInOrder: 'Steps, in order',
    stepsPlaceholder: 'Finding ideas',
    stepsHint: "Ticks stay on items you don't change.",
  },

  share: {
    title: (name: string) => `Share ${name}`,
    describe: (kind: 'topic' | 'list', days: number) =>
      `Anyone with the link can see this ${kind === 'topic' ? 'topic' : 'list'} and add a copy to their own, for ${days} days. Your data will not be changed.`,
    failed: "Couldn't make the link. Try again.",
    signIn: 'Sign in to share. Links are kept in your account.',
    link: 'Link',
    creating: 'Creating…',
    create: 'Create link',
  },

  // The public share page (/share/<id>), also seen signed out.
  shared: {
    needsOnline: 'Shared links need the online app.',
    expired: "This link doesn't work any more. Links last 7 days, or its owner may have deleted it.",
    items: (n: number) => `${n} items`,
    yours: 'Shared by you. This is what people see when they open the link.',
    aTopic: 'A shared topic',
    openTopic: 'Open my topic',
    openList: 'Open my list',
    signInToAdd: 'Sign in to add',
    addTopic: 'Add to my topics',
    addList: 'Add to my lists',
  },
}
