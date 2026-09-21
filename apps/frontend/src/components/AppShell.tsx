import { BarChart3, CalendarDays, LogOut, Settings, Users, UserRoundCog } from "lucide-react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useSession } from "@/hooks";
import { useAdminAuth } from "@/auth/AuthContext";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar";

const links = [
  { to: "/app/assignments", label: "Designacoes", icon: CalendarDays },
  { to: "/app/participants", label: "Participantes", icon: Users },
  { to: "/app/bi", label: "BI", icon: BarChart3 },
  { to: "/app/users", label: "Usuarios", icon: UserRoundCog },
  { to: "/app/settings", label: "Settings", icon: Settings }
];

export function AppShell() {
  const { session } = useSession();
  const { firebaseUser, logout } = useAdminAuth();
  const location = useLocation();
  const currentPage = links.find((link) => location.pathname.startsWith(link.to))?.label ?? "Varjotapp";

  return (
    <SidebarProvider>
      <Sidebar variant="inset" collapsible="icon" className="no-print">
        <SidebarHeader className="p-3">
          <div className="flex items-center gap-3 overflow-hidden px-1 py-2">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary font-heading font-semibold text-sidebar-primary-foreground">
              V
            </div>
            <div className="min-w-0 group-data-[collapsible=icon]:hidden">
              <strong className="block truncate font-heading text-base">Varjotapp</strong>
              <span className="block truncate text-xs text-sidebar-foreground/65">Designacoes congregacionais</span>
            </div>
          </div>
        </SidebarHeader>
        <SidebarSeparator />
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {links.map((link) => {
                  const Icon = link.icon;
                  const isActive = location.pathname.startsWith(link.to);
                  return (
                    <SidebarMenuItem key={link.to}>
                      <SidebarMenuButton
                        render={<NavLink to={link.to} />}
                        isActive={isActive}
                        tooltip={link.label}
                      >
                        <Icon />
                        <span>{link.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarSeparator />
        <SidebarFooter className="p-3">
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1 px-1 group-data-[collapsible=icon]:hidden">
              <span className="block truncate text-xs text-sidebar-foreground/60">Conectado como</span>
              <strong className="block truncate text-sm">{session?.user.name ?? "Carregando..."}</strong>
              <span className="block truncate text-xs text-sidebar-foreground/60">
                {firebaseUser?.email ?? session?.user.email}
              </span>
            </div>
            <SidebarMenuButton
              className="size-8 shrink-0"
              tooltip="Sair"
              aria-label="Sair"
              onClick={() => void logout()}
            >
              <LogOut />
            </SidebarMenuButton>
          </div>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <SidebarInset>
        <header className="no-print flex h-14 shrink-0 items-center gap-3 border-b border-sidebar-border bg-background/90 px-4">
          <SidebarTrigger />
          <div className="h-4 w-px bg-border" />
          <span className="font-heading text-sm font-medium">{currentPage}</span>
        </header>
        <main className="min-h-0 flex-1 p-4 md:p-6 lg:p-8">
          <div className="h-full w-full">
            <Outlet />
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
