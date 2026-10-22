/**
 * The models this deployment can offer a built-in Bot, for the screen that picks one.
 *
 * WHY THE DEPLOYMENT ANSWERS RATHER THAN THE BROWSER. The list of models is a property of the
 * credential, not of the laptop: an OpenAI-compatible gateway publishes its own catalogue, an
 * OpenAI project key has an allowlist, and neither is something the browser can ask about without
 * being handed the key. So the server asks once, remembers the answer for a few minutes, and hands
 * the names to the screen.
 *
 * NOTHING HERE BLOCKS A SAVE. An endpoint that cannot list its models — many gateways cannot — leaves
 * the default model and nothing else, and the screen falls back to a text field. A model the screen
 * offers and the run then cannot use fails the way it always would: at the call, with the model named.
 */

export type ModelCatalogue = {
  /** `provider/model`, the same string the usage trail records for a Bot on the deployment's model. */
  defaultModel: string;
  /** The names on offer, the default first. Empty when this deployment can name none. */
  models: string[];
};

export type ModelCatalogueSource = {
  /** `openai` or `anthropic`. */
  provider: string;
  /** The deployment's model, without a provider prefix. */
  defaultModel: string;
  /** Names an operator listed by hand, which is the only answer for a provider that cannot be asked. */
  choices: readonly string[];
  /** The OpenAI-compatible endpoint, when one is configured. */
  baseUrl?: string;
  /** Resolves the key to ask with. Called once per refresh, never cached here. */
  apiKey: () => Promise<string | null>;
  fetch?: typeof fetch;
  /** How long an answer is reused. Short, because a catalogue changes when somebody else changes it. */
  ttlMs?: number;
  now?: () => number;
};

/** How many names to hand a screen. More than anybody scrolls, fewer than a dropped-in dump. */
const MAX_MODELS = 400;

/**
 * Parse `OPENBOT_MODEL_CHOICES`: a comma-separated list of model names.
 *
 * This exists because the honest answer for some deployments is a list only they know: a gateway
 * behind a private path, a provider whose catalogue endpoint needs a scope the runtime key lacks.
 * Names are trimmed, de-duplicated, and capped so a pasted dump cannot become the screen.
 */
export function parseModelChoices(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  const seen = new Set<string>();
  for (const entry of raw.split(",")) {
    const name = entry.trim();
    if (!name || name.length > 200 || /[\r\n]/.test(name)) continue;
    seen.add(name);
    if (seen.size >= MAX_MODELS) break;
  }
  return [...seen];
}

export function createModelCatalogue(
  source: ModelCatalogueSource,
): () => Promise<ModelCatalogue> {
  let cached: { at: number; value: ModelCatalogue } | undefined;
  const ttl = source.ttlMs ?? 5 * 60_000;
  const now = source.now ?? Date.now;

  /** The list to offer, in order, without duplicates and with the default first. */
  const assemble = (published: readonly string[]): ModelCatalogue => {
    const ordered = [source.defaultModel, ...source.choices, ...published];
    const seen = new Set<string>();
    const models: string[] = [];
    for (const name of ordered) {
      if (!name || seen.has(name)) continue;
      seen.add(name);
      models.push(name);
      if (models.length >= MAX_MODELS) break;
    }
    return {
      defaultModel: `${source.provider}/${source.defaultModel}`,
      models,
    };
  };

  const published = async (): Promise<string[]> => {
    // Only an OpenAI-shaped endpoint is asked. Anthropic publishes no equivalent list to this call,
    // and asking anyway would spend a request to learn nothing.
    if (source.provider !== "openai" || !source.baseUrl) return [];
    try {
      const key = await source.apiKey();
      if (!key) return [];
      const endpoint = new URL(
        "models",
        source.baseUrl.endsWith("/") ? source.baseUrl : `${source.baseUrl}/`,
      );
      const response = await (source.fetch ?? fetch)(endpoint, {
        headers: { authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(5_000),
      });
      if (!response.ok) return [];
      const body: unknown = await response.json();
      if (!body || typeof body !== "object" || !("data" in body)) return [];
      const rows = body.data;
      if (!Array.isArray(rows)) return [];
      const names: string[] = [];
      for (const row of rows) {
        if (!row || typeof row !== "object" || !("id" in row)) continue;
        const id = row.id;
        if (typeof id === "string" && id.trim()) names.push(id.trim());
        if (names.length >= MAX_MODELS) break;
      }
      return names;
    } catch {
      // A catalogue is a convenience. A gateway that cannot answer it leaves the default alone.
      return [];
    }
  };

  return async () => {
    const at = now();
    if (cached && at - cached.at < ttl) return cached.value;
    const value = assemble(await published());
    cached = { at, value };
    return value;
  };
}
