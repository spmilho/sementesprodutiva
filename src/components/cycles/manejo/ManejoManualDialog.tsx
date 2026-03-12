import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CropInput, INPUT_TYPE_CONFIG, STATUS_CONFIG } from "./types";

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (input: Partial<CropInput>) => void;
  saving: boolean;
}

export default function ManejoManualDialog({ open, onClose, onSave, saving }: Props) {
  const [form, setForm] = useState({
    execution_date: new Date().toISOString().split("T")[0],
    input_type: "insecticide",
    product_name: "",
    active_ingredient: "",
    dose_per_ha: "",
    unit: "L",
    qty_recommended: "",
    qty_applied: "",
    event_type: "",
    status: "applied" as "applied" | "recommended" | "in_progress",
    notes: "",
  });

  const handleSave = () => {
    if (!form.product_name || !form.execution_date) return;
    onSave({
      execution_date: form.execution_date,
      input_type: form.input_type,
      product_name: form.product_name,
      active_ingredient: form.active_ingredient || null,
      dose_per_ha: form.dose_per_ha ? parseFloat(form.dose_per_ha) : null,
      unit: form.unit,
      qty_recommended: form.qty_recommended ? parseFloat(form.qty_recommended) : null,
      qty_applied: form.qty_applied ? parseFloat(form.qty_applied) : null,
      event_type: form.event_type || null,
      status: form.status,
      notes: form.notes || null,
      source: "manual",
    });
  };

  return (
    <Dialog open={open} onOpenChange={() => !saving && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Registro Manual de Insumo</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Data *</Label>
              <Input type="date" value={form.execution_date} onChange={e => setForm(f => ({ ...f, execution_date: e.target.value }))} className="h-9" />
            </div>
            <div>
              <Label className="text-xs">Tipo *</Label>
              <Select value={form.input_type} onValueChange={v => setForm(f => ({ ...f, input_type: v }))}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(INPUT_TYPE_CONFIG).filter(([k]) => k !== "other").map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.icon} {v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs">Nome comercial *</Label>
            <Input value={form.product_name} onChange={e => setForm(f => ({ ...f, product_name: e.target.value }))} className="h-9" placeholder="Ex: Verdavis" />
          </div>
          <div>
            <Label className="text-xs">Ingrediente ativo</Label>
            <Input value={form.active_ingredient} onChange={e => setForm(f => ({ ...f, active_ingredient: e.target.value }))} className="h-9" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Dose/ha *</Label>
              <Input type="number" step="0.01" value={form.dose_per_ha} onChange={e => setForm(f => ({ ...f, dose_per_ha: e.target.value }))} className="h-9" />
            </div>
            <div>
              <Label className="text-xs">Unidade</Label>
              <Select value={form.unit} onValueChange={v => setForm(f => ({ ...f, unit: v }))}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["kg", "L", "mL", "g"].map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as any }))}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.icon} {v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Qtde. recomendada</Label>
              <Input type="number" step="0.01" value={form.qty_recommended} onChange={e => setForm(f => ({ ...f, qty_recommended: e.target.value }))} className="h-9" />
            </div>
            <div>
              <Label className="text-xs">Qtde. aplicada</Label>
              <Input type="number" step="0.01" value={form.qty_applied} onChange={e => setForm(f => ({ ...f, qty_applied: e.target.value }))} className="h-9" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Evento</Label>
            <Input value={form.event_type} onChange={e => setForm(f => ({ ...f, event_type: e.target.value }))} className="h-9" placeholder="Pulverização, Adubação de cobertura..." />
          </div>
          <div>
            <Label className="text-xs">Observações</Label>
            <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !form.product_name}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
