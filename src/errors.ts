/** Raised for any non-2xx response from the Inboxili API. */
export class InboxiliError extends Error {
  /** HTTP status code. */
  readonly status: number;
  /** Machine-readable error code from the API, for example `sender_not_verified`. */
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "InboxiliError";
    this.status = status;
    this.code = code;
  }
}

/** Raised when no response was received (network failure or timeout). The email may or may not have been sent. */
export class InboxiliConnectionError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "InboxiliConnectionError";
  }
}
