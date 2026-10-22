import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signInWithPassword, signUpWithPassword } from "@/lib/auth/client";
import { t } from "@/lib/i18n";

/**
 * The form for a deployment that checks its own passwords.
 *
 * Two modes in one component rather than two screens, because they share every field and disagree
 * about two: a name exists only on the way in, and the words change. Splitting them would mean a
 * person who mistyped their address on the wrong screen has to navigate back through the router to
 * find out they were in the wrong place.
 *
 * WHAT THIS DOES NOT DO. No "remember me", no password strength meter, no verification mail: this
 * deployment has no mail service, which is why the copy says so instead of pretending a link is on
 * its way. The button is disabled while a request is in flight and the failure is the server's own
 * words, because Better Auth's messages ("Invalid email or password") are already what a person
 * needs to read.
 */
export function PasswordForm({
  canSignUp,
  onDone,
}: {
  /**
   * Whether to offer "create an account".
   *
   * A deployment that has closed sign-up still needs the form — everybody signs in through it — so
   * this hides the switch rather than the form.
   */
  canSignUp: boolean;
  /** Called after a successful sign-in or sign-up, so the screen can leave for the app. */
  onDone: () => void;
}) {
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signingUp = mode === "sign-up";
  const ready =
    email.trim().length > 0 &&
    password.length > 0 &&
    (!signingUp || name.trim().length > 0);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!ready || busy) return;
    setBusy(true);
    setError(null);
    try {
      if (signingUp) {
        await signUpWithPassword({
          name: name.trim(),
          email: email.trim(),
          password,
        });
      } else {
        await signInWithPassword({ email: email.trim(), password });
      }
      onDone();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : t("Could not sign in."),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="mt-3" onSubmit={submit}>
      {signingUp ? (
        <Input
          autoComplete="name"
          className="mb-2"
          onChange={(event) => setName(event.target.value)}
          placeholder={t("Your name")}
          required
          value={name}
        />
      ) : null}
      <Input
        autoComplete="email"
        className="mb-2"
        onChange={(event) => setEmail(event.target.value)}
        placeholder={t("you@company.com")}
        required
        type="email"
        value={email}
      />
      <Input
        autoComplete={signingUp ? "new-password" : "current-password"}
        onChange={(event) => setPassword(event.target.value)}
        placeholder={
          signingUp ? t("At least 12 characters") : t("Your password")
        }
        required
        type="password"
        value={password}
      />
      <Button
        className="mt-2 h-10 w-full tracking-tight"
        disabled={!ready || busy}
        size="lg"
        type="submit"
      >
        {busy ? t("Working…") : signingUp ? t("Create account") : t("Sign in")}
      </Button>
      {error ? (
        <p className="mt-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {canSignUp ? (
        <p className="mt-3 text-center text-xs text-muted-foreground">
          {signingUp ? t("Already have an account?") : t("No account yet?")}{" "}
          <button
            className="underline underline-offset-2"
            onClick={() => {
              setMode(signingUp ? "sign-in" : "sign-up");
              setError(null);
            }}
            type="button"
          >
            {signingUp ? t("Sign in") : t("Create one")}
          </button>
        </p>
      ) : null}
    </form>
  );
}
