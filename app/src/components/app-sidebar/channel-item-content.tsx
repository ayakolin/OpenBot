import { IconPinFilled } from "@tabler/icons-react";
import { ChannelAvatar } from "@/components/channels/avatar";
import type { MessageListEmphasis } from "@/lib/settings/message-list";

/**
 * A roster row's two lines, shared by live conversations and the appearance preference previews.
 *
 * THE SIZES ARE THE DESKTOP APP'S. Its roster draws a name at `--cursor-font-size-base` (13px) and
 * a preview at `--cursor-font-size-xs` (11px); `text-sm` and `text-xs` land on 13.1 and 11.25 here
 * because this app's root is 15px, which is the same pair within a rounding error and needs no
 * arbitrary values. The arbitrary `text-[0.9rem]` these replaced resolved to 13.5px — a size that
 * existed nowhere in the design and made the two lines 2px apart rather than 2.
 *
 * `data-emphasis` is what says which line is the large one, rather than a caller or a test having
 * to read a class list to find out. The preference screen offers exactly this choice, and the
 * attribute is the choice itself; the classes are only how it is drawn.
 */
export function ChannelItemContent({
  participantIds,
  name,
  title,
  displayedTitle = title,
  lastMessageAt,
  emphasis,
  busy = false,
  unread = false,
  pinned = false,
  revealing = false,
}: {
  participantIds: string[];
  name: string;
  title: string;
  displayedTitle?: string;
  lastMessageAt?: string;
  emphasis: MessageListEmphasis;
  busy?: boolean;
  unread?: boolean;
  pinned?: boolean;
  revealing?: boolean;
}) {
  const line = (isPrimary: boolean) =>
    isPrimary
      ? "text-sm leading-5 font-medium"
      : "text-xs leading-4 text-muted-foreground";
  const namePrimary = emphasis === "agent";

  return (
    <div className="flex min-w-0 flex-1 items-center gap-2.5">
      <div className="shrink-0">
        <ChannelAvatar
          participantIds={participantIds}
          size={32}
          typing={busy}
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span
            className={`min-w-0 flex-1 truncate ${line(namePrimary)} ${unread ? "font-semibold" : ""}`}
            data-emphasis={namePrimary ? "primary" : "secondary"}
            title={name}
          >
            {name}
          </span>
          <span className="shrink-0 whitespace-nowrap text-xs leading-4 text-muted-foreground/70">
            {lastMessageAt}
          </span>
          {unread ? (
            <span className="size-2 shrink-0 rounded-full bg-primary" />
          ) : null}
          {pinned ? (
            <IconPinFilled className="size-3 shrink-0 text-muted-foreground/70" />
          ) : null}
        </div>
        <div
          className={`mt-px truncate ${line(!namePrimary)}`}
          data-emphasis={namePrimary ? "secondary" : "primary"}
          title={title}
        >
          {displayedTitle}
          {revealing ? (
            <span className="ml-0.5 inline-block h-3 w-px translate-y-px bg-foreground/70 align-middle" />
          ) : null}
        </div>
      </div>
    </div>
  );
}
