import type { ComponentProps, OptionHTMLAttributes } from "react";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { cn } from "@/lib/utils";

export type SelectOption = {
  value: string;
  label: string;
} & Omit<OptionHTMLAttributes<HTMLOptionElement>, "value" | "label">;

type SelectProps = ComponentProps<typeof NativeSelect> & {
  options: SelectOption[];
  placeholder?: string;
};

export function Select({ options, placeholder, children, className, ...props }: SelectProps) {
  return (
    <NativeSelect className={cn("w-full max-w-60", className)} {...props}>
      {placeholder !== undefined && <NativeSelectOption value="">{placeholder}</NativeSelectOption>}
      {options.map(({ value, label, ...optionProps }) => (
        <NativeSelectOption key={value} value={value} {...optionProps}>
          {label}
        </NativeSelectOption>
      ))}
      {children}
    </NativeSelect>
  );
}
