export type AgentVisibility = "public" | "private";

export type AgentActor = {
  id: string;
  role: "admin" | "user";
};

export type AgentProfile = {
  id: string;
  name: string;
  title: string;
  roleDescription: string;
  avatarSeed: string;
  visibility: AgentVisibility;
  ownerUserId: string | null;
  systemOwned: boolean;
  hidden: boolean;
  pinned: boolean;
  /** An administrator assigned this Team Bot to this person; it stays in their sidebar. */
  assignedToMe?: boolean;
  deletedAt: Date | null;
  /** Where this coworker runs. Null for the Bot in the box. */
  endpoint: string | null;
  /**
   * The model this Bot runs on, when it runs here and somebody chose one.
   *
   * Null means the deployment's configured model (`BOT_MODEL`, else the tenant package's
   * `default_model`). A name rather than `provider/model`, because a built-in Bot takes its provider
   * and its credential from the deployment: this picks which model of that provider answers, and
   * nothing here can move a Bot onto a key the deployment does not hold.
   *
   * Always null for a remote Bot, which chooses its own model at its own endpoint.
   */
  model: string | null;
  /** Whether a key is set for it. Never the key. */
  hasAuth: boolean;
  /**
   * Whether this agent holds a credential for calling tools back.
   *
   * A boolean, never the token: the token exists in a readable form once, in the response that issued
   * it. A surface only needs to know whether to offer "generate" or "rotate".
   */
  hasCallbackToken: boolean;
};

export type CreateAgentInput = Pick<
  AgentProfile,
  "name" | "title" | "roleDescription" | "visibility"
> & {
  /**
   * The AG-UI endpoint this Bot runs on, or undefined for the one in the box.
   *
   * This field is the AG-UI endpoint for a customer-provided agent. Without it the Bot runs on the
   * built-in endpoint.
   */
  endpoint?: string;
  /**
   * A key this agent sits behind, if any.
   *
   * Write-only. It goes to the vault and is never read back to a person: the edit form shows that a
   * key is set, not what it is. Absent on an update means "leave whatever is there alone", which is
   * why it is optional rather than defaulting to empty; a blank field must not drop a key.
   */
  auth?: { header: string; value: string };
  /**
   * The model this Bot runs on, when it runs here.
   *
   * Optional, and only meaningful for a `built_in` coworker: a remote Bot chooses its own model at
   * its own endpoint, and a stored name would be a setting that changes nothing. Absent or blank
   * means the deployment's configured model.
   *
   * Validated for shape in `parseAgentInput` and checked against what the deployment can actually
   * call by the route, because an unservable name would otherwise fail at the first message rather
   * than at the form.
   */
  model?: string;
};
