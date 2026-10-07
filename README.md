# @inboxili/node

Node.js client for the [Inboxili](https://inboxili.com) transactional email API. TypeScript-first, no runtime dependencies, Node 18+.

```bash
npm install @inboxili/node
```

## Send an email

```ts
import { Inboxili } from "@inboxili/node";

const inboxili = new Inboxili({ apiKey: process.env.INBOXILI_API_KEY! });

const { status, messageId } = await inboxili.emails.send({
  to: "ada@example.com",
  fromEmail: "hello@yourdomain.com", // must be a sender on a verified domain
  fromName: "Acme",
  subject: "Welcome, {{first_name}}",
  htmlBody: "<p>Hi {{first_name}}, your account is ready.</p>",
  textBody: "Hi Ada, your account is ready.",
  templateData: { first_name: "Ada" },
});
```

`status: "sent"` means the delivery provider accepted the message. It does not mean the inbox received it. Use webhooks for delivery events.

### From a template

```ts
await inboxili.emails.send({
  to: "ada@example.com",
  fromEmail: "hello@yourdomain.com",
  templateId: "00000000-0000-0000-0000-000000000000",
  templateData: { first_name: "Ada" },
});
```

## Authentication

Create an API key in the dashboard under Settings, Developer, with the `transactional:send` scope. Keep it on the server and load it from the environment. Never ship it in browser code.

## Options

| Option | Default | |
|---|---|---|
| `apiKey` | required | Your `ik_live_...` key |
| `baseUrl` | `https://api.inboxili.com/api/v1` | |
| `timeoutMs` | `10000` | Per-request timeout |
| `maxRetries` | `2` | Retries after HTTP 429 only |
| `fetch` | global `fetch` | Custom implementation |

## Error handling

```ts
import { InboxiliError, InboxiliConnectionError } from "@inboxili/node";

try {
  await inboxili.emails.send({ /* ... */ });
} catch (err) {
  if (err instanceof InboxiliError) {
    console.error(err.status, err.code, err.message); // e.g. 422 sender_not_verified
  } else if (err instanceof InboxiliConnectionError) {
    // No response. The email may or may not have been sent.
  } else throw err;
}
```

| Status | `code` | Meaning |
|---|---|---|
| 401 | `unauthorized` | Missing, invalid, revoked or expired key |
| 403 | `forbidden` | Missing scope, or IP not allowed |
| 422 | `validation_error`, `sender_not_verified`, `send_failed` | Bad request, unverified sender, or provider rejection |
| 429 | `rate_limited` | Over 120 requests per minute for this key |

**Retries.** Only HTTP 429 is retried automatically, because the request was rejected before sending. Timeouts and 5xx responses are never retried: the API has no idempotency key, so a retry could send a duplicate. Track "already sent" state yourself for emails that must not repeat.

## Webhooks

```ts
import { verifyWebhookSignature } from "@inboxili/node";

// Use the raw request body, not re-serialised JSON.
const ok = verifyWebhookSignature(rawBody, req.headers["x-inboxili-signature"] as string, process.env.INBOXILI_WEBHOOK_SECRET!);
```

## Limits of the API

One recipient per request. No attachments, CC, BCC or reply-to fields. No scheduling. See the [API reference](https://inboxili.com/transactional-email-api).

## Development

```bash
npm install
npm test
npm run build
```

## Links

[Documentation](https://inboxili.com/docs) · [Node.js guide](https://inboxili.com/integrations/nodejs) · [Report a vulnerability](SECURITY.md) · MIT licensed
