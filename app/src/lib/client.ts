/**
 * The one place the browser talks to the API server.
 *
 * WHAT THIS REPLACES. Every read opened with the same four lines — fetch with `credentials`, check
 * `ok`, throw a sentence, unwrap the envelope — and every entity that wrote more than once grew its
 * own private copy of the same request helper: `agentRequest`, `componentRequest`, and two others,
 * identical apart from the fallback sentence. Four copies of one function is four places for the
 * `body.error` extraction to be forgotten, and it had been, in more than one of them.
 *
 * WHAT IT DOES NOT DO. It owns the transport and nothing about meaning. The envelope key and the
 * sentence a person reads are per-endpoint facts, so they stay at the call site — a client that
 * guessed the envelope would be a client that had to be argued with.
 */

import { t } from "@/lib/i18n";

export type ClientOptions = {
  /** Absent means GET. */
  method?: string;
  /** Serialised as JSON, which is also what sets the content type. */
  body?: unknown;
  /**
   * What a person reads when the server sent no message of its own.
   *
   * Name the entity in it — "Could not load coworkers" rather than "Request failed" — because this
   * is the sentence that reaches the screen when the server is the one that broke.
   *
   * WRITTEN IN ENGLISH AT THE CALL SITE AND TRANSLATED HERE. These are a hundred-odd sentences across
   * forty files, and they are also the strings nobody sees while the deployment is working: a screen
   * that has never failed is a screen whose error text nobody has checked. Translating them in one
   * place means a new call site gets the treatment by being written, rather than by somebody
   * remembering that this particular sentence needed a `t()` too.
   */
  fallback?: string;
  /** For the calls a Bot makes on a person's behalf, which are abandoned when the turn is. */
  signal?: AbortSignal;
};

/** Every request in this app is authenticated, and every one of them is JSON or nothing. */
async function send(path: string, options: ClientOptions): Promise<Response> {
  return fetch(path, {
    method: options.method,
    credentials: "include",
    headers:
      options.body === undefined
        ? undefined
        : { "content-type": "application/json" },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    ...(options.signal ? { signal: options.signal } : {}),
  });
}

/**
 * A request whose failure is a value rather than a throw.
 *
 * For the endpoints where a refusal is the answer: the gateway declining a component call, or the
 * catalogue announcement that is allowed to come back empty. Those callers read the status
 * themselves, and turning a refusal into an exception would make the boundary working look like the
 * boundary breaking.
 */
export function tryClient(
  path: string,
  options: ClientOptions = {},
): Promise<Response> {
  return send(path, options);
}

/**
 * A request that throws when the server says no, carrying the server's own message.
 *
 * With a `key`, the JSON body is parsed and that key unwrapped, so a caller receives the payload
 * rather than the envelope it arrived in. Without one, the `Response` is returned for a caller that
 * only needed to know it worked.
 */
export async function client<T>(
  path: string,
  key: string,
  options?: ClientOptions,
): Promise<T>;
export async function client(
  path: string,
  options?: ClientOptions,
): Promise<Response>;
export async function client<T>(
  path: string,
  keyOrOptions?: string | ClientOptions,
  maybeOptions?: ClientOptions,
): Promise<T | Response> {
  const key = typeof keyOrOptions === "string" ? keyOrOptions : undefined;
  const options =
    (typeof keyOrOptions === "string" ? maybeOptions : keyOrOptions) ?? {};

  const response = await send(path, options);

  if (!response.ok) {
    /*
     * The server's message is the useful one: it names the field or the permission that failed. The
     * fallback is only for the cases where it sent none, or sent something that is not JSON.
     */
    const message = await response
      .json()
      .then((body: { error?: string }) => body.error)
      .catch(() => undefined);
    /*
     * The server's message is translated too. Its sentences are English in `server/src`, and a
     * deployment whose interface is Chinese should not answer a failed permission check in English.
     * A message with a value spliced into it — `Bot x was not found` — is not a dictionary key, so
     * it comes back unchanged, which is the same fallback every missing entry takes.
     */
    throw new Error(
      message ? t(message) : t(options.fallback ?? "That request failed."),
    );
  }

  if (key === undefined) return response;

  // A 204 or a non-JSON body used to throw a bare SyntaxError, and `null` or an array body threw
  // a TypeError on property access. Malformed success is a failed request with the fallback.
  const body = (await response.json().catch(() => null)) as unknown;
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new Error(t(options.fallback ?? "That request failed."));
  }
  return (body as Record<string, T>)[key];
}
