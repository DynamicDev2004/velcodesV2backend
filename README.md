# Velcodes client portal

A Node.js backend and branded client, administrator and worker workspace. The marketing website remains separate and can be served by this process on the same origin.

## Included

- Email/password accounts with scrypt password hashing, hashed session tokens and HttpOnly cookies.
- Email verification, single-use invitations and password reset links.
- Client, administrator and worker permissions enforced by the API.
- Guest website messenger with an opaque browser recovery token; messages are stored in SQLite, not in localStorage.
- Live updates through Server-Sent Events, with reconnect handling and a polling fallback for signed-in workspaces.
- Guest conversations transferred to a verified client account when signing in on the same browser.
- Projects, assigned workers, progress, change requests and project activity.
- Invoices in integer minor units, draft/issued/paid/void workflow, client visibility and print/PDF view.
- Durable email outbox with retry and Resend integration. Disabled until configured.
- SQLite WAL persistence, consistent database backups, input validation, origin checks, rate limits and role/access integration tests.

The messenger is a direct line to your team, not an AI responder. Invoice payments are recorded manually by administrators after confirming receipt; no card processing or automatic bank reconciliation is included.

## Local setup

Requires Node.js 22.16 or newer. This implementation uses Node's built-in SQLite module, which prints an experimental warning on Node 22. There are no third-party runtime packages.

```sh
cp .env.example .env
npm run admin
npm start
```

Open **http://localhost:4180/portal/**. The initial administrator is `info@velcodes.com`. `npm run admin` creates an unguessable temporary password in `.local/admin-access.txt` (permissions 0600). Change it at first sign-in; the account cannot access business records until this is done. The script does not overwrite an existing administrator. Keep your new password in a password manager and remove the temporary credential file afterwards.

To run the marketing website and the chat widget locally, set `SITE_DIRECTORY` to the absolute path of the site's `dist` directory. In the original combined Velcodes workspace, `../dist` is already the default. Open **http://localhost:4180/** for the website. The server injects the messenger into served marketing HTML; it does not modify the published website files. Without a marketing directory, the root redirects to the portal.

Keep the same hostname (`localhost`, not a mix of `127.0.0.1` and `localhost`) because writes are checked against `APP_ORIGIN`.

## First workflow

1. Sign in as administrator and change the temporary password.
2. Open **People → Invite a person**. Choose client or worker. With email disabled, the administrator receives a private one-use invitation URL to share directly with that person. Do not publish invitation URLs.
3. The recipient opens the invitation and sets a password. Their email is verified through possession of that invitation.
4. Create a project for the activated client. Assign activated workers from the project view.
5. The client sees project progress, assigned workers, requests, activity, project messages and issued invoices. Workers see only their assigned projects and messages, never invoices.
6. Create invoices as drafts and issue them when ready. Only the administrator can mark an issued invoice paid or void it. Payment confirmation must happen outside the portal.
7. Open the website in a signed-out browser to test guest messaging. The administrator receives the conversation in Messages; replies appear live in the guest chat.

Public registration is supported but requires email verification. Until email delivery is configured, use administrator invitations for local account testing. Do not use production customer data in disposable test accounts.

## Email setup

Use a verified sender domain with Resend, then configure `.env`:

```dotenv
EMAIL_PROVIDER=resend
RESEND_API_KEY=your-secret-key
EMAIL_FROM=Velcodes <portal@velcodes.com>
NOTIFICATION_EMAIL=info@velcodes.com
```

Never commit `.env`. Restart the process after changing configuration. Guest and client messages are saved before notification delivery is attempted. Delivery runs every 15 seconds, retries transient failures with backoff, and retains failed items in `email_outbox`. Administrator Overview reports pending and failed counts. The authenticated admin API `POST /api/email/retry` requeues failed notifications. Old email-verification/reset links can expire while delivery is disabled; request a new reset email after enabling the provider.

## Hosting on a VPS

GitHub stores source code; GitHub Pages does not run this Node.js backend. Use a VPS or a service with a persistent disk. This version is intentionally a **single Node process with a local SQLite database**. Do not deploy several replicas sharing this database file, and do not put it on ephemeral storage.

1. Install a supported Node version and clone this repository into a dedicated directory.
2. Create a non-root service account. Make only `data/` and `.local/` writable to that account.
3. Copy `.env.example` to `.env`, configure `NODE_ENV=production`, an HTTPS `APP_ORIGIN`, and a stable database path.
4. Put the existing website output in `SITE_DIRECTORY` if this server should serve the full site. Keep the portal and messenger on the **same origin** through your reverse proxy.
5. Run `npm run admin` once as the service account.
6. Adapt `deploy/velcodes.service` and `deploy/nginx.conf` to the server paths and domain. Terminate TLS at the reverse proxy, disable buffering for `/api/events`, and keep Node bound to loopback.
7. Enable the service, verify `/api/health`, then test login, a guest message and a reply before directing visitors to it.
8. Configure email delivery and schedule encrypted/off-server database backups before production use.

A Dockerfile and Compose example are provided. Run the container behind an HTTPS reverse proxy, use a persistent database volume, and mount the website files read-only. Do not expose the development server directly to the internet.

## Backups

```sh
npm run backup
```

This uses SQLite's online backup API and writes a consistent snapshot to `data/backups/`. Protect backups as confidential: they contain messages, user details, invoices and hashed credentials. Copy encrypted backups off the server and test restoration. Restore only with the application stopped; retain the original database and WAL files until recovery is verified.

The original marketing site was separately archived before portal development. That archive is held in the local parent workspace's `backups/` directory and is not uploaded to this repository.

## Validation

```sh
npm test
```

The integration test uses a temporary database and disposable example.test accounts. It exercises role isolation, unauthenticated access, cross-origin writes, project assignment, request updates, invoice privacy, idempotent messages, guest recovery, live events, account invitations, session revocation, conversation claiming and data persistence after reopening the database. No external emails are sent by the tests.

## Operational limits

- Administrators should verify the intended person before sharing an invitation link. Possession of the link activates that account.
- Guest recovery is device-specific, expires after 180 days, and is lost when browser storage is cleared. Anyone with access to that browser can access its guest conversation until it is linked to an account.
- Message views show the most recent 1,000 messages; earlier messages remain stored in the database.
- No uploads, automated AI replies, payment gateway, two-factor authentication or automatic tax calculations are included.
- Use HTTPS in production; passwords, session tokens and API secrets must never enter GitHub or frontend code.
