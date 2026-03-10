import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";

export interface FiltrosState {
  status: string;
  prioridade: string;
  responsavel: string;
  categoria: string;
  busca: string;
}

interface Props {
  filtros: FiltrosState;
  onChange: (f: FiltrosState) => void;
  responsaveis: { id: string; full_name: string | null }[];
}

export function FiltrosAcoes({ filtros, onChange, responsaveis }: Props) {
  const set = (k: keyof FiltrosState, v: string) => onChange({ ...filtros, [k]: v });

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <div className="relative flex-1 min-w-[180px]">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar ações..." className="pl-8 h-9" value={filtros.busca} onChange={e => set("busca", e.target.value)} />
      </div>
      <Select value={filtros.status} onValueChange={v => set("status", v)}>
        <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="Status" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos status</SelectItem>
          <SelectItem value="aberta">Aberta</SelectItem>
          <SelectItem value="em_andamento">Em andamento</SelectItem>
          <SelectItem value="concluida">Concluída</SelectItem>
          <SelectItem value="cancelada">Cancelada</SelectItem>
        </SelectContent>
      </Select>
      <Select value={filtros.prioridade} onValueChange={v => set("prioridade", v)}>
        <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="Prioridade" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todas</SelectItem>
          <SelectItem value="critica">Crítica</SelectItem>
          <SelectItem value="alta">Alta</SelectItem>
          <SelectItem value="media">Média</SelectItem>
          <SelectItem value="baixa">Baixa</SelectItem>
        </SelectContent>
      </Select>
      <Select value={filtros.responsavel} onValueChange={v => set("responsavel", v)}>
        <SelectTrigger className="w-[160px] h-9"><SelectValue placeholder="Responsável" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos</SelectItem>
          {responsaveis.map(r => (
            <SelectItem key={r.id} value={r.id}>{r.full_name || "Sem nome"}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={filtros.categoria} onValueChange={v => set("categoria", v)}>
        <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="Categoria" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todas</SelectItem>
          {["Qualidade", "Segurança", "Processo", "Manutenção", "RH", "Outro"].map(c => (
            <SelectItem key={c} value={c}>{c}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
