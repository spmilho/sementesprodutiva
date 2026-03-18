import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { FREQUENCIES, LOCATIONS, PARENTS, OFFTYPE_OPTIONS, DISEASED_OPTIONS } from "./types";
import PhotoUpload from "./PhotoUpload";

interface ChecklistProps {
  cycleId: string;
  // Voluntárias
  hasVolunteers: boolean; setHasVolunteers: (v: boolean) => void;
  volunteersFreq: string; setVolunteersFreq: (v: string) => void;
  volunteersLoc: string; setVolunteersLoc: (v: string) => void;
  volunteersParent: string; setVolunteersParent: (v: string) => void;
  volunteersId: string; setVolunteersId: (v: string) => void;
  volunteersNotes: string; setVolunteersNotes: (v: string) => void;
  volunteersPhotos: string[]; setVolunteersPhotos: (v: string[]) => void;
  // Off-type
  hasOfftype: boolean; setHasOfftype: (v: boolean) => void;
  offtypeTypes: string[]; setOfftypeTypes: (v: string[]) => void;
  offtypeFreq: string; setOfftypeFreq: (v: string) => void;
  offtypeLoc: string; setOfftypeLoc: (v: string) => void;
  offtypeParent: string; setOfftypeParent: (v: string) => void;
  offtypeNotes: string; setOfftypeNotes: (v: string) => void;
  offtypePhotos: string[]; setOfftypePhotos: (v: string[]) => void;
  // Doentes
  hasDiseased: boolean; setHasDiseased: (v: boolean) => void;
  diseasedTypes: string[]; setDiseasedTypes: (v: string[]) => void;
  diseasedFreq: string; setDiseasedFreq: (v: string) => void;
  diseasedParent: string; setDiseasedParent: (v: string) => void;
  diseasedNotes: string; setDiseasedNotes: (v: string) => void;
  diseasedPhotos: string[]; setDiseasedPhotos: (v: string[]) => void;
  // Fêmea no macho
  hasFemaleInMale: boolean; setHasFemaleInMale: (v: boolean) => void;
  femaleInMaleType: string; setFemaleInMaleType: (v: string) => void;
  femaleInMaleFreq: string; setFemaleInMaleFreq: (v: string) => void;
  femaleInMaleLoc: string; setFemaleInMaleLoc: (v: string) => void;
  femaleInMaleNotes: string; setFemaleInMaleNotes: (v: string) => void;
  femaleInMalePhotos: string[]; setFemaleInMalePhotos: (v: string[]) => void;
}

function FrequencyRadio({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">Frequência</Label>
      <RadioGroup value={value} onValueChange={onChange} className="flex flex-wrap gap-2 mt-1">
        {FREQUENCIES.map(f => (
          <div key={f.value} className="flex items-center gap-1">
            <RadioGroupItem value={f.value} id={`freq-${f.value}-${Math.random()}`} />
            <Label className="text-xs cursor-pointer">{f.label}</Label>
          </div>
        ))}
      </RadioGroup>
    </div>
  );
}

function LocationRadio({ value, onChange, includesBorder = false }: { value: string; onChange: (v: string) => void; includesBorder?: boolean }) {
  const locs = includesBorder ? LOCATIONS : LOCATIONS.filter(l => l.value !== "border");
  return (
    <div>
      <Label className="text-xs text-muted-foreground">Localização</Label>
      <RadioGroup value={value} onValueChange={onChange} className="flex flex-wrap gap-2 mt-1">
        {locs.map(l => (
          <div key={l.value} className="flex items-center gap-1">
            <RadioGroupItem value={l.value} id={`loc-${l.value}-${Math.random()}`} />
            <Label className="text-xs cursor-pointer">{l.label}</Label>
          </div>
        ))}
      </RadioGroup>
    </div>
  );
}

function ParentRadio({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">Onde</Label>
      <RadioGroup value={value} onValueChange={onChange} className="flex flex-wrap gap-2 mt-1">
        {PARENTS.map(p => (
          <div key={p.value} className="flex items-center gap-1">
            <RadioGroupItem value={p.value} id={`par-${p.value}-${Math.random()}`} />
            <Label className="text-xs cursor-pointer">{p.label}</Label>
          </div>
        ))}
      </RadioGroup>
    </div>
  );
}

function MultiCheckbox({ options, values, onChange }: { options: readonly { value: string; label: string }[]; values: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(o => (
        <div key={o.value} className="flex items-center gap-1">
          <Checkbox
            checked={values.includes(o.value)}
            onCheckedChange={(checked) => {
              if (checked) onChange([...values, o.value]);
              else onChange(values.filter(v => v !== o.value));
            }}
          />
          <Label className="text-xs cursor-pointer">{o.label}</Label>
        </div>
      ))}
    </div>
  );
}

export default function OccurrenceChecklist(props: ChecklistProps) {
  return (
    <div className="space-y-4">
      {/* Voluntárias */}
      <div className="border rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">🌽</span>
            <div>
              <p className="font-medium text-sm">Voluntárias</p>
              <p className="text-xs text-muted-foreground">Plantas de milho de safras anteriores</p>
            </div>
          </div>
          <Switch checked={props.hasVolunteers} onCheckedChange={props.setHasVolunteers} />
        </div>
        {props.hasVolunteers && (
          <div className="space-y-3 pl-2 border-l-2 border-green-300 dark:border-green-700 ml-2">
            <FrequencyRadio value={props.volunteersFreq} onChange={props.setVolunteersFreq} />
            <LocationRadio value={props.volunteersLoc} onChange={props.setVolunteersLoc} includesBorder />
            <ParentRadio value={props.volunteersParent} onChange={props.setVolunteersParent} />
            <div>
              <Label className="text-xs text-muted-foreground">Facilidade de identificação</Label>
              <RadioGroup value={props.volunteersId} onValueChange={props.setVolunteersId} className="flex gap-2 mt-1">
                {[{ value: "easy", label: "Fácil" }, { value: "moderate", label: "Moderada" }, { value: "difficult", label: "Difícil" }].map(o => (
                  <div key={o.value} className="flex items-center gap-1">
                    <RadioGroupItem value={o.value} id={`vid-${o.value}`} />
                    <Label className="text-xs cursor-pointer">{o.label}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
            <Textarea value={props.volunteersNotes} onChange={e => props.setVolunteersNotes(e.target.value)} placeholder="Observações..." className="min-h-[60px]" />
            <PhotoUpload photos={props.volunteersPhotos} onChange={props.setVolunteersPhotos} cycleId={props.cycleId} />
          </div>
        )}
      </div>

      {/* Off-type */}
      <div className="border rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">🔀</span>
            <div>
              <p className="font-medium text-sm">Off-Type</p>
              <p className="text-xs text-muted-foreground">Plantas fora do padrão genético do híbrido</p>
            </div>
          </div>
          <Switch checked={props.hasOfftype} onCheckedChange={props.setHasOfftype} />
        </div>
        {props.hasOfftype && (
          <div className="space-y-3 pl-2 border-l-2 border-orange-300 dark:border-orange-700 ml-2">
            <div>
              <Label className="text-xs text-muted-foreground">Tipo (multi-select)</Label>
              <MultiCheckbox options={OFFTYPE_OPTIONS} values={props.offtypeTypes} onChange={props.setOfftypeTypes} />
            </div>
            <FrequencyRadio value={props.offtypeFreq} onChange={props.setOfftypeFreq} />
            <LocationRadio value={props.offtypeLoc} onChange={props.setOfftypeLoc} />
            <ParentRadio value={props.offtypeParent} onChange={props.setOfftypeParent} />
            <Textarea value={props.offtypeNotes} onChange={e => props.setOfftypeNotes(e.target.value)} placeholder="Observações..." className="min-h-[60px]" />
            <PhotoUpload photos={props.offtypePhotos} onChange={props.setOfftypePhotos} cycleId={props.cycleId} label="📷 Fotos (importante para off-type)" />
          </div>
        )}
      </div>

      {/* Doentes */}
      <div className="border rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">🌱</span>
            <div>
              <p className="font-medium text-sm">Plantas Doentes</p>
              <p className="text-xs text-muted-foreground">Sintomas visuais que justificam remoção</p>
            </div>
          </div>
          <Switch checked={props.hasDiseased} onCheckedChange={props.setHasDiseased} />
        </div>
        {props.hasDiseased && (
          <div className="space-y-3 pl-2 border-l-2 border-red-300 dark:border-red-700 ml-2">
            <div>
              <Label className="text-xs text-muted-foreground">Tipo (multi-select)</Label>
              <MultiCheckbox options={DISEASED_OPTIONS} values={props.diseasedTypes} onChange={props.setDiseasedTypes} />
            </div>
            <FrequencyRadio value={props.diseasedFreq} onChange={props.setDiseasedFreq} />
            <ParentRadio value={props.diseasedParent} onChange={props.setDiseasedParent} />
            <Textarea value={props.diseasedNotes} onChange={e => props.setDiseasedNotes(e.target.value)} placeholder="Observações..." className="min-h-[60px]" />
            <PhotoUpload photos={props.diseasedPhotos} onChange={props.setDiseasedPhotos} cycleId={props.cycleId} />
          </div>
        )}
      </div>

      {/* Fêmea no macho */}
      <div className="border rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">🌾</span>
            <div>
              <p className="font-medium text-sm">Fêmea no Macho</p>
              <p className="text-xs text-muted-foreground">Plantas fêmea encontradas nas linhas de macho</p>
            </div>
          </div>
          <Switch checked={props.hasFemaleInMale} onCheckedChange={props.setHasFemaleInMale} />
        </div>
        {props.hasFemaleInMale && (
          <div className="space-y-3 pl-2 border-l-2 border-purple-300 dark:border-purple-700 ml-2">
            <div>
              <Label className="text-xs text-muted-foreground">Tipo</Label>
              <RadioGroup value={props.femaleInMaleType} onValueChange={props.setFemaleInMaleType} className="flex flex-wrap gap-2 mt-1">
                <div className="flex items-center gap-1">
                  <RadioGroupItem value="female_in_male_line" id="fim-type1" />
                  <Label className="text-xs cursor-pointer">Planta fêmea na linha de macho</Label>
                </div>
                <div className="flex items-center gap-1">
                  <RadioGroupItem value="atypical_female_traits" id="fim-type2" />
                  <Label className="text-xs cursor-pointer">Planta atípica com características fêmea</Label>
                </div>
              </RadioGroup>
            </div>
            <FrequencyRadio value={props.femaleInMaleFreq} onChange={props.setFemaleInMaleFreq} />
            <LocationRadio value={props.femaleInMaleLoc} onChange={props.setFemaleInMaleLoc} />
            <Textarea value={props.femaleInMaleNotes} onChange={e => props.setFemaleInMaleNotes(e.target.value)} placeholder="Observações..." className="min-h-[60px]" />
            <PhotoUpload photos={props.femaleInMalePhotos} onChange={props.setFemaleInMalePhotos} cycleId={props.cycleId} />
          </div>
        )}
      </div>
    </div>
  );
}
