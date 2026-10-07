import { InboxiliConnectionError, InboxiliError } from "./errors.js";
import type { InboxiliOptions, SendEmailParams, SendEmailResponse } from "./types.js";

const DEFAULT_BASE_URL = "https://api.inboxili.com/api/v1";

class Emails {
  constructor(private readonly client: Inboxili) {}

  /** Sends one transactional email. */
  async send(params: SendEmailParams): Promise<SendEmailResponse> {
    if (!params.htmlBody && !params.templateId) {
      throw new TypeError("Inboxili: provide either htmlBody or templateId.");
    }
    if (!params.templateId && !params.subject) {
      throw new TypeError("Inboxili: subject is required when not using a template.");
    }
    const body = await this.client.post("/transactional/send", {
      to: params.to,
      from_email: params.fromEmail,
      from_name: params.fromName,
      subject: params.subject,
      html_body: params.htmlBody,
      text_body: params.textBody,
      template_id: params.templateId,
      template_data: params.templateData,
    });
    return { status: String(body.status), messageId: (body.message_id as string | null | undefined) ?? null };
  }
}

export class Inboxili {
  readonly emails: Emails;
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly fetchImpl: typeof fetch;

  constructor(options: InboxiliOptions) {
    if (!options?.apiKey) throw new TypeError("Inboxili: apiKey is required.");
    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
    this.timeoutMs = options.timeoutMs ?? 10_000;
    this.maxRetries = options.maxRetries ?? 2;
    this.fetchImpl = options.fetch ?? globalThis.fetch;
    this.emails = new Emails(this);
  }

  /** @internal */
  async post(path: string, payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    // JSON.stringify drops undefined values, so unset optional fields are not sent.
    const body = JSON.stringify(payload);
    for (let attempt = 0; ; attempt++) {
      let res: Response;
      try {
        res = await this.fetchImpl(`${this.baseUrl}${path}`, {
          method: "POST",
          signal: AbortSignal.timeout(this.timeoutMs),
          headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json", "User-Agent": "inboxili-node/0.1.0" },
          body,
        });
      } catch (cause) {
        throw new InboxiliConnectionError("No response from Inboxili. The email may or may not have been sent.", { cause });
      }

      const data = (await res.json().catch(() => ({}))) as { error?: { code?: string; message?: string } } & Record<string, unknown>;
      if (res.ok) return data;
      if (res.status === 429 && attempt < this.maxRetries) {
        await new Promise((r) => setTimeout(r, 2 ** attempt * 1000 + Math.random() * 250));
        continue;
      }
      throw new InboxiliError(res.status, data.error?.code ?? "http_error", data.error?.message ?? res.statusText);
    }
  }
}
