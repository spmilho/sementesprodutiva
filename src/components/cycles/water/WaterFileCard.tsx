import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, Download, Trash2, FileSpreadsheet, FileText, File } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { CONTENT_TYPE_OPTIONS, type WaterFile } from "./types";
import ExcelPreview from "./ExcelPreview";
import WordPreview from "./WordPreview";

interface Props {
  file: WaterFile;
  onDelete: (id: string) => void;
}

const fileIcons: Record<string, typeof FileSpreadsheet> = {
  xlsx: FileSpreadsheet, xls: FileSpreadsheet, csv: FileSpreadsheet,
  docx: FileText, pdf: File,
};

export default function WaterFileCard({ file, onDelete }: Props) {
  const [expanded, setExpanded] = useState(false);
  const Icon = fileIcons[file.file_type] || File;
  const contentLabel = CONTENT_TYPE_OPTIONS.find(o => o.value === file.content_type)?.label || file.content_type;
  const sizeStr = file.file_size_bytes > 1024 * 1024
    ? `${(file.file_size_bytes / (1024 * 1024)).toFixed(1)}MB`
    : `${(file.file_size_bytes / 1024).toFixed(0)}KB`;
  const dateStr = file.reference_date
    ? new Date(file.reference_date + "T12:00:00").toLocaleDateString("pt-BR")
    : new Date(file.created_at).toLocaleDateString("pt-BR");

  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{file.file_name}</p>
            <div className="flex items-center gap-2 flex-wrap mt-0.5">
              <Badge variant="outline" className="text-[10px]">{contentLabel}</Badge>
              <span className="text-xs text-muted-foreground">{dateStr}</span>
              <span className="text-xs text-muted-foreground">{sizeStr}</span>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
              <a href={file.file_url} download={file.file_name} target="_blank" rel="noreferrer"><Download className="h-3.5 w-3.5" /></a>
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remover arquivo?</AlertDialogTitle>
                  <AlertDialogDescription>O arquivo "{file.file_name}" será removido.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => onDelete(file.id)}>Remover</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setExpanded(!expanded)}>
              {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>

        {/* Word images shown directly (no expand needed) */}
        {file.file_type === "docx" && (file.extracted_images?.length ?? 0) > 0 && (
          <div className="mt-3 pt-3 border-t">
            <WordPreview images={file.extracted_images || []} />
          </div>
        )}

        {expanded && (
          <div className="mt-3 pt-3 border-t">
            {file.description && <p className="text-xs text-muted-foreground mb-2">{file.description}</p>}

            {/* Excel preview */}
            {(file.file_type === "xlsx" || file.file_type === "xls" || file.file_type === "csv") && file.parsed_data && (
              <ExcelPreview data={file.parsed_data} onMappingConfirm={() => {}} showMappingStep={false} />
            )}

            {/* PDF preview */}
            {file.file_type === "pdf" && (
              <div className="space-y-2">
                <iframe src={file.file_url} className="w-full h-[500px] rounded border" title={file.file_name} />
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <a href={file.file_url} target="_blank" rel="noreferrer">Visualizar PDF</a>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a href={file.file_url} download={file.file_name}>Baixar PDF</a>
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
