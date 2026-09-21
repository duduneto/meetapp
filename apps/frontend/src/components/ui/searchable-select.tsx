import { Combobox } from "@base-ui/react/combobox";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type SearchableSelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type SearchableSelectProps = {
  options: SearchableSelectOption[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  className?: string;
};

export function SearchableSelect({
  options,
  value,
  onValueChange,
  placeholder = "Buscar...",
  emptyMessage = "Nenhuma opção encontrada.",
  disabled,
  className,
}: SearchableSelectProps) {
  const selectedOption = options.find((option) => option.value === value) ?? null;

  return (
    <Combobox.Root
      items={options}
      value={selectedOption}
      disabled={disabled}
      autoHighlight
      isItemEqualToValue={(option, selected) => option.value === selected.value}
      onValueChange={(option) => onValueChange(option?.value ?? "")}
    >
      <Combobox.InputGroup
        className={cn(
          "relative flex h-8 w-full items-center rounded-lg border border-input bg-transparent shadow-xs transition-[color,box-shadow] focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 has-[[data-disabled]]:cursor-not-allowed has-[[data-disabled]]:opacity-50 dark:bg-input/30",
          className,
        )}
      >
        <Combobox.Input
          placeholder={placeholder}
          className="h-full min-w-0 flex-1 bg-transparent px-2.5 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
          onFocus={(event) => {
            if (event.currentTarget.value === selectedOption?.label) {
              event.currentTarget.select();
            }
          }}
          onPointerUp={(event) => {
            if (event.currentTarget.value === selectedOption?.label) {
              event.preventDefault();
              event.currentTarget.select();
            }
          }}
        />
        <Combobox.Trigger
          className="flex h-full w-8 shrink-0 items-center justify-center text-muted-foreground outline-none"
          aria-label="Abrir opções"
        >
          <ChevronsUpDown className="size-4" />
        </Combobox.Trigger>
      </Combobox.InputGroup>

      <Combobox.Portal>
        <Combobox.Positioner className="z-50 outline-none" sideOffset={4} align="start">
          <Combobox.Popup className="w-[var(--anchor-width)] max-w-[var(--available-width)] origin-[var(--transform-origin)] rounded-lg border bg-popover text-popover-foreground shadow-md outline-none transition-[transform,scale,opacity] duration-150 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
            <Combobox.Empty className="px-3 py-4 text-center text-sm text-muted-foreground">
              {emptyMessage}
            </Combobox.Empty>
            <Combobox.List className="max-h-[min(18rem,var(--available-height))] overflow-y-auto overscroll-contain p-1 outline-none data-empty:p-0">
              {(option: SearchableSelectOption) => (
                <Combobox.Item
                  key={option.value}
                  value={option}
                  disabled={option.disabled}
                  className="grid cursor-default grid-cols-[1rem_1fr] items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none select-none data-disabled:pointer-events-none data-disabled:opacity-50 data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                >
                  <Combobox.ItemIndicator className="col-start-1">
                    <Check className="size-4" />
                  </Combobox.ItemIndicator>
                  <span className="col-start-2 truncate">{option.label}</span>
                </Combobox.Item>
              )}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}
