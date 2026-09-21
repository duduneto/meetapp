import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type RadioButtonOption<T extends string> = {
  value: T;
  label: string;
};

export function RadioButtonGroup<T extends string>({
  value,
  options,
  onValueChange,
  ariaLabel,
  className,
}: {
  value: T;
  options: readonly RadioButtonOption<T>[];
  onValueChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex items-center gap-1 rounded-lg border bg-muted p-1",
        className,
      )}
    >
      {options.map((option) => {
        const selected = option.value === value;

        return (
          <Button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            variant={selected ? "default" : "ghost"}
            size="sm"
            className="min-w-24"
            onClick={() => onValueChange(option.value)}
          >
            {option.label}
          </Button>
        );
      })}
    </div>
  );
}
