import {
  IconChevronRight,
  IconEye,
  IconId,
  IconPlugConnected,
  IconShieldCheck,
  IconTag,
  IconTextCaption,
} from "@tabler/icons-react";
import { useMutation } from "@tanstack/react-query";
import { Fragment, useState } from "react";
import type { ZodType } from "zod";
import { CallbackTokenPanel } from "@/components/agents/callback-token-panel";
import { ModelSection } from "./model-section";
import { PageRows, PageSection } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  type AgentFormValues,
  agentFormSchema,
  profileUpdateInput,
} from "@/lib/agents/form";
import { updateAgentMutationOptions } from "@/lib/agents/mutations";
import type { AgentProfile } from "@/lib/agents/queries";
import { isComposing } from "@/lib/composing";
import { queryClient } from "@/query-client";
import { t } from "@/lib/i18n";

type TextField = "name" | "title" | "roleDescription";

const TEXT_FIELDS: {
  field: TextField;
  label: string;
  icon: typeof IconId;
  multiline?: boolean;
}[] = [
  { field: "name", label: "Name", icon: IconId },
  { field: "title", label: "Title", icon: IconTag },
  {
    field: "roleDescription",
    // Not "Role": beside "Title" it read as a second job title, when it is the standing
    // instruction the Bot carries into every channel. The create dialog says the same.
    label: "What it does",
    icon: IconTextCaption,
    multiline: true,
  },
];

/** Who a Bot is and where it runs. Editable by whoever may manage it; read-only for everyone else. */
export function SetupSections({ agent }: { agent: AgentProfile }) {
  const update = useMutation(updateAgentMutationOptions(queryClient));
  const [editing, setEditing] = useState<TextField | null>(null);
  const save = (patch: Partial<AgentFormValues>) =>
    update.mutateAsync({
      agentId: agent.id,
      input: profileUpdateInput(agent, patch),
    });
  const open = TEXT_FIELDS.find((entry) => entry.field === editing);

  return (
    <>
      <PageSection title={t("Identity")}>
        <PageRows>
          {TEXT_FIELDS.map(({ field, label, icon: Icon }, index) => (
            <Fragment key={field}>
              {index > 0 ? <Separator /> : null}
              <Item
                render={
                  agent.canManage ? (
                    <button onClick={() => setEditing(field)} type="button" />
                  ) : undefined
                }
                size="sm"
              >
                <ItemMedia variant="icon">
                  <Icon />
                </ItemMedia>
                <ItemContent>
                  <ItemTitle>{t(label)}</ItemTitle>
                  <ItemDescription>{t(agent[field])}</ItemDescription>
                </ItemContent>
                {agent.canManage ? (
                  <ItemActions>
                    <IconChevronRight className="size-4 text-muted-foreground" />
                  </ItemActions>
                ) : null}
              </Item>
            </Fragment>
          ))}
          <Separator />
          <VisibilityRow
            agent={agent}
            onSave={(visibility) => save({ visibility })}
          />
          {agent.systemOwned ? (
            <>
              <Separator />
              <Item size="sm">
                <ItemMedia variant="icon">
                  <IconShieldCheck />
                </ItemMedia>
                <ItemContent>
                  <ItemTitle>{t("System owned")}</ItemTitle>
                  <ItemDescription>
                    {t(
                      "Ships with this deployment rather than belonging to a person.",
                    )}
                  </ItemDescription>
                </ItemContent>
              </Item>
            </>
          ) : null}
        </PageRows>
      </PageSection>
      <ConnectionSection agent={agent} />
      {/*
       * Only for a Bot that runs here; `ModelSection` renders nothing for a remote one, because a
       * model it was given would be a setting that changes nothing.
       */}
      <PageSection
        description={t(
          "The model this Bot answers on, when this deployment offers a choice.",
        )}
        title={t("Model")}
      >
        <ModelSection agent={agent} />
      </PageSection>
      {open ? (
        <EditTextDialog
          label={open.label}
          multiline={open.multiline ?? false}
          onClose={() => setEditing(null)}
          onSave={(value) => save({ [open.field]: value })}
          schema={agentFormSchema.shape[open.field]}
          value={agent[open.field]}
        />
      ) : null}
    </>
  );
}

/** Two named choices that write on pick: no draft worth holding, so no dialog. */
function VisibilityRow({
  agent,
  onSave,
}: {
  agent: AgentProfile;
  onSave: (visibility: AgentProfile["visibility"]) => Promise<unknown>;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <Item size="sm">
      <ItemMedia variant="icon">
        <IconEye />
      </ItemMedia>
      <ItemContent>
        <ItemTitle>{t("Visibility")}</ItemTitle>
        <ItemDescription>
          {error ??
            (agent.visibility === "private"
              ? t("Only you can see it and start conversations with it.")
              : t("Everyone in the deployment can find and use it."))}
        </ItemDescription>
      </ItemContent>
      <ItemActions>
        {agent.canManage ? (
          <Select
            disabled={saving}
            // The label map, so the closed trigger says "Private" rather than the raw value.
            items={{ private: t("Private"), public: t("Public") }}
            onValueChange={async (next) => {
              if (next === agent.visibility) return;
              setError(null);
              setSaving(true);
              try {
                await onSave(next as AgentProfile["visibility"]);
              } catch (failure) {
                setError(
                  failure instanceof Error
                    ? failure.message
                    : t("Could not save."),
                );
              } finally {
                setSaving(false);
              }
            }}
            value={agent.visibility}
          >
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="private">{t("Private")}</SelectItem>
              <SelectItem value="public">{t("Public")}</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <span className="text-muted-foreground text-sm">
            {agent.visibility === "private" ? t("Private") : t("Public")}
          </span>
        )}
      </ItemActions>
    </Item>
  );
}

/**
 * One text field in a dialog, validated against the same limits the server enforces. Enter saves a
 * single-line field — but not the Enter that confirms a composed character, which would save the
 * value before the person finished typing it.
 */
function EditTextDialog({
  label,
  value,
  multiline,
  schema,
  onSave,
  onClose,
}: {
  label: string;
  value: string;
  multiline: boolean;
  schema: ZodType<string>;
  onSave: (value: string) => Promise<unknown>;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async () => {
    const parsed = schema.safeParse(draft);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "That value does not fit.");
      return;
    }
    setSaving(true);
    try {
      await onSave(parsed.data);
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  };
  return (
    <Dialog onOpenChange={(next) => !next && onClose()} open>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t(label)}</DialogTitle>
        </DialogHeader>
        <DialogBody className="mt-4 grid gap-2">
          {multiline ? (
            <Textarea
              aria-label={t(label)}
              autoFocus
              onChange={(event) => setDraft(event.target.value)}
              rows={5}
              value={draft}
            />
          ) : (
            <Input
              aria-label={t(label)}
              autoFocus
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !isComposing(event)) {
                  event.preventDefault();
                  void submit();
                }
              }}
              value={draft}
            />
          )}
          {error ? (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          ) : null}
        </DialogBody>
        <DialogFooter className="mt-4">
          <Button
            disabled={saving}
            onClick={onClose}
            size="sm"
            variant="outline"
          >
            {t("Cancel")}
          </Button>
          <Button disabled={saving} onClick={() => void submit()} size="sm">
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Where it runs. A built-in Bot runs on the deployment's own Bot, whose process already holds the
 * deployment's tool credential, so there is nothing to show but that sentence.
 */
function ConnectionSection({ agent }: { agent: AgentProfile }) {
  const builtIn = !agent.endpoint || agent.builtIn;
  return (
    <PageSection title={t("Connection")}>
      <PageRows>
        <Item size="sm">
          <ItemMedia variant="icon">
            <IconPlugConnected />
          </ItemMedia>
          <ItemContent>
            <ItemTitle>{builtIn ? t("Built in") : t("Endpoint")}</ItemTitle>
            <ItemDescription
              className={
                builtIn ? undefined : "line-clamp-none break-all font-mono"
              }
            >
              {builtIn
                ? t(
                    "Runs on this deployment's own Bot. Nothing to connect and nothing to authenticate.",
                  )
                : agent.endpoint}
            </ItemDescription>
          </ItemContent>
        </Item>
      </PageRows>
      {!builtIn && agent.canManage ? (
        <CallbackTokenPanel
          agentId={agent.id}
          hasToken={agent.hasCallbackToken}
        />
      ) : null}
    </PageSection>
  );
}
