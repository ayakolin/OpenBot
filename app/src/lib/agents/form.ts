import { z } from "zod";
import type { AgentProfile } from "./queries";

/**
 * Browser-side coworker form contract. Limits match the server parser so validation errors can be
 * shown next to fields before submit.
 */
export const agentFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required.")
    .max(80, "Name must be 80 characters or fewer."),
  title: z
    .string()
    .trim()
    .min(1, "Title is required.")
    .max(120, "Title must be 120 characters or fewer."),
  roleDescription: z
    .string()
    .trim()
    .min(1, "A description of what it does is required.")
    .max(1000, "What it does must be 1000 characters or fewer."),
  visibility: z.enum(["public", "private"]),
  /**
   * The model this Bot runs on. Empty means the deployment's own, which is what every Bot did before
   * a Bot could be given one.
   *
   * Empty and untouched are the same value here on purpose: this form always submits the whole
   * object, so it cannot say "leave it alone", and it does not need to — the field is filled from
   * what the server reports, so submitting it back unchanged is the leave-alone case.
   */
  /*
   * Defaulted rather than required, so every existing caller that builds a partial object — a test, a
   * screen that only edits a title — keeps working and means "the deployment's model".
   */
  model: z
    .string()
    .trim()
    .max(200, "Model must be at most 200 characters.")
    .refine((value) => !/[\r\n]/.test(value), "Model must be one line.")
    .default(""),
  /**
   * The AG-UI endpoint this coworker runs on. Empty means the Bot in the box.
   *
   * Only URL shape is checked here; deployment allow/deny rules are server-side.
   */
  endpoint: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || /^https?:\/\/\S+$/.test(value),
      "Enter a web address starting with http:// or https://.",
    ),
  /**
   * A key the agent sits behind. WRITE-ONLY: it is never sent back from the server, so this field is
   * always empty when editing, and leaving it empty keeps whatever key is already set.
   */
  authValue: z.string(),
});

export type AgentFormValues = z.infer<typeof agentFormSchema>;

export const emptyAgentForm: AgentFormValues = {
  name: "",
  title: "",
  roleDescription: "",
  visibility: "private",
  endpoint: "",
  authValue: "",
  model: "",
};

/** Convert form values to API input; omit an empty key so editing preserves the current credential. */
export function agentInputFrom(values: AgentFormValues) {
  return {
    name: values.name,
    title: values.title,
    roleDescription: values.roleDescription,
    visibility: values.visibility,
    endpoint: values.endpoint,
    /*
     * Sent always, and empty means "the deployment's model" rather than "leave it alone". The form
     * fills this from what the server reports, so an untouched field travels back as the value that
     * is already stored and an emptied one arrives as the clear it is.
     */
    model: values.model,
    ...(values.authValue.trim()
      ? { auth: { header: "Authorization", value: values.authValue.trim() } }
      : {}),
  };
}

/**
 * The full update body for changing one or two fields of a Bot.
 *
 * The update endpoint takes the whole profile, so unchanged fields ride along as stored. Not a
 * built-in Bot's endpoint: that is the managed Bot's own address, which nobody typed, and the route
 * checks any endpoint it is sent as one somebody did — on a deployment whose Bot is on localhost it
 * refused every edit. Empty leaves the stored one where it is, and the empty key keeps the current
 * one.
 */
export function profileUpdateInput(
  profile: AgentProfile,
  patch: Partial<AgentFormValues>,
) {
  return agentInputFrom({
    name: profile.name,
    title: profile.title,
    roleDescription: profile.roleDescription,
    visibility: profile.visibility,
    endpoint: profile.builtIn ? "" : (profile.endpoint ?? ""),
    authValue: "",
    // What the server says it runs on, so an edit that touches the title does not clear it.
    model: profile.model ?? "",
    ...patch,
  });
}
