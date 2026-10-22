import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/layout/page-shell";
import { MemoryList, RememberFact } from "@/components/memory/memories";
import { t } from "@/lib/i18n";

export const Route = createFileRoute("/_authed/settings/memory")({
  component: MemorySettingsPage,
});

function MemorySettingsPage() {
  return (
    <PageShell
      action={<RememberFact />}
      description={t(
        "What your Bots know about you. Facts you tell them reach every Bot; what a Bot learns stays with that Bot.",
      )}
      title={t("Memory")}
    >
      <MemoryList />
    </PageShell>
  );
}
