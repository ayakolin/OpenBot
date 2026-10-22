import { describe, expect, test } from "bun:test";
import { decideSignInMethod } from "../src/auth/index";

/**
 * The gate every sign-in passes through, and the one method this deployment checks itself.
 *
 * `email-password` is the odd one out: the three named providers and a registered directory are
 * somebody else's assertion about who a person is, while a password is this deployment's own. So it
 * is admitted only when the feature is on, and an administrator who turned SSO-required on — which
 * is a statement that this deployment trusts a directory — closes it, with the same break-glass the
 * other methods get.
 */
describe("decideSignInMethod", () => {
  const ssoOff = async () => false;
  const ssoOn = async () => true;
  const admins = ["boss@example.com"];

  test("a directory's word is enough, whatever SSO says", async () => {
    for (const method of ["sso-oidc", "sso-saml", "scim"]) {
      expect(
        await decideSignInMethod({
          method,
          email: "someone@example.com",
          ssoRequired: ssoOn,
          initialAdminEmails: admins,
        }),
      ).toBe("allow");
    }
  });

  test("a password is refused when the feature is off, even with SSO not required", async () => {
    // What keeps a deployment from quietly acquiring a second way in: Better Auth's routes exist in
    // the package either way, and this is what stops them being usable.
    expect(
      await decideSignInMethod({
        method: "email-password",
        email: "someone@example.com",
        ssoRequired: ssoOff,
        initialAdminEmails: admins,
      }),
    ).toBe("refuse");
  });

  test("a password is admitted when the feature is on and SSO is not required", async () => {
    expect(
      await decideSignInMethod({
        method: "email-password",
        email: "someone@example.com",
        ssoRequired: ssoOff,
        initialAdminEmails: admins,
        credentials: true,
      }),
    ).toBe("allow");
  });

  test("SSO-required closes passwords, but leaves the administrators their way back in", async () => {
    expect(
      await decideSignInMethod({
        method: "email-password",
        email: "someone@example.com",
        ssoRequired: ssoOn,
        initialAdminEmails: admins,
        credentials: true,
      }),
    ).toBe("refuse");

    expect(
      await decideSignInMethod({
        method: "email-password",
        email: "boss@example.com",
        ssoRequired: ssoOn,
        initialAdminEmails: admins,
        credentials: true,
      }),
    ).toBe("break_glass");
  });

  test("a settings read that fails refuses rather than admits", async () => {
    expect(
      await decideSignInMethod({
        method: "email-password",
        email: "someone@example.com",
        ssoRequired: async () => {
          throw new Error("database is down");
        },
        initialAdminEmails: admins,
        credentials: true,
      }),
    ).toBe("refuse");
  });
});
