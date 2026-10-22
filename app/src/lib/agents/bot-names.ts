import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import { t } from "@/lib/i18n";
import { displayAgentName } from "./display-name";
import { type AgentProfile, agentListQueryOptions } from "./queries";

/**
 * Map visible Bot ids to names for admin read surfaces; deleted or hidden ids fall back to the
 * immutable id recorded in the event.
 */

/** Stable query selector so the id-to-name map only rebuilds when the roster changes. */
const toNames = (agents: AgentProfile[]): Map<string, AgentProfile> =>
  new Map(agents.map((agent) => [agent.id, agent]));

export function useBotNames(): (botId: string) => string {
  const { data: names } = useQuery({
    ...agentListQueryOptions(),
    select: toNames,
  });

  /*
   * Translated when asked rather than inside the selector, so the cached map never holds a name
   * rendered in a language that has since changed.
   */
  return useCallback(
    (botId: string) => {
      const agent = names?.get(botId);
      return agent ? displayAgentName(agent, t) : botId;
    },
    [names],
  );
}
