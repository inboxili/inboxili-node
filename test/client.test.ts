import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";

import { Inboxili, InboxiliConnectionError, InboxiliError, verifyWebhookSignature } from "../src/index.js";

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

test("sends the documented request and maps the response", async () => {
  let seen: { url: string; init: RequestInit } | undefined;
  const client = new Inboxili({
    apiKey: "ik_live_x",
    fetch: (async (url: string, init: RequestInit) => {
      seen = { url, init };
      return json(200, { status: "sent", message_id: "m1" });
    }) as unknown as typeof fetch,
  });
  const out = await client.emails.send({ to: "a@b.co", fromEmail: "hi@x.co", subject: "S", htmlBody: "<p>{{n}}</p>", templateData: { n: 1 } });
  assert.deepEqual(out, { status: "sent", messageId: "m1" });
  assert.equal(seen!.url, "https://api.inboxili.com/api/v1/transactional/send");
  assert.equal((seen!.init.headers as Record<string, string>).Authorization, "Bearer ik_live_x");
  assert.deepEqual(JSON.parse(seen!.init.body as string), { to: "a@b.co", from_email: "hi@x.co", subject: "S", html_body: "<p>{{n}}</p>", template_data: { n: 1 } });
});

test("validates required content before any request", async () => {
  const client = new Inboxili({ apiKey: "k", fetch: (async () => assert.fail("should not call")) as unknown as typeof fetch });
  await assert.rejects(client.emails.send({ to: "a@b.co", fromEmail: "x@y.co", subject: "s" }), TypeError);
  await assert.rejects(client.emails.send({ to: "a@b.co", fromEmail: "x@y.co", htmlBody: "<p>x</p>" }), TypeError);
});

test("maps API errors", async () => {
  const client = new Inboxili({ apiKey: "k", fetch: (async () => json(422, { error: { code: "sender_not_verified", message: "nope" } })) as unknown as typeof fetch });
  await assert.rejects(
    client.emails.send({ to: "a@b.co", fromEmail: "x@y.co", subject: "s", htmlBody: "x" }),
    (e: unknown) => e instanceof InboxiliError && e.status === 422 && e.code === "sender_not_verified" && e.message === "nope"
  );
});

test("retries 429 only, then succeeds", async () => {
  let calls = 0;
  const client = new Inboxili({
    apiKey: "k",
    maxRetries: 1,
    fetch: (async () => (++calls === 1 ? json(429, { error: { code: "rate_limited", message: "slow" } }) : json(200, { status: "sent", message_id: null }))) as unknown as typeof fetch,
  });
  const out = await client.emails.send({ to: "a@b.co", fromEmail: "x@y.co", templateId: "t" });
  assert.equal(calls, 2);
  assert.equal(out.messageId, null);
});

test("does not retry 5xx or network errors", async () => {
  let calls = 0;
  const c500 = new Inboxili({ apiKey: "k", fetch: (async () => (calls++, json(500, {}))) as unknown as typeof fetch });
  await assert.rejects(c500.emails.send({ to: "a@b.co", fromEmail: "x@y.co", templateId: "t" }), InboxiliError);
  assert.equal(calls, 1);
  const cNet = new Inboxili({ apiKey: "k", fetch: (async () => { throw new Error("boom"); }) as unknown as typeof fetch });
  await assert.rejects(cNet.emails.send({ to: "a@b.co", fromEmail: "x@y.co", templateId: "t" }), InboxiliConnectionError);
});

test("verifies webhook signatures", () => {
  const body = '{"event":"delivered"}';
  const sig = createHmac("sha256", "s3cret").update(body).digest("hex");
  assert.equal(verifyWebhookSignature(body, sig, "s3cret"), true);
  assert.equal(verifyWebhookSignature(body, sig, "other"), false);
  assert.equal(verifyWebhookSignature(body + " ", sig, "s3cret"), false);
  assert.equal(verifyWebhookSignature(body, "zz", "s3cret"), false);
});
