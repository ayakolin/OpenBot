import { createFileRoute, Link } from "@tanstack/react-router";
import { BotSubpage } from "@/components/bot-profile/bot-subpage";
import { MemorySources } from "@/components/memory/sources";
import { ProactiveResearchSettings } from "@/components/suggestions/proactive-panel";
import type { ReactNode } from "react";
import { type Translate, t } from "@/lib/i18n";
import { trNodes } from "@/lib/i18n/nodes";

export const Route = createFileRoute("/_authed/_app/bots/$agentId/memory")({
  component: MemoryPage,
});

/** Where the person's own memory is kept, as one sentence with the link set in it. */
export function MemoryLocationHint({
  link,
  tr = t,
}: {
  link: ReactNode;
  tr?: Translate;
}) {
  return trNodes(
    "What your Bots remember about you is in {link}.",
    { link },
    undefined,
    tr,
  );
}

function MemoryPage() {
  const { agentId } = Route.useParams();
  return (
    <BotSubpage
      agentId={agentId}
      description={t(
        "Which connected apps feed this Bot facts, and the background research it does for you.",
      )}
      title={t("Memory")}
    >
      {(agent) => (
        <>
          <p className="mt-6 text-muted-foreground text-sm">
            <MemoryLocationHint
              link={
                <Link
                  className="underline underline-offset-4"
                  to="/settings/memory"
                >
                  {t("Settings → Memory")}
                </Link>
              }
            />
          </p>
          <MemorySources agentId={agent.id} />
          <ProactiveResearchSettings agentId={agent.id} />
        </>
      )}
    </BotSubpage>
  );
}
