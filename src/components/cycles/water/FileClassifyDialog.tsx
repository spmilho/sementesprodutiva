import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CONTENT_TYPE_OPTIONS } from "./types";
import { Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  fileName: string;
  onConfirm: (contentType: string, description: string, referenceDate: string) => void;
  onCancel: () => void;
  processing?: boolean;
}

export default function FileClassifyDialog({ open, fileName, onConfirm, onCancel, processing }: Props) {
  const [contentType, setContentType] = useState("irrigation");
  const [description, setDescription] = useState("");
  const [referenceDate, setReferenceDate] = useState("");

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Classificar Arquivo</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground">Arquivo</Label>
            <p className="font-medium text-sm truncate">{fileName}</p>
          </div>
          <div className="space-y-1">
            <Label>Tipo do conteúdo *</Label>
            <Select value={contentType} onValueChange={setContentType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CONTENT_TYPE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Descrição</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Opcional" />
          </div>
          <div className="space-y-1">
            <Label>Data de referência</Label>
            <Input type="date" value={referenceDate} onChange={e => setReferenceDate(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onCancel} disabled={processing}>Cancelar</Button>
          <Button onClick={() => onConfirm(contentType, description, referenceDate)} disabled={processing}>
            {processing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Processar e Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
