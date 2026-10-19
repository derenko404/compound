/**
 * The number on the installed app's icon (Badging API): own tasks and habits left today. Shows only in the
 * installed app (iOS also needs notification permission), and does nothing where it isn't supported.
 */
function set(count: number) {
  if (!('setAppBadge' in navigator)) return
  const done = count > 0 ? navigator.setAppBadge(count) : navigator.clearAppBadge()
  done.catch(() => { /* not allowed here (no permission, not installed) */ })
}

export const appBadge = { set }
