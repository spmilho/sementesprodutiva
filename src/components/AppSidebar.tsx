import { Leaf, LayoutDashboard, Layers, CalendarDays, Sprout, TrendingUp, BarChart3, Zap, Scissors, Search, FlaskConical, Bug, Droplets, Thermometer, Wheat, Map, ClipboardCheck, FileText, Settings } from "lucide-react";
import { NavLink } from "@/components/NavLink";
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
  { title: "Planejamento", url: "/planejamento", icon: CalendarDays },
];

const executionItems = [
  { title: "Plantio", url: "/plantio", icon: Sprout },
  { title: "Fenologia", url: "/fenologia", icon: TrendingUp },
  { title: "Emergência / Stand", url: "/emergencia", icon: BarChart3 },
  { title: "Nicking", url: "/nicking", icon: Zap },
  { title: "Despendoamento", url: "/despendoamento", icon: Scissors },
  { title: "Roguing", url: "/roguing", icon: Search },
  { title: "Manejo Químico", url: "/manejo-quimico", icon: FlaskConical },
  { title: "Pragas e Doenças", url: "/pragas", icon: Bug },
];

const monitoringItems = [
  { title: "Água", url: "/agua", icon: Droplets },
  { title: "Umidade", url: "/umidade", icon: Thermometer },
  { title: "Colheita", url: "/colheita", icon: Wheat },
  { title: "Mapa", url: "/mapa", icon: Map },
];

const managementItems = [
  { title: "Visitas de Campo", url: "/visitas", icon: ClipboardCheck },
  { title: "Relatórios", url: "/relatorios", icon: FileText },
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
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-sidebar-primary">
            <Leaf className="h-5 w-5 text-sidebar-primary-foreground" />
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-bold text-sidebar-foreground tracking-tight">Sementes Produtiva</span>
            <span className="text-[10px] text-sidebar-foreground/50 uppercase tracking-widest">Caderno de Campo</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-3">
        <MenuGroup label="Principal" items={mainItems} />
        <MenuGroup label="Execução" items={executionItems} />
        <MenuGroup label="Monitoramento" items={monitoringItems} />
        <MenuGroup label="Gestão" items={managementItems} />
      </SidebarContent>

      <SidebarFooter className="p-3 border-t border-sidebar-border group-data-[collapsible=icon]:hidden">
        <p className="text-[10px] text-sidebar-foreground/40 text-center">Safra 2025/26 • Full Tolling</p>
      </SidebarFooter>
    </Sidebar>
  );
}
