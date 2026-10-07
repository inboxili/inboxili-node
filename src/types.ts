export interface InboxiliOptions {
  /** API key (starts with `ik_live_`). Needs the `transactional:send` scope. */
  apiKey: string;
  /** Defaults to `https://api.inboxili.com/api/v1`. */
  baseUrl?: string;
  /** Per-request timeout in milliseconds. Default 10000. */
  timeoutMs?: number;
  /**
   * How many times to retry after HTTP 429 (rate limited). Default 2.
   * Only 429 is retried: the request was rejected before sending, so retrying cannot duplicate an email.
   * Timeouts and 5xx are never retried automatically, because the API has no idempotency key.
   */
  maxRetries?: number;
  /** Custom fetch implementation (for tests or proxies). */
  fetch?: typeof fetch;
}

/** Provide either `htmlBody` or `templateId`. `subject` is required unless a template is used. */
export interface SendEmailParams {
  /** One recipient address. */
  to: string;
  /** Must be a registered sender on a verified domain in your workspace. */
  fromEmail: string;
  fromName?: string;
  subject?: string;
  htmlBody?: string;
  /** Plain-text part. Merge tags are NOT applied to it by the API. */
  textBody?: string;
  /** UUID of a template in your workspace. */
  templateId?: string;
  /** Values for `{{merge_tags}}`. Values are converted to strings by the API. */
  templateData?: Record<string, string | number | boolean>;
}

export interface SendEmailResponse {
  /** `sent` means the delivery provider accepted the message, not that it reached the inbox. */
  status: string;
  messageId: string | null;
}
