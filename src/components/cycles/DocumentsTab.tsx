import { useState, useRef, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Upload, FileText, FileImage, FileSpreadsheet, File, Download,
  Trash2, Eye, Loader2, X, Filter,
} from "lucide-react";
import { format } from "date-fns";

interface Props {
  cycleId: string;
  orgId: string;
}

const CATEGORIES = [
  "Laudo técnico",
  "Receituário agronômico",
  "ART",
  "Nota fiscal",
  "Boletim de análise de sementes",
  "Mapa / Croqui",
  "Foto de campo",
  "Contrato",
  "Relatório de inspeção",
  "Planilha ROI/RID",
  "Estimativa de produtividade",
  "Outro",
] as const;

const ACCEPTED_TYPES = ".pdf,.jpg,.jpeg,.png,.xlsx,.xls,.docx,.doc,.csv";
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

function fileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) return <FileImage className="h-4 w-4 text-green-600" />;
  if (ext === "pdf") return <FileText className="h-4 w-4 text-red-600" />;
  if (["xlsx", "xls", "csv"].includes(ext)) return <FileSpreadsheet className="h-4 w-4 text-emerald-700" />;
  return <File className="h-4 w-4 text-muted-foreground" />;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isPreviewable(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return ["jpg", "jpeg", "png", "gif", "webp", "pdf"].includes(ext);
}

function isImage(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return ["jpg", "jpeg", "png", "gif", "webp"].includes(ext);
}

export default function DocumentsTab({ cycleId, orgId }: Props) {
  const { user } = useAuth();
  const { canInsert, canDelete } = useRole();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // Fetch attachments
  const { data: attachments = [], isLoading } = useQuery({
    queryKey: ["attachments", cycleId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("attachments")
        .select("*")
        .eq("entity_type", "cycle")
        .eq("entity_id", cycleId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile || !category) throw new Error("Selecione um arquivo e tipo.");
      if (selectedFile.size > MAX_SIZE) throw new Error("Arquivo excede 10MB.");

      const timestamp = Date.now();
      const safeName = selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${orgId}/${cycleId}/${timestamp}_${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from("cycle-documents")
        .upload(path, selectedFile);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("cycle-documents")
        .getPublicUrl(path);

      const { error: dbError } = await (supabase as any)
        .from("attachments")
        .insert({
          entity_type: "cycle",
          entity_id: cycleId,
          org_id: orgId,
          file_url: path,
          file_name: selectedFile.name,
          file_type: selectedFile.type,
          file_size: selectedFile.size,
          document_category: category,
          description: description.trim() || null,
          created_by: user?.id,
        });
      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attachments", cycleId] });
      setSelectedFile(null);
      setCategory("");
      setDescription("");
      toast.success("Documento enviado!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (att: any) => {
      await supabase.storage.from("cycle-documents").remove([att.file_url]);
      const { error } = await (supabase as any).rpc("soft_delete_record", {
        _table_name: "attachments",
        _record_id: att.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attachments", cycleId] });
      toast.success("Documento excluído.");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files?.length) return;
    const file = files[0];
    if (file.size > MAX_SIZE) {
      toast.error("Arquivo excede 10MB.");
      return;
    }
    setSelectedFile(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const getSignedUrl = useCallback(async (path: string) => {
    const { data, error } = await supabase.storage
      .from("cycle-documents")
      .createSignedUrl(path, 3600);
    if (error) throw error;
    return data.signedUrl;
  }, []);

  const handlePreview = useCallback(async (att: any) => {
    try {
      const url = await getSignedUrl(att.file_url);
      if (isImage(att.file_name)) {
        setLightboxUrl(url);
      } else {
        window.open(url, "_blank");
      }
    } catch (e: any) {
      toast.error("Erro ao abrir preview: " + e.message);
    }
  }, [getSignedUrl]);

  const handleDownload = useCallback(async (att: any) => {
    try {
      const { data, error } = await supabase.storage
        .from("cycle-documents")
        .download(att.file_url);
      if (error) throw error;
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = att.file_name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      toast.error("Erro ao baixar: " + e.message);
    }
  }, []);

  const filtered = useMemo(() => {
    if (filterCategory === "all") return attachments;
    return attachments.filter((a: any) => a.document_category === filterCategory);
  }, [attachments, filterCategory]);

  return (
    <div className="space-y-6">
      {/* Upload Zone */}
      {canInsert && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Enviar Documento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selectedFile ? (
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
                }`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Arraste ou clique para selecionar</p>
                <p className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG, XLSX, DOCX, CSV (máx 10MB)</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_TYPES}
                  className="hidden"
                  onChange={(e) => handleFiles(e.target.files)}
                />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                  {fileIcon(selectedFile.name)}
                  <span className="text-sm font-medium flex-1 truncate">{selectedFile.name}</span>
                  <span className="text-xs text-muted-foreground">{formatSize(selectedFile.size)}</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSelectedFile(null)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Tipo do documento *" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Descrição (opcional)"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
                <Button
                  onClick={() => uploadMutation.mutate()}
                  disabled={!category || uploadMutation.isPending}
                >
                  {uploadMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                  Enviar
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Documents List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base">Documentos ({attachments.length})</CardTitle>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[180px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">Nenhum documento encontrado.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Arquivo</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Tamanho</TableHead>
                    <TableHead>Data upload</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((att: any) => (
                    <TableRow key={att.id}>
                      <TableCell>
                        <div className="flex items-center gap-2 min-w-0">
                          {fileIcon(att.file_name)}
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate max-w-[200px]">{att.file_name}</p>
                            {att.description && (
                              <p className="text-xs text-muted-foreground truncate max-w-[200px]">{att.description}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs whitespace-nowrap">{att.document_category}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatSize(att.file_size)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(att.created_at), "dd/MM/yyyy HH:mm")}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {isPreviewable(att.file_name) && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handlePreview(att)}>
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDownload(att)}>
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                          {canDelete && (
                            <Button
                              variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                              onClick={() => {
                                if (confirm("Excluir este documento?")) deleteMutation.mutate(att);
                              }}
                              disabled={deleteMutation.isPending}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lightbox */}
      <Dialog open={!!lightboxUrl} onOpenChange={() => setLightboxUrl(null)}>
        <DialogContent className="max-w-3xl p-2">
          {lightboxUrl && (
            <img src={lightboxUrl} alt="Preview" className="w-full h-auto rounded" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
