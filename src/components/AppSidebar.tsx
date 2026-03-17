import { LayoutDashboard, Layers, Map, Settings, LogOut, ShieldCheck, Factory, Camera, ClipboardList, FileSignature } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { useContratoAccess } from "@/hooks/useContratos";
import { NavLink } from "@/components/NavLink";
import logoImg from "@/assets/logo-produtiva.jpg";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";

const mainItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Ciclos de Produção", url: "/ciclos", icon: Layers },
  { title: "Mapa Integrado", url: "/mapa", icon: Map },
  { title: "Capacidade UBS", url: "/ubs", icon: Factory },
  { title: "Feed de Campo", url: "/feed", icon: Camera },
  { title: "Plano de Ação", url: "/plano-acao", icon: ClipboardList },
];

const managementItems = [
  { title: "Configurações", url: "/configuracoes", icon: Settings },
];

function MenuGroup({ label, items }: { label: string; items: typeof mainItems }) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel className="text-sidebar-foreground/50 text-xs uppercase tracking-wider font-semibold">
        {label}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild>
                <NavLink
                  to={item.url}
                  end={item.url === "/"}
                  className="flex items-center gap-3 px-3 py-2 rounded-md text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors text-sm"
                  activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span>{item.title}</span>
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function AppSidebar() {
  const { signOut, user } = useAuth();
  const { isAdmin, isClient } = useRole();
  const { canView: canViewContratos } = useContratoAccess();

  // Client users only see Ciclos de Produção
  if (isClient) {
    const clientItems = [{ title: "Ciclos de Produção", url: "/ciclos", icon: Layers }];
    return (
      <Sidebar collapsible="icon">
        <SidebarHeader className="p-4 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <img src={logoImg} alt="Produtiva Sementes" className="w-9 h-9 rounded-lg object-contain" />
            <div className="flex flex-col group-data-[collapsible=icon]:hidden">
              <span className="text-sm font-bold text-sidebar-foreground tracking-tight">Produtiva Sementes</span>
            <span className="text-[10px] text-sidebar-foreground/50 uppercase tracking-widest">Torre de Controle de Produção</span>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent className="px-2 py-3">
          <MenuGroup label="Principal" items={clientItems} />
        </SidebarContent>
        <SidebarFooter className="p-3 border-t border-sidebar-border group-data-[collapsible=icon]:hidden">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-sidebar-foreground/40 truncate">{user?.email}</p>
            <button onClick={signOut} className="text-sidebar-foreground/40 hover:text-sidebar-foreground transition-colors">
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </SidebarFooter>
      </Sidebar>
    );
  }

  const adminItems = isAdmin
    ? [{ title: "Usuários & Roles", url: "/usuarios", icon: ShieldCheck }]
    : [];

  const dynamicMainItems = canViewContratos
    ? [...mainItems, { title: "Contratos", url: "/contratos", icon: FileSignature }]
    : mainItems;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <img src={logoImg} alt="Produtiva Sementes" className="w-9 h-9 rounded-lg object-contain" />
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-bold text-sidebar-foreground tracking-tight">Produtiva Sementes</span>
            <span className="text-[10px] text-sidebar-foreground/50 uppercase tracking-widest">Torre de Controle de Produção</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-3">
        <MenuGroup label="Principal" items={dynamicMainItems} />
        <MenuGroup label="Gestão" items={managementItems} />
        {adminItems.length > 0 && <MenuGroup label="Administração" items={adminItems} />}
      </SidebarContent>

      <SidebarFooter className="p-3 border-t border-sidebar-border group-data-[collapsible=icon]:hidden">
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-sidebar-foreground/40 truncate">{user?.email}</p>
          <button onClick={signOut} className="text-sidebar-foreground/40 hover:text-sidebar-foreground transition-colors">
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
