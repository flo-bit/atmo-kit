# Reporting

`ReportDialog` owns the reason/details form, pending and success states, and the signed-out email fallback. Apps own the trigger, sessions, subject references, canonical links, mailbox, and server submission.

```svelte
<ReportDialog
	bind:open
	isLoggedIn={viewer.isLoggedIn}
	email="reports@example.com"
	subjectUrl={canonicalUrl}
	onsignin={showLogin}
	submit={async (input) => {
		try {
			await sendReport({ subject, ...input });
		} catch {
			return { message: 'Reporting is unavailable. Please report by email.' };
		}
	}}
/>
```

`submit` receives `{ reasonType, reason? }`, using the standard ATProto spam, violation, and other reason identifiers. Blank details are omitted; entered details are trimmed and limited to 2,000 characters. Resolve with no value after a successful save, or return `{ message, needsSignIn? }` for a safe, user-facing failure. `needsSignIn` offers a sign-in-again action. Unexpected rejections show a generic failure without exposing exception details.

The email fallback prefills the subject link and any entered details. Opening a new dialog or changing `subjectUrl` resets its state; stale async results are ignored. The dialog does not import an app's auth singleton, contact a moderation service, or decide who can report a subject. Server authorization remains mandatory.
