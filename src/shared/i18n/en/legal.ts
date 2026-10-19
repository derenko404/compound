// legal: the privacy policy and terms (/privacy, /terms), public pages. Keep them true to what the app does.
export const legal = {
  updated: 'Last updated 19 October 2026',
  back: 'Compound',
  privacyTitle: 'Privacy policy',
  privacyLead: 'Compound is a personal project. It keeps your data to run the app for you, and for nothing else. No ads, no selling, no tracking.',
  privacy: [
    {
      title: 'What we keep',
      items: [
        'Your account: the email, name and picture Google shares when you sign in.',
        'What you add: topics, steps, tasks, habits, mood, lists, notes and links, and when you ticked them.',
        'If you turn on reminders: the browser’s push address and keys for that device, its time zone, language and the hours you chose.',
        'If you connect Telegram: your chat id and username, so the bot knows whose Notebook to save to.',
        'AI access tokens: only a fingerprint (hash) of each token, never the token itself.',
        'Shared links: a copy of the topic or list you shared, without your ticks or notes.',
      ],
    },
    {
      title: 'On this device only',
      paras: ['Theme, language, sounds and the timer stay in your browser. If you use Compound without an account, everything you add stays on your device and never reaches us.'],
    },
    {
      title: 'How it’s used',
      paras: ['Only to show you your data, sync it between your devices, send the reminders you turned on and answer you in Telegram. Notes and links you send to the bot are read by an AI model to pick tags and a topic, and pages you ask it to summarise are sent to it too.'],
    },
    {
      title: 'Who helps run it',
      items: [
        'Supabase stores the data and handles sign-in.',
        'Cloudflare hosts the app and the server, runs the AI model (Workers AI) and keeps short technical logs.',
        'Google, for signing in.',
        'Apple, Google or Mozilla deliver reminders to your browser. The message is encrypted on the way.',
        'Telegram, for messages to and from the bot.',
        'An AI you connect with a token (like Claude) gets what you let it read. You choose that, and you can revoke the token any time.',
      ],
    },
    {
      title: 'How long',
      paras: ['Your data stays until you delete it. Shared links stop working after 7 days and are then deleted. Unused Telegram connect codes are deleted after a day.'],
    },
    {
      title: 'Your choices',
      items: [
        'Export everything any time: Settings → Backup.',
        'Delete items in the app, turn reminders off, disconnect Telegram or revoke tokens in Settings.',
        'To delete your account and all its data, write to us from the email you signed up with.',
      ],
    },
    {
      title: 'Children',
      paras: ['Compound isn’t meant for children under 13.'],
    },
    {
      title: 'Changes',
      paras: ['If this policy changes, the date at the top changes too. Big changes will be shown in the app.'],
    },
  ],
  contact: (email: string) => `Questions or requests: ${email}`,
  termsTitle: 'Terms of use',
  termsLead: 'Compound is a free personal app. By using it you agree to these simple terms.',
  terms: [
    {
      title: 'Your content',
      paras: ['What you add is yours. We only use it to run the app for you, as the privacy policy says.'],
    },
    {
      title: 'Fair use',
      items: [
        'Don’t use Compound for anything illegal or to harm others.',
        'Don’t try to break, overload or get around its limits, including through the API.',
        'Shared links can be opened by anyone who has them. Don’t share what you wouldn’t want others to see.',
      ],
    },
    {
      title: 'As it is',
      paras: ['Compound is provided as it is, without warranties. We try to keep it running and your data safe, but can’t promise it will always be available or free of mistakes. Keep a backup of what matters (Settings → Backup).'],
    },
    {
      title: 'Liability',
      paras: ['As far as the law allows, we aren’t liable for losses that come from using Compound or from it being unavailable.'],
    },
    {
      title: 'Changes and ending',
      paras: ['We may change or stop Compound. If it stops, you’ll get time to export your data. You can stop using it and ask us to delete your account at any time.'],
    },
  ],
}
