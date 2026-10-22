import type { LocalePreference } from "./locale";

export type MessageListEmphasis = "agent" | "thread";

export type UserPreferences = {
  messageListEmphasis: MessageListEmphasis;
  /** Whether this person closed the banner offering help self-hosting OpenBot. */
  selfHostBannerDismissed: boolean;
  /**
   * The interface language, or `system` to follow this browser.
   *
   * Stored per person rather than per device, because it is a preference about reading and not about
   * the machine: the same person on a phone in the same language expects the same interface.
   *
   * Optional because rows written before this existed have no opinion, and "no opinion" is exactly
   * `system`. Absent and `system` therefore mean the same thing and neither needs a migration.
   */
  locale?: LocalePreference;
};

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  messageListEmphasis: "thread",
  selfHostBannerDismissed: false,
  locale: "system",
};
