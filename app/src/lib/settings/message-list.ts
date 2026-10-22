import {
  mutationOptions,
  type QueryClient,
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { currentUserQueryOptions } from "@/lib/auth/queries";
import { client } from "@/lib/client";
import type { UserPreferences } from "@openbot/shared/user-preferences";
import { settingsKeys } from "./queries";

export type { MessageListEmphasis } from "@openbot/shared/user-preferences";

export function userPreferencesQueryOptions(userId: string | undefined) {
  return queryOptions({
    queryKey: [...settingsKeys.all, "preferences", userId] as const,
    enabled: Boolean(userId),
    queryFn: ({ signal }): Promise<UserPreferences> =>
      client("/api/settings/preferences", "preferences", {
        signal,
        fallback: "Could not load your preferences",
      }),
  });
}

export function useUserPreferences() {
  const { data: user } = useQuery(currentUserQueryOptions());
  return {
    userId: user?.id,
    ...useQuery(userPreferencesQueryOptions(user?.id)),
  };
}

/**
 * Point at the preferences save, for the language switch.
 *
 * The switch lives in the provider and the mutation needs the query client, so the provider is handed
 * a function rather than a client. Absent user id means the save refuses, which is what every other
 * write here does when signed out.
 */
export function useSaveUserPreferences() {
  const queryClient = useQueryClient();
  const { userId } = useUserPreferences();
  return useMutation(saveUserPreferencesMutationOptions(queryClient, userId));
}

export function useMessageListEmphasis() {
  return useUserPreferences().data?.messageListEmphasis ?? "thread";
}

/**
 * Close the self-host banner for this person, on every device they sign in from.
 *
 * Patched in onMutate so the bar is gone the moment the button is pressed, and put back if the save
 * fails, because a banner that vanished and then reappeared on the next load would read as ignoring
 * the click. The reply seeds the cache with what the server stored.
 */
export function dismissSelfHostBannerMutationOptions(
  queryClient: QueryClient,
  userId: string | undefined,
) {
  const queryKey = userPreferencesQueryOptions(userId).queryKey;
  return mutationOptions({
    mutationFn: (): Promise<UserPreferences> => {
      if (!userId) throw new Error("Sign in to save your preferences.");
      return client("/api/settings/preferences", "preferences", {
        method: "PATCH",
        body: { selfHostBannerDismissed: true },
        fallback: "Could not save your preferences",
      });
    },
    onMutate: () => {
      const previous = queryClient.getQueryData(queryKey);
      if (previous) {
        queryClient.setQueryData(queryKey, {
          ...previous,
          selfHostBannerDismissed: true,
        });
      }
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous)
        queryClient.setQueryData(queryKey, context.previous);
    },
    onSuccess: (preferences) => queryClient.setQueryData(queryKey, preferences),
  });
}

export function saveUserPreferencesMutationOptions(
  queryClient: QueryClient,
  userId: string | undefined,
) {
  return mutationOptions({
    mutationFn: (
      preferences: Partial<UserPreferences>,
    ): Promise<UserPreferences> => {
      if (!userId) throw new Error("Sign in to save your preferences.");
      return client("/api/settings/preferences", "preferences", {
        method: "PATCH",
        body: preferences,
        fallback: "Could not save your preferences",
      });
    },
    onSuccess: (preferences) =>
      queryClient.setQueryData(
        userPreferencesQueryOptions(userId).queryKey,
        preferences,
      ),
  });
}
