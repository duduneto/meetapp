import type { ComponentProps } from "react";
import { Button as ShadcnButton } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "danger" | "selected";

type ButtonProps = Omit<ComponentProps<typeof ShadcnButton>, "variant"> & {
  variant?: ButtonVariant;
};

const variantMap: Record<ButtonVariant, ComponentProps<typeof ShadcnButton>["variant"]> = {
  primary: "default",
  secondary: "outline",
  danger: "destructive",
  selected: "default",
};

export function Button({ variant = "primary", className, type = "button", ...props }: ButtonProps) {
  return (
    <ShadcnButton
      type={type}
      variant={variantMap[variant]}
      data-state={variant === "selected" ? "active" : undefined}
      className={cn(variant === "selected" && "shadow-sm ring-2 ring-primary/20", className)}
      {...props}
    />
  );
}
