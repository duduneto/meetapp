import { Combobox } from "@base-ui/react/combobox";
import { Check, ChevronsUpDown, LoaderCircle } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/api/client";
import type { PublicSpeakTheme } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { useSearchSanitizer } from "@/hooks/useSearchSanitizer";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 10;
const DEBOUNCE_MS = 300;

type ThemeOption = { value: string; label: string };

type PublicSpeakThemeSelectProps = {
  value: string;
  label?: string;
  onValueChange: (themeId: string, theme?: PublicSpeakTheme | null) => void;
  disabled?: boolean;
  className?: string;
};

export function PublicSpeakThemeSelect({
  value,
  label,
  onValueChange,
  disabled,
  className,
}: PublicSpeakThemeSelectProps) {
  const [inputValue, setInputValue] = useState("");
  const [debouncedInput, setDebouncedInput] = useState("");
  const { query } = useSearchSanitizer(debouncedInput);
  const [options, setOptions] = useState<ThemeOption[]>([]);
  const [themesById, setThemesById] = useState<Record<string, PublicSpeakTheme>>({});
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createNumber, setCreateNumber] = useState("");
  const [createTitle, setCreateTitle] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [selectedLabel, setSelectedLabel] = useState(label ?? "");
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
  const generationRef = useRef(0);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedInput(inputValue), DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [inputValue]);

  useEffect(() => {
    if (value && label) {
      setSelectedLabel(label);
      setInputValue(label);
      return;
    }
    if (!value) {
      setSelectedLabel("");
    }
  }, [value, label]);

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
        const result = await api<{ themes: PublicSpeakTheme[]; nextOffset: number | null }>(
          `/public-speak-themes?${params}`,
        );
        if (generation !== generationRef.current) return;

        setThemesById((current) => {
          const next = replace ? {} : { ...current };
          for (const theme of result.themes) next[theme.id] = theme;
          return next;
        });
        setOptions((current) => {
          const mapped = result.themes.map((theme) => ({
            value: theme.id,
            label: theme.fullTitle,
          }));
          return replace ? mapped : [...current, ...mapped];
        });
        setNextOffset(result.nextOffset);
        if (replace && result.themes.length === 0 && debouncedInput.trim()) {
          setQuickAddOpen(false);
          const digits = debouncedInput.trim().match(/^\d+$/);
          setCreateNumber(digits ? String(Number(digits[0])) : "");
          setCreateTitle(digits ? "" : debouncedInput.trim());
        }
      } catch (reason) {
        if (generation !== generationRef.current) return;
        setError(reason instanceof Error ? reason.message : "Erro ao buscar temas.");
      } finally {
        if (generation === generationRef.current) {
          loadingRef.current = false;
          setLoading(false);
        }
      }
    },
    [debouncedInput, query],
  );

  useEffect(() => {
    const generation = ++generationRef.current;
    loadingRef.current = false;
    setOptions([]);
    setNextOffset(null);
    void loadPage(0, true, generation);
  }, [loadPage]);

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

  async function handleCreate() {
    const number = Number(createNumber);
    const title = createTitle.trim();
    if (!Number.isInteger(number) || number < 1) {
      setCreateError("Informe o número do tema.");
      return;
    }
    if (!title) {
      setCreateError("Informe o título do tema.");
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      const result = await api<{ theme: PublicSpeakTheme }>("/public-speak-themes", {
        method: "POST",
        body: JSON.stringify({ number, title }),
      });
      const created: ThemeOption = {
        value: result.theme.id,
        label: result.theme.fullTitle,
      };
      setThemesById((current) => ({ ...current, [result.theme.id]: result.theme }));
      setOptions((current) => [created, ...current.filter((option) => option.value !== created.value)]);
      setSelectedLabel(created.label);
      setInputValue(created.label);
      setDebouncedInput(created.label);
      onValueChange(result.theme.id, result.theme);
      setQuickAddOpen(false);
      setCreateNumber("");
      setCreateTitle("");
    } catch (reason) {
      setCreateError(reason instanceof Error ? reason.message : "Não foi possível cadastrar o tema.");
    } finally {
      setCreating(false);
    }
  }

  const selectedOption =
    options.find((option) => option.value === value) ??
    (value && selectedLabel ? { value, label: selectedLabel } : null);
  const comboboxItems =
    selectedOption && !options.some((option) => option.value === selectedOption.value)
      ? [selectedOption, ...options]
      : options;
  const showEmptyQuickAdd = !loading && !error && options.length === 0 && Boolean(debouncedInput.trim());

  return (
    <div className={cn("space-y-2 min-w-0", className)}>
      <label className="block space-y-1 text-sm">
        <span>Tema do discurso</span>
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
              onValueChange("", null);
              setSelectedLabel("");
              setInputValue("");
              return;
            }
            setSelectedLabel(option.label);
            setInputValue(option.label);
            onValueChange(option.value, themesById[option.value] ?? null);
          }}
        >
          <Combobox.InputGroup className="relative flex h-8 w-full items-center rounded-lg border border-input bg-transparent shadow-xs focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
            <Combobox.Input
              placeholder="Buscar tema..."
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
                      Nenhum tema encontrado. Deseja cadastrar este tema?
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
                      {(option: ThemeOption) => (
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
        <CollapsibleContent className="space-y-2 rounded-lg border p-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="block space-y-1 text-sm">
              <span>Número</span>
              <Input
                value={createNumber}
                inputMode="numeric"
                onChange={(event) => setCreateNumber(event.target.value)}
              />
            </label>
            <label className="block space-y-1 text-sm sm:col-span-1">
              <span>Título</span>
              <Input value={createTitle} onChange={(event) => setCreateTitle(event.target.value)} />
            </label>
          </div>
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
