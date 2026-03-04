import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { INSTRUCTIONS } from "./instructions";
import { SubitemDef } from "./constants";
import { CHECKLIST_IMAGES } from "@/components/checklist_images";
import { useState } from "react";
import { Search, Calendar, Target, ClipboardList } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subitem: SubitemDef | null;
}

function ImageZoom({ src, alt }: { src: string; alt: string }) {
  const [zoomed, setZoomed] = useState(false);
  return (
    <>
      <img
        src={src}
        alt={alt}
        className="w-full max-w-md rounded-lg border cursor-pointer hover:opacity-90 transition-opacity"
        onClick={() => setZoomed(true)}
      />
      {zoomed && (
        <div
          className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setZoomed(false)}
        >
          <img src={src} alt={alt} className="max-w-full max-h-full object-contain rounded-lg" />
        </div>
      )}
    </>
  );
}

export default function InstructionsDrawer({ open, onOpenChange, subitem }: Props) {
  if (!subitem) return null;
  const instr = INSTRUCTIONS[subitem.key];
  if (!instr) return null;

  const refImages = subitem.refImages || [];
  const showPlantas = refImages.includes("PLANTAS_DANINHAS");
  const showPercevejo = refImages.includes("ESCALA_PERCEVEJO");
  const showLagarta = refImages.includes("ESCALA_LAGARTA");
  const showDoencas = refImages.includes("ESCALA_DOENCAS");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-lg">{subitem.label}</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 mt-4">
          {/* What to check */}
          <Card className="border-blue-200 bg-blue-50/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Search className="h-4 w-4 text-blue-600" />
                <span className="font-semibold text-sm text-blue-800">O QUE VERIFICAR</span>
              </div>
              <p className="text-sm">{instr.whatToCheck}</p>
            </CardContent>
          </Card>

          {/* Frequency */}
          <Card className="border-purple-200 bg-purple-50/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-purple-600" />
                <span className="font-semibold text-sm text-purple-800">FREQUÊNCIA</span>
              </div>
              <Badge variant="secondary">{instr.frequency}</Badge>
            </CardContent>
          </Card>

          {/* Methodology */}
          <Card className="border-amber-200 bg-amber-50/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <ClipboardList className="h-4 w-4 text-amber-600" />
                <span className="font-semibold text-sm text-amber-800">METODOLOGIA</span>
              </div>
              <p className="text-sm whitespace-pre-line">{instr.methodology}</p>
            </CardContent>
          </Card>

          {/* Criteria */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Target className="h-4 w-4 text-foreground" />
                <span className="font-semibold text-sm">CRITÉRIOS DE AVALIAÇÃO</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-start gap-2 p-3 rounded-lg bg-green-50 border border-green-200">
                  <span className="text-lg">🟢</span>
                  <div>
                    <span className="font-semibold text-green-800 text-sm">BOM</span>
                    <p className="text-sm text-green-700">{instr.criteria.bom}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-50 border border-yellow-200">
                  <span className="text-lg">🟡</span>
                  <div>
                    <span className="font-semibold text-yellow-800 text-sm">REGULAR</span>
                    <p className="text-sm text-yellow-700">{instr.criteria.regular}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
                  <span className="text-lg">🔴</span>
                  <div>
                    <span className="font-semibold text-red-800 text-sm">RUIM</span>
                    <p className="text-sm text-red-700">{instr.criteria.ruim}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Reference images */}
          {showPlantas && (
            <Card>
              <CardContent className="p-4 space-y-3">
                <Badge className="bg-green-600">📎 Referências Visuais — Plantas Daninhas</Badge>
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-green-700">🟢 BOM</p>
                  <ImageZoom src={CHECKLIST_IMAGES.PLANTAS_DANINHAS_BOM} alt="Plantas Daninhas - Bom" />
                  <p className="text-xs font-semibold text-yellow-700">🟡 REGULAR</p>
                  <ImageZoom src={CHECKLIST_IMAGES.PLANTAS_DANINHAS_REGULAR} alt="Plantas Daninhas - Regular" />
                  <p className="text-xs font-semibold text-red-700">🔴 RUIM</p>
                  <ImageZoom src={CHECKLIST_IMAGES.PLANTAS_DANINHAS_RUIM} alt="Plantas Daninhas - Ruim" />
                </div>
              </CardContent>
            </Card>
          )}

          {showPercevejo && (
            <Card>
              <CardContent className="p-4 space-y-3">
                <Badge className="bg-amber-600">📎 Escala de Percevejos (0-4)</Badge>
                <ImageZoom src={CHECKLIST_IMAGES.ESCALA_PERCEVEJO} alt="Escala de Percevejos" />
              </CardContent>
            </Card>
          )}

          {showLagarta && (
            <Card>
              <CardContent className="p-4 space-y-3">
                <Badge className="bg-amber-600">📎 Escala de Lagartas (0-9)</Badge>
                <ImageZoom src={CHECKLIST_IMAGES.ESCALA_LAGARTA} alt="Escala de Lagartas" />
              </CardContent>
            </Card>
          )}

          {showDoencas && (
            <Card>
              <CardContent className="p-4 space-y-3">
                <Badge className="bg-orange-600">📎 Escala Diagramática de Doenças</Badge>
                <ImageZoom src={CHECKLIST_IMAGES.ESCALA_DOENCAS} alt="Escala Diagramática de Doenças" />
              </CardContent>
            </Card>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
