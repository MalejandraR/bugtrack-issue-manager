// Tiny app-wide signal so the nav counter and the lists can refresh
// themselves after a mutation without touching the shared hooks.
// Fired after create / edit / status changes; nothing else listens.

const ISSUES_UPDATED = 'bugtrack:issues-updated'

/** Notifies that the issues collection changed on the server. */
export function notifyIssuesChanged() {
  window.dispatchEvent(new Event(ISSUES_UPDATED))
}

/** Subscribes to that signal; returns the unsubscribe function. */
export function onIssuesChanged(listener) {
  window.addEventListener(ISSUES_UPDATED, listener)
  return () => window.removeEventListener(ISSUES_UPDATED, listener)
}
