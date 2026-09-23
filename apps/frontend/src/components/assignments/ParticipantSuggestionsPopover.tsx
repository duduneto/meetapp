import { LoaderCircle, Sparkles } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/api/client";
import type {
  AssignmentSuggestionRole,
  ParticipantSuggestion,
  ParticipantSuggestionsPage,
} from "@/api/types";
import { formatDateRange } from "@/hooks";
import { buttonVariants } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  RadioButtonGroup,
  type RadioButtonOption,
} from "@/components/ui/radio-button-group";

const PAGE_SIZE = 20;
const ROLE_OPTIONS: readonly RadioButtonOption<AssignmentSuggestionRole>[] = [
  { value: "publisher", label: "Publicador" },
  { value: "assistant", label: "Ajudante" },
];

export function ParticipantSuggestionsPopover({
  year,
  week,
  onSelect,
}: {
  year: number;
  week: number;
  onSelect: (role: AssignmentSuggestionRole, participantId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<AssignmentSuggestionRole>("publisher");
  const [suggestions, setSuggestions] = useState<ParticipantSuggestion[]>([]);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
  const requestGeneration = useRef(0);

  const loadPage = useCallback(
    async (offset: number, replace: boolean, generation: number) => {
      if (loadingRef.current) return;

      loadingRef.current = true;
      setLoading(true);
      setError(null);

      try {
        const result = await api<ParticipantSuggestionsPage>(
          `/assignments/${year}/${week}/midweek/participant-suggestions?role=${role}&offset=${offset}&limit=${PAGE_SIZE}`,
        );
        if (generation !== requestGeneration.current) return;

        setSuggestions((current) =>
          replace ? result.suggestions : [...current, ...result.suggestions],
        );
        setNextOffset(result.nextOffset);
        setInitialized(true);
      } catch (reason) {
        if (generation !== requestGeneration.current) return;
        setError(
          reason instanceof Error
            ? reason.message
            : "Não foi possível carregar as sugestões.",
        );
        setInitialized(true);
      } finally {
        if (generation === requestGeneration.current) {
          loadingRef.current = false;
          setLoading(false);
        }
      }
    },
    [role, week, year],
  );

  useEffect(() => {
    const generation = ++requestGeneration.current;
    loadingRef.current = false;
    setSuggestions([]);
    setNextOffset(null);
    setInitialized(false);
    setError(null);

    if (open) void loadPage(0, true, generation);

    return () => {
      if (requestGeneration.current === generation) {
        requestGeneration.current += 1;
        loadingRef.current = false;
      }
    };
  }, [loadPage]);

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen && !initialized && !loadingRef.current) {
      void loadPage(0, true, requestGeneration.current);
    }
  }

  const loadMore = useCallback(() => {
    if (nextOffset === null || loadingRef.current) return;
    void loadPage(nextOffset, false, requestGeneration.current);
  }, [loadPage, nextOffset]);

  useEffect(() => {
    const root = scrollContainerRef.current;
    const sentinel = sentinelRef.current;
    if (!open || !root || !sentinel || nextOffset === null) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) loadMore();
      },
      { root, rootMargin: "120px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore, nextOffset, open, suggestions.length]);

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        className={buttonVariants({ variant: "outline", size: "xs" })}
      >
        <Sparkles />
        Sugestões
      </PopoverTrigger>
      <PopoverContent align="start" side="right" className="w-80 p-0">
        <div className="space-y-1 border-b px-4 py-3">
          <PopoverTitle>Sugestões de participantes</PopoverTitle>
          <PopoverDescription>
            Filtra por preferências de participação. Quem nunca participou
            aparece primeiro, seguido pelas participações mais antigas.
          </PopoverDescription>
          <RadioButtonGroup
            value={role}
            options={ROLE_OPTIONS}
            onValueChange={setRole}
            ariaLabel="Tipo de participação"
            className="mt-3 flex w-full"
          />
        </div>

        <div ref={scrollContainerRef} className="max-h-80 overflow-y-auto">
          {!initialized && (
            <div className="flex items-center gap-2 px-4 py-6 text-sm text-muted-foreground">
              <LoaderCircle className="animate-spin" />
              Carregando sugestões...
            </div>
          )}

          {error && (
            <p className="px-4 py-4 text-sm text-destructive">{error}</p>
          )}

          {initialized && suggestions.length === 0 && !error && (
            <p className="px-4 py-6 text-sm text-muted-foreground">
              Nenhum participante com preferência compatível para esta função.
            </p>
          )}

          <div className="divide-y">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion.participantId}
                type="button"
                className="block w-full space-y-1 px-4 py-3 text-left transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                aria-label={`Selecionar ${suggestion.participantName} como ${
                  role === "publisher" ? "publicador" : "ajudante"
                }`}
                onClick={() => {
                  onSelect(role, suggestion.participantId);
                  setOpen(false);
                }}
              >
                <strong className="block text-sm font-medium">
                  {suggestion.participantName}
                </strong>
                {suggestion.lastAssignment ? (
                  <div className="space-y-0.5 text-xs text-muted-foreground">
                    <span className="block">
                      Última participação: {formatDateRange(
                        suggestion.lastAssignment.startAt,
                        suggestion.lastAssignment.endAt,
                      )}
                    </span>
                    <span className="block text-foreground">
                      {suggestion.lastAssignment.title}
                    </span>
                  </div>
                ) : (
                  <span className="block text-xs text-muted-foreground">
                    Nunca participou como {role === "publisher" ? "publicador" : "ajudante"}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div ref={sentinelRef} className="h-px" aria-hidden="true" />
          {loading && initialized && (
            <div
              className="flex items-center justify-center gap-2 px-4 py-3 text-xs text-muted-foreground"
              aria-live="polite"
            >
              <LoaderCircle className="animate-spin" />
              Carregando mais...
            </div>
          )}
          {initialized && nextOffset === null && suggestions.length > 0 && (
            <p className="px-4 py-3 text-center text-xs text-muted-foreground">
              Todas as sugestões foram carregadas.
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
