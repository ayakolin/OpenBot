import { createFileRoute } from "@tanstack/react-router";
import { BotSubpage } from "@/components/bot-profile/bot-subpage";
import { BotResponsibilities } from "@/components/responsibilities/responsibilities";
import { t } from "@/lib/i18n";

export const Route = createFileRoute(
  "/_authed/_app/bots/$agentId/responsibilities",
)({
  component: ResponsibilitiesPage,
});

function ResponsibilitiesPage() {
  const { agentId } = Route.useParams();
  return (
    <BotSubpage
      agentId={agentId}
      description={t(
        "Lasting goals this Bot works on for you, what started each run, and what it found.",
      )}
      title={t("Responsibilities")}
    >
      {(agent) => <BotResponsibilities agentId={agent.id} />}
    </BotSubpage>
  );
}
