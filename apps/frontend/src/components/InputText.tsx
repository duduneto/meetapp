import type { ComponentProps } from "react";
import { Input } from "@/components/ui/input";

type InputTextProps = ComponentProps<typeof Input>;

export function InputText({ type = "text", ...props }: InputTextProps) {
  return <Input type={type} {...props} />;
}
