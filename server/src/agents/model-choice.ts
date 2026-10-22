/**
 * Which model a built-in Bot actually runs on, for the places that must know before a run starts.
 *
 * The model allowlist and the usage trail both ask this question ahead of the call, and both used to
 * answer it with the deployment's model for every built-in Bot. Now that a coworker may name its own
 * model, that answer is wrong in the one direction that matters: a Bot on a model an administrator
 * removed from the list would be recorded as running the deployment's model and admitted.
 *
 * So this reads the same place the runtime reads — `configuration.model` — and otherwise falls back
 * to the deployment's. The provider is always the deployment's, because a per-Bot choice replaces
 * the model name and nothing else: `openai/<name>`, never a different provider's key.
 *
 * `deploymentModel` is already `provider/model`; a configuration naming one keeps that prefix.
 */
export function effectiveBuiltInModel(
  configuration: unknown,
  deploymentModel: string | undefined,
  /** An administrator's change to a package Bot, which outranks the package's own file. */
  override?: unknown,
): string | undefined {
  if (!deploymentModel) return undefined;
  const chosenFromOverride = chosenModelIn(override);
  if (chosenFromOverride) return qualify(chosenFromOverride, deploymentModel);
  const chosen = chosenModelIn(configuration);
  return chosen ? qualify(chosen, deploymentModel) : deploymentModel;
}

/** The model name stored in a configuration or override object, or null. */
function chosenModelIn(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  if (!("model" in value)) return null;
  const chosen = value.model;
  return typeof chosen === "string" && chosen.trim() ? chosen.trim() : null;
}

/**
 * `provider/name`, with the deployment's provider unless the name already carries one.
 *
 * A name that carries a provider is used as written, which is what a gateway that namespaces its
 * catalogue publishes and what an administrator types into the allowlist.
 */
function qualify(name: string, deploymentModel: string): string {
  if (name.includes("/")) return name;
  const slash = deploymentModel.indexOf("/");
  const provider =
    slash === -1 ? deploymentModel : deploymentModel.slice(0, slash);
  return `${provider}/${name}`;
}
