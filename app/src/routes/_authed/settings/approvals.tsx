import { createFileRoute } from "@tanstack/react-router";
import { ApprovalSettings } from "@/components/approvals/settings";
import { PageShell } from "@/components/layout/page-shell";
import { t } from "@/lib/i18n";

export const Route = createFileRoute("/_authed/settings/approvals")({
  component: ApprovalsSettingsPage,
});

function ApprovalsSettingsPage() {
  return (
    <PageShell
      description={t(
        "Whether your Bots ask before they change things, and rules that apply to all of them.",
      )}
      title={t("Approvals")}
    >
      <ApprovalSettings />
    </PageShell>
  );
}
