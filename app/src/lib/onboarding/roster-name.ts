import { type AgentLike, displayAgentName } from "@/lib/agents/display-name";
import { t as defaultT, type Translate } from "@/lib/i18n";

/**
 * The name on an onboarding roster card. A placeholder is a code constant standing in for a Bot the
 * deployment does not have, so its name is translated outright; a real Bot is user or deployment data
 * and goes through `displayAgentName`, which translates only the ones that ship in the box.
 */
export function rosterCardName(
  card: AgentLike & { example?: boolean },
  t: Translate = defaultT,
): string {
  return card.example ? t(card.name) : displayAgentName(card, t);
}
