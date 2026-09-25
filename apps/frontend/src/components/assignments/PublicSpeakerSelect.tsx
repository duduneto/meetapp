import { Combobox } from "@base-ui/react/combobox";
import { Check, ChevronsUpDown, LoaderCircle } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/api/client";
import type { Participant, PublicSpeaker } from "@/api/types";
import { CongregationSelect } from "@/components/assignments/CongregationSelect";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { useSearchSanitizer } from "@/hooks/useSearchSanitizer";
import { formatBrPhoneMask, normalizeBrPhone11 } from "@/lib/phoneBr";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 10;
const DEBOUNCE_MS = 300;
const MALE_GENDERS = new Set(["Masculino", "M", "masculino", "m", "male"]);

export type PublicTalkSpeakerValue = {
  participantId: string | null;
  publicSpeakerId: string | null;
  congregationName: string;
};

type SpeakerOption = {
  value: string;
  label: string;
  kind: "participant" | "publicSpeaker";
  congregationName: string;
};

type PublicSpeakerSelectProps = {
  participants: Participant[];
  value: PublicTalkSpeakerValue;
  speakerLabel?: string;
  onValueChange: (value: PublicTalkSpeakerValue) => void;
  disabled?: boolean;
  className?: string;
};

function isMale(participant: Participant) {
  return Boolean(participant.gender && MALE_GENDERS.has(participant.gender));
}

export function PublicSpeakerSelect({
  participants,
  value,
  speakerLabel,
  onValueChange,
  disabled,
  className,
}: PublicSpeakerSelectProps) {
  const [inputValue, setInputValue] = useState("");
  const [debouncedInput, setDebouncedInput] = useState("");
  const { query } = useSearchSanitizer(debouncedInput);
  const [visitorOptions, setVisitorOptions] = useState<SpeakerOption[]>([]);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createCongregationId, setCreateCongregationId] = useState("");
  const [createCongregationLabel, setCreateCongregationLabel] = useState("");
  const [createPhone, setCreatePhone] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [selectedLabel, setSelectedLabel] = useState(speakerLabel ?? "");
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
  const generationRef = useRef(0);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedInput(inputValue), DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [inputValue]);

  useEffect(() => {
    if ((value.participantId || value.publicSpeakerId) && speakerLabel) {
      setSelectedLabel(speakerLabel);
      setInputValue(speakerLabel);
      return;
    }
    if (!value.participantId && !value.publicSpeakerId) {
      setSelectedLabel("");
    }
  }, [value.participantId, value.publicSpeakerId, speakerLabel]);

  const localOptions = useMemo(() => {
    const needle = query;
    return participants
      .filter((participant) => !participant.deletedAt && isMale(participant))
      .filter((participant) => {
        if (!needle) return true;
        const name = participant.name
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/gu, "")
          .toLowerCase();
        return name.includes(needle);
      })
      .map(
        (participant): SpeakerOption => ({
          value: `participant:${participant.id}`,
          label: `${participant.name} (local)`,
          kind: "participant",
          congregationName: participant.congregation?.name ?? "",
        }),
      );
  }, [participants, query]);

  const loadPage = useCallback(
    async (offset: number, replace: boolean, generation: number) => {
      if (loadingRef.current) return;
      loadingRef.current = true;
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          offset: String(offset),
          limit: String(PAGE_SIZE),
        });
        if (query) params.set("q", query);
        const result = await api<{ speakers: PublicSpeaker[]; nextOffset: number | null }>(
          `/public-speakers?${params}`,
        );
        if (generation !== generationRef.current) return;

        const mapped = result.speakers.map(
          (speaker): SpeakerOption => ({
            value: `publicSpeaker:${speaker.id}`,
            label: `${speaker.name} (visitante)`,
            kind: "publicSpeaker",
            congregationName: speaker.congregation?.name ?? "",
          }),
        );
        setVisitorOptions((current) => (replace ? mapped : [...current, ...mapped]));
        setNextOffset(result.nextOffset);
        if (replace && result.speakers.length === 0 && localOptions.length === 0 && debouncedInput.trim()) {
          setQuickAddOpen(false);
          setCreateName(debouncedInput.trim());
        }
      } catch (reason) {
        if (generation !== generationRef.current) return;
        setError(reason instanceof Error ? reason.message : "Erro ao buscar oradores.");
      } finally {
        if (generation === generationRef.current) {
          loadingRef.current = false;
          setLoading(false);
        }
      }
    },
    [debouncedInput, localOptions.length, query],
  );

  useEffect(() => {
    const generation = ++generationRef.current;
    loadingRef.current = false;
    setVisitorOptions([]);
    setNextOffset(null);
    void loadPage(0, true, generation);
  }, [loadPage]);

  const options = useMemo(() => [...localOptions, ...visitorOptions], [localOptions, visitorOptions]);

  useEffect(() => {
    const root = scrollRef.current;
    const sentinel = sentinelRef.current;
    if (!root || !sentinel || nextOffset === null) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting) && !loadingRef.current && nextOffset !== null) {
          void loadPage(nextOffset, false, generationRef.current);
        }
      },
      { root, rootMargin: "40px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadPage, nextOffset, options.length]);

  const selectedValue = value.participantId
    ? `participant:${value.participantId}`
    : value.publicSpeakerId
      ? `publicSpeaker:${value.publicSpeakerId}`
      : "";

  const selectedOption =
    options.find((option) => option.value === selectedValue) ??
    (selectedValue && selectedLabel
      ? {
          value: selectedValue,
          label: selectedLabel,
          kind: value.participantId ? ("participant" as const) : ("publicSpeaker" as const),
          congregationName: value.congregationName,
        }
      : null);
  const comboboxItems =
    selectedOption && !options.some((option) => option.value === selectedOption.value)
      ? [selectedOption, ...options]
      : options;

  const showEmptyQuickAdd =
    !loading && !error && options.length === 0 && Boolean(debouncedInput.trim());

  async function handleCreate() {
    const name = createName.trim();
    const phone = normalizeBrPhone11(createPhone);
    if (!name) {
      setCreateError("Informe o nome do orador.");
      return;
    }
    if (!createCongregationId) {
      setCreateError("Selecione ou cadastre a congregação.");
      return;
    }
    if (!phone) {
      setCreateError("Telefone inválido. Use o formato (XX) 9XXXX-XXXX.");
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      const result = await api<{ speaker: PublicSpeaker }>("/public-speakers", {
        method: "POST",
        body: JSON.stringify({
          name,
          congregationId: createCongregationId,
          phone,
        }),
      });
      const congregationName = result.speaker.congregation?.name ?? createCongregationLabel;
      const created: SpeakerOption = {
        value: `publicSpeaker:${result.speaker.id}`,
        label: `${result.speaker.name} (visitante)`,
        kind: "publicSpeaker",
        congregationName,
      };
      setVisitorOptions((current) => [
        created,
        ...current.filter((option) => option.value !== created.value),
      ]);
      setSelectedLabel(result.speaker.name);
      setInputValue(created.label);
      setDebouncedInput(created.label);
      onValueChange({
        participantId: null,
        publicSpeakerId: result.speaker.id,
        congregationName,
      });
      setQuickAddOpen(false);
      setCreateName("");
      setCreateCongregationId("");
      setCreateCongregationLabel("");
      setCreatePhone("");
    } catch (reason) {
      setCreateError(reason instanceof Error ? reason.message : "Não foi possível cadastrar o orador.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className={cn("space-y-2 min-w-0", className)}>
      <label className="block space-y-1 text-sm">
        <span>Nome do orador</span>
        <Combobox.Root
          items={comboboxItems}
          value={selectedOption}
          disabled={disabled}
          autoHighlight
          filter={null}
          inputValue={inputValue}
          onInputValueChange={(next) => setInputValue(next)}
          isItemEqualToValue={(option, selected) => option.value === selected.value}
          onValueChange={(option) => {
            if (!option) {
              setSelectedLabel("");
              setInputValue("");
              onValueChange({ participantId: null, publicSpeakerId: null, congregationName: "" });
              return;
            }
            setSelectedLabel(option.label);
            setInputValue(option.label);
            if (option.kind === "participant") {
              onValueChange({
                participantId: option.value.replace("participant:", ""),
                publicSpeakerId: null,
                congregationName: option.congregationName,
              });
            } else {
              onValueChange({
                participantId: null,
                publicSpeakerId: option.value.replace("publicSpeaker:", ""),
                congregationName: option.congregationName,
              });
            }
          }}
        >
          <Combobox.InputGroup className="relative flex h-8 w-full items-center rounded-lg border border-input bg-transparent shadow-xs focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
            <Combobox.Input
              placeholder="Buscar orador..."
              className="h-full min-w-0 flex-1 bg-transparent px-2.5 text-sm outline-none placeholder:text-muted-foreground"
            />
            <Combobox.Trigger
              className="flex h-full w-8 shrink-0 items-center justify-center text-muted-foreground"
              aria-label="Abrir opções"
            >
              {loading ? <LoaderCircle className="size-4 animate-spin" /> : <ChevronsUpDown className="size-4" />}
            </Combobox.Trigger>
          </Combobox.InputGroup>

          <Combobox.Portal>
            <Combobox.Positioner className="z-50 outline-none" sideOffset={4} align="start">
              <Combobox.Popup className="w-[var(--anchor-width)] max-w-[var(--available-width)] origin-[var(--transform-origin)] rounded-lg border bg-popover text-popover-foreground shadow-md outline-none">
                {error && <div className="px-3 py-2 text-sm text-destructive">{error}</div>}
                {showEmptyQuickAdd ? (
                  <div className="space-y-2 px-3 py-3 text-sm">
                    <p className="text-muted-foreground">
                      Nenhum orador encontrado. Deseja cadastrar este orador visitante?
                    </p>
                    {!quickAddOpen ? (
                      <Button type="button" size="sm" onClick={() => setQuickAddOpen(true)}>
                        Cadastrar
                      </Button>
                    ) : null}
                  </div>
                ) : (
                  <div
                    ref={scrollRef}
                    className="max-h-[min(18rem,var(--available-height))] overflow-y-auto overscroll-contain p-1"
                  >
                    <Combobox.List className="outline-none">
                      {(option: SpeakerOption) => (
                        <Combobox.Item
                          key={option.value}
                          value={option}
                          className="grid cursor-default grid-cols-[1rem_1fr] items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none data-highlighted:bg-accent"
                        >
                          <Combobox.ItemIndicator className="col-start-1">
                            <Check className="size-4" />
                          </Combobox.ItemIndicator>
                          <span className="col-start-2 truncate">{option.label}</span>
                        </Combobox.Item>
                      )}
                    </Combobox.List>
                    <div ref={sentinelRef} className="h-1" />
                  </div>
                )}
              </Combobox.Popup>
            </Combobox.Positioner>
          </Combobox.Portal>
        </Combobox.Root>
      </label>

      <Collapsible open={quickAddOpen} onOpenChange={setQuickAddOpen}>
        <CollapsibleContent className="space-y-3 rounded-lg border p-3">
          <label className="block space-y-1 text-sm">
            <span>Nome</span>
            <Input value={createName} onChange={(event) => setCreateName(event.target.value)} />
          </label>
          <label className="block space-y-1 text-sm">
            <span>Congregação</span>
            <CongregationSelect
              value={createCongregationId}
              label={createCongregationLabel}
              onValueChange={(id, congregation) => {
                setCreateCongregationId(id);
                setCreateCongregationLabel(congregation?.name ?? "");
              }}
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span>Telefone</span>
            <Input
              value={createPhone}
              placeholder="(85) 98888-7777"
              onChange={(event) => setCreatePhone(formatBrPhoneMask(event.target.value))}
            />
          </label>
          {createError && <p className="text-sm text-destructive">{createError}</p>}
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setQuickAddOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" size="sm" disabled={creating} onClick={() => void handleCreate()}>
              {creating ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
