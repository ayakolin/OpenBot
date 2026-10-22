import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/layout/page-shell";
import { NativeDevices, RecentDeliveries } from "@/components/settings/devices";
import { UpdateRoutingSection } from "@/components/settings/update-routing";
import { t } from "@/lib/i18n";

export const Route = createFileRoute("/_authed/settings/notifications")({
  component: NotificationsPage,
});

/** Where your Bots' updates reach you, for all of your Bots at once. Each Bot's own page says how much. */
function NotificationsPage() {
  return (
    <PageShell
      description={t(
        "Where updates from all your Bots reach you when you are not looking. How much each Bot sends is on its own page.",
      )}
      title={t("Notifications")}
    >
      <UpdateRoutingSection />
      <NativeDevices />
      <RecentDeliveries />
    </PageShell>
  );
}
