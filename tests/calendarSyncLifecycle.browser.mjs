// Offline real ContentStudio/Calendar/StudioHub lifecycle regressions.
// Publishing is unavailable: do not simulate success or invent durable provider idempotency.
// This exercises actual parent unmount/remount, detail reopen, A-B-A, and no Published writes.
// The prior red reproduction is preserved in the external repair backup.
import './publishingHonesty.browser.mjs';
