import { createFileRoute, Link } from "@tanstack/react-router";
import { BotSubpage } from "@/components/bot-profile/bot-subpage";
import { MemorySources } from "@/components/memory/sources";
import { ProactiveResearchSettings } from "@/components/suggestions/proactive-panel";
import { t } from "@/lib/i18n";

export const Route = createFileRoute("/_authed/_app/bots/$agentId/memory")({
  component: MemoryPage,
});

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
            {t("What your Bots remember about you is in")}{" "}
            <Link
              className="underline underline-offset-4"
              to="/settings/memory"
            >
              {t("Settings → Memory")}
            </Link>
            {t(".")}
          </p>
          <MemorySources agentId={agent.id} />
          <ProactiveResearchSettings agentId={agent.id} />
        </>
      )}
    </BotSubpage>
  );
}
