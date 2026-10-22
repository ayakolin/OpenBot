import { createFileRoute } from "@tanstack/react-router";
import { BotSubpage } from "@/components/bot-profile/bot-subpage";
import { SetupSections } from "@/components/bot-profile/setup";
import { t } from "@/lib/i18n";

export const Route = createFileRoute("/_authed/_app/bots/$agentId/setup")({
  component: SetupPage,
});

function SetupPage() {
  const { agentId } = Route.useParams();
  return (
    <BotSubpage
      agentId={agentId}
      description={t("Who this Bot is, who can find it, and where it runs.")}
      title={t("Setup")}
    >
      {(agent) => <SetupSections agent={agent} />}
    </BotSubpage>
  );
}
