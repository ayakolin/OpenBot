import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { IconChevronRight } from "@tabler/icons-react";
import { useState } from "react";
import { PageRows } from "@/components/layout/page-shell";
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
  ItemTitle,
} from "@/components/ui/item";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AgentProfile } from "@/lib/agents/queries";
import { agentModelsQueryOptions } from "@/lib/agents/queries";
import { updateAgentMutationOptions } from "@/lib/agents/mutations";
import { profileUpdateInput } from "@/lib/agents/form";
import { t } from "@/lib/i18n";

/**
 * The model this Bot answers on.
 *
 * TWO CONTROLS, ONE VALUE. A list when the deployment can name its models, and a text field for a
 * name that is not on it — which is not a fallback for an error but a real case: a gateway's
 * catalogue lags a release, an operator points a deployment at a model the endpoint advertises but
 * the list does not, and a name pasted from the provider's own console has to be allowed to work.
 *
 * Only for a Bot that runs here. A remote Bot chooses its own model at its own endpoint, so offering
 * a picker would be offering a setting that changes nothing.
 */
export function ModelSection({ agent }: { agent: AgentProfile }) {
  const queryClient = useQueryClient();
  const catalogue = useQuery(agentModelsQueryOptions());
  const update = useMutation(updateAgentMutationOptions(queryClient));
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(agent.model ?? "");

  const builtIn = !agent.endpoint || agent.builtIn;
  if (!builtIn) return null;

  /*
   * A package Bot takes exactly one edit — its model — and `canManage` is false for it because
   * everything else it has belongs to the package. The server allows an administrator to change this
   * one field and stores it in the Bot's `override`, so the screen has to offer it for the same
   * people the server would accept it from: administrators, on a Bot the package owns.
   */
  const editable = agent.canManage || agent.systemOwned;

  const defaultName = catalogue.data?.defaultModel ?? null;
  const options = catalogue.data?.models ?? [];
  const current = agent.model ?? "";
  const shown = current || t("Deployment default");

  const save = async (value: string) => {
    await update.mutateAsync({
      agentId: agent.id,
      input: profileUpdateInput(agent, { model: value }),
    });
    setEditing(false);
  };

  return (
    <PageRows>
      <Item
        render={
          editable ? (
            <button
              onClick={() => {
                setDraft(current);
                setEditing(true);
              }}
              type="button"
            />
          ) : undefined
        }
        size="sm"
      >
        <ItemContent>
          <ItemTitle>{t("Model")}</ItemTitle>
          <ItemDescription>
            {current
              ? current
              : defaultName
                ? t("Deployment default ({model})", { model: defaultName })
                : t("Deployment default")}
          </ItemDescription>
        </ItemContent>
        {editable ? (
          <ItemActions>
            <IconChevronRight className="size-4 text-muted-foreground" />
          </ItemActions>
        ) : null}
      </Item>

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("Model")}</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <PageRows>
              <Item size="sm">
                <ItemContent>
                  <ItemTitle>{t("Choose a model")}</ItemTitle>
                  <ItemDescription>
                    {t(
                      "The model this Bot answers on. Empty uses the deployment's model.",
                    )}
                  </ItemDescription>
                </ItemContent>
                <ItemActions>
                  <Select
                    value={draft || "__default__"}
                    onValueChange={(value) =>
                      setDraft(!value || value === "__default__" ? "" : value)
                    }
                  >
                    <SelectTrigger aria-label={t("Model")}>
                      <SelectValue>{shown}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__default__">
                        {t("Deployment default")}
                      </SelectItem>
                      {options.map((name) => (
                        <SelectItem key={name} value={name}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </ItemActions>
              </Item>
              <Item size="sm">
                <ItemContent>
                  <ItemTitle>{t("Or type a name")}</ItemTitle>
                  <ItemDescription>
                    {t("For a model this list does not carry.")}
                  </ItemDescription>
                </ItemContent>
                <ItemActions>
                  <Input
                    aria-label={t("Model name")}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder={defaultName ?? "gpt-5.6-terra"}
                    value={draft}
                  />
                </ItemActions>
              </Item>
            </PageRows>
          </DialogBody>
          <DialogFooter>
            <Button onClick={() => setEditing(false)} size="sm" variant="ghost">
              {t("Cancel")}
            </Button>
            <Button
              disabled={update.isPending}
              onClick={() => void save(draft)}
              size="sm"
            >
              {update.isPending ? t("Saving…") : t("Save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageRows>
  );
}
