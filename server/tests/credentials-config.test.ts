import { describe, expect, test } from "bun:test";
import {
  configuredAuthProviders,
  hasIdentityProvider,
  loadConfig,
} from "../src/config";

/**
 * Email and password, as configuration.
 *
 * The point of this deployment's own sign-in is the deployment with no directory to point at, so the
 * cases that matter are what happens around it: it must not be mistaken for "no sign-in at all", and
 * it must not be reachable without somebody having written the flag that turns it on.
 */
const base = {
  DATABASE_URL: "postgres://openbot:openbot@localhost:5432/openbot",
  KEY_ENCRYPTION_KEY: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
  BETTER_AUTH_SECRET: "a-long-enough-local-development-auth-secret",
  BETTER_AUTH_URL: "http://localhost:3001",
  INITIAL_ADMIN_EMAILS: "admin@openbot.test",
  INTELLIGENCE_API_URL: "http://localhost:7100",
  INTELLIGENCE_GATEWAY_WS_URL: "ws://localhost:7103",
  INTELLIGENCE_API_KEY: "tenant-api-key",
};

describe("credentials sign-in", () => {
  test("off unless asked for, and then it is a sign-in rather than a no-sign-in mode", () => {
    /*
     * With the session secret present and nothing to use it, start-up refuses: that is the existing
     * rule, and it is the right one — a secret that mints sessions for a deployment with no sign-in
     * is a configuration somebody half-wrote.
     */
    expect(() => loadConfig(base)).toThrow("no identity provider is");
    /*
     * Turning the secret off is the deployment that genuinely has no sign-in. Its absence is the
     * whole point: `hasIdentityProvider` must say no, so `singleUserAllowed` is the thing that
     * decides whether it may run.
     */
    const {
      BETTER_AUTH_SECRET: _secret,
      BETTER_AUTH_URL: _url,
      INITIAL_ADMIN_EMAILS: _admins,
      ...noSignIn
    } = base;
    expect(
      hasIdentityProvider(
        loadConfig({ ...noSignIn, OPENBOT_SINGLE_USER: "true" }).auth,
      ),
    ).toBe(false);

    const on = loadConfig({ ...base, OPENBOT_CREDENTIALS_SIGN_IN: "true" });
    expect(on.auth?.credentials).toEqual({ signUp: "open" });
    /*
     * The load-bearing assertion. Without this, a credentials deployment is "no identity provider",
     * so `singleUserEnabled` throws at start-up unless OPENBOT_SINGLE_USER is set, and if it is set
     * the deployment admits every visitor as one administrator — the exact thing a password is here
     * to stop.
     */
    expect(hasIdentityProvider(on.auth)).toBe(true);
    expect(on.singleUser).toBe(false);
  });

  test("no provider buttons, because there is no third party", () => {
    const config = loadConfig({ ...base, OPENBOT_CREDENTIALS_SIGN_IN: "true" });
    expect(configuredAuthProviders(config.auth)).toEqual([]);
  });

  test("sign-up may be closed without switching the form off", () => {
    const config = loadConfig({
      ...base,
      OPENBOT_CREDENTIALS_SIGN_IN: "true",
      OPENBOT_CREDENTIALS_SIGN_UP: "closed",
    });
    expect(config.auth?.credentials).toEqual({ signUp: "closed" });
  });

  test("a misspelled sign-up policy stops start-up rather than being read as open", () => {
    expect(() =>
      loadConfig({
        ...base,
        OPENBOT_CREDENTIALS_SIGN_IN: "true",
        OPENBOT_CREDENTIALS_SIGN_UP: "Opened",
      }),
    ).toThrow("OPENBOT_CREDENTIALS_SIGN_UP");
  });

  test("the reset webhook has to be an address a link can be posted to", () => {
    expect(() =>
      loadConfig({
        ...base,
        OPENBOT_CREDENTIALS_SIGN_IN: "true",
        OPENBOT_CREDENTIALS_RESET_WEBHOOK: "not-a-url",
      }),
    ).toThrow("OPENBOT_CREDENTIALS_RESET_WEBHOOK");

    const config = loadConfig({
      ...base,
      OPENBOT_CREDENTIALS_SIGN_IN: "true",
      OPENBOT_CREDENTIALS_RESET_WEBHOOK: "https://hooks.example.com/openbot",
    });
    expect(config.auth?.credentials?.resetWebhook).toBe(
      "https://hooks.example.com/openbot",
    );
  });

  test("credentials and a provider can coexist, and the provider buttons still appear", () => {
    const config = loadConfig({
      ...base,
      OPENBOT_CREDENTIALS_SIGN_IN: "true",
      GOOGLE_OAUTH_CLIENT_ID: "google-client-id",
      GOOGLE_OAUTH_CLIENT_SECRET: "google-client-secret",
    });
    expect(configuredAuthProviders(config.auth)).toEqual(["google"]);
    expect(config.auth?.credentials).toBeDefined();
  });
});
