# Server session and account-switch limits

The browser login UI uses Firebase Bearer tokens and no longer automatically calls
`POST /api/auth/session`. That endpoint and cookie-only authentication remain
available to existing clients. This avoids starting new shared-cookie exchanges
from the login UI; it is not a complete cookie isolation protocol.

A browser applies `Set-Cookie` before application JavaScript can discard a stale
response. An older client, another tab, or an already-started exchange may still
install account A's HttpOnly cookie after account B signs in. Existing cookies
are not removed on Firebase Logout. Cookie-only requests can therefore still act
as the cookie account. Bearer requests take precedence over the cookie on the
server. Session-cookie clients must not assume that switching Firebase accounts
or logging out has switched or invalidated the server session.

Revoking refresh tokens checks session cookies against Firebase's revocation time,
but the SDK can accept a cookie authenticated in the same second until its
expiration. Existing bearer ID tokens can also remain valid until expiration.
The UI displays an account-generation-scoped recovery prompt on persistent API
401s, including during onboarding. The prompt does not itself call signOut or
navigate to a login page. Password and Google recovery use Firebase's
reauthentication API for the captured user, not a global sign-in. Requests started
without an established account do not adopt a later sign-in.

Firebase sign-out is asynchronous and not conditional on the initiating account;
a sign-out, token refresh, or reauthentication already in progress can still
affect a later account. In particular, the SDK can start an unscoped sign-out on
invalidated-token errors. Checks before starting or after finishing cannot cancel
an SDK sign-out already queued. Avoid switching accounts while those operations
are in progress. This prompt does not eliminate that race.

The client fences the account and generation at API invocation; it cannot prove
the provenance of payloads constructed before invocation, stop an already-sent
request, or prevent a caller from applying already-consumed data after switching.
Standard response body readers are fenced through completion; direct stream
readers and subsequent caller work still need their own lifecycle checks.

A complete solution requires a coordinated server-side session lifecycle and an
ordered, cross-tab/browser response protocol (including already-issued cookies and
in-flight requests), with appropriate security review. A JavaScript generation
check, request cancellation, or single-tab serialization alone cannot stop the
browser applying a late Set-Cookie. The local Chromium test reproduces that
boundary with routed responses; it does not exercise a production deployment.
