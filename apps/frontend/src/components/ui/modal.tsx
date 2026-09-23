import * as React from "react"
import { Dialog as ModalPrimitive } from "@base-ui/react/dialog"
import { XIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

function Modal({ ...props }: ModalPrimitive.Root.Props) {
  return <ModalPrimitive.Root data-slot="modal" {...props} />
}

function ModalTrigger({ ...props }: ModalPrimitive.Trigger.Props) {
  return <ModalPrimitive.Trigger data-slot="modal-trigger" {...props} />
}

function ModalClose({ ...props }: ModalPrimitive.Close.Props) {
  return <ModalPrimitive.Close data-slot="modal-close" {...props} />
}

function ModalPortal({ ...props }: ModalPrimitive.Portal.Props) {
  return <ModalPrimitive.Portal data-slot="modal-portal" {...props} />
}

function ModalOverlay({ className, ...props }: ModalPrimitive.Backdrop.Props) {
  return (
    <ModalPrimitive.Backdrop
      data-slot="modal-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-black/10 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 supports-backdrop-filter:backdrop-blur-xs",
        className
      )}
      {...props}
    />
  )
}

function ModalContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: ModalPrimitive.Popup.Props & {
  showCloseButton?: boolean
}) {
  return (
    <ModalPortal>
      <ModalOverlay />
      <ModalPrimitive.Popup
        data-slot="modal-content"
        className={cn(
          "fixed top-1/2 left-1/2 z-50 grid w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl border bg-popover p-4 text-sm text-popover-foreground shadow-lg outline-none transition-[opacity,transform] duration-150 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0",
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <ModalPrimitive.Close
            data-slot="modal-close"
            render={
              <Button
                variant="ghost"
                className="absolute top-3 right-3"
                size="icon-sm"
              />
            }
          >
            <XIcon />
            <span className="sr-only">Fechar</span>
          </ModalPrimitive.Close>
        )}
      </ModalPrimitive.Popup>
    </ModalPortal>
  )
}

function ModalHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="modal-header"
      className={cn("flex flex-col gap-1 pr-8", className)}
      {...props}
    />
  )
}

function ModalFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="modal-footer"
      className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)}
      {...props}
    />
  )
}

function ModalTitle({ className, ...props }: ModalPrimitive.Title.Props) {
  return (
    <ModalPrimitive.Title
      data-slot="modal-title"
      className={cn("font-heading text-base font-medium text-foreground", className)}
      {...props}
    />
  )
}

function ModalDescription({
  className,
  ...props
}: ModalPrimitive.Description.Props) {
  return (
    <ModalPrimitive.Description
      data-slot="modal-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Modal,
  ModalTrigger,
  ModalClose,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalTitle,
  ModalDescription,
}
