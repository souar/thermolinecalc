import { useMemo } from "react";
import { CalcInput, CalcResult, LINING_TYPES, calculate, fmt } from "@/lib/calculator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { BayDiagram } from "./BayDiagram";
import { GableDiagram } from "./GableDiagram";
import { LINING_TYPES as LT } from "@/lib/calculator";
import { Badge } from "@/components/ui/badge";

interface Props {
  value: CalcInput;
  onChange: (v: CalcInput) => void;
  pricing?: {
    cost_per_m2: number;
    weight_per_m2: number | null;
    panel_width?: number | null;
    panel_height?: number | null;
  } | null;
  rightExtra?: React.ReactNode;
}

export function CalculatorPanel({ value, onChange, pricing, rightExtra }: Props) {
  const set = <K extends keyof CalcInput>(k: K, v: CalcInput[K]) => onChange({ ...value, [k]: v });
  const num = (s: string) => (s === "" ? 0 : Number(s));

  const liningDef = LT.find((l) => l.id === value.liningType) ?? LT[0];
  const panelW = pricing?.panel_width ?? liningDef.panelW;
  const panelH = pricing?.panel_height ?? liningDef.panelH;
  const calcInput: CalcInput = {
    ...value,
    costPerM2: pricing?.cost_per_m2 ?? value.costPerM2 ?? 0,
    weightPerM2: pricing?.weight_per_m2 ?? value.weightPerM2 ?? 0,
    panelW,
    panelH,
  };
  const result = useMemo<CalcResult>(() => calculate(calcInput), [value, pricing]);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[420px_1fr] items-start">
      {/* Inputs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Marquee specification
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Length (m)">
              <Input type="number" inputMode="decimal" value={value.length} onChange={(e) => set("length", num(e.target.value))} />
            </Field>
            <Field label="Width (m)">
              <Input type="number" inputMode="decimal" value={value.width} onChange={(e) => set("width", num(e.target.value))} />
            </Field>
            <Field label="Eave height (m)">
              <Input type="number" inputMode="decimal" step="0.1" value={value.eaveHeight} onChange={(e) => set("eaveHeight", num(e.target.value))} />
            </Field>
            <Field label="Pitch (°)">
              <Input type="number" inputMode="decimal" step="0.5" value={value.pitchDeg} onChange={(e) => set("pitchDeg", num(e.target.value))} />
            </Field>
            <Field label="Bay size (m)">
              <Select value={String(value.baySize)} onValueChange={(v) => set("baySize", Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 m</SelectItem>
                  <SelectItem value="5">5 m</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Lining type">
              <Select value={value.liningType} onValueChange={(v) => set("liningType", v as CalcInput["liningType"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LINING_TYPES.map((l) => (
                    <SelectItem key={l.id} value={l.id}>{l.id} ({l.panelW}×{l.panelH}m)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="space-y-3 rounded-md border border-border bg-muted/30 p-3">
            <ToggleRow
              label="Roof drops 250mm past eave (seal to wall)"
              checked={value.roofOverhangEnabled}
              onChange={(v) => set("roofOverhangEnabled", v)}
            />
            <ToggleRow
              label="Walls have 250mm floor seal excess"
              checked={value.wallFloorSealEnabled}
              onChange={(v) => set("wallFloorSealEnabled", v)}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Apex piece width (m)</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                inputMode="decimal"
                step="0.01"
                placeholder={`auto: ${fmt(result.apexAuto)}`}
                value={value.apexOverride ?? ""}
                onChange={(e) => set("apexOverride", e.target.value === "" ? null : num(e.target.value))}
              />
              <span className="tabular text-xs text-muted-foreground whitespace-nowrap">
                using {fmt(result.apexWidth)}
              </span>
            </div>
          </div>

          {rightExtra}
        </CardContent>
      </Card>

      {/* Results */}
      <div className="space-y-4">
        {result.warnings.length > 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Specification notes</AlertTitle>
            <AlertDescription>
              <ul className="mt-1 list-disc space-y-1 pl-4 text-xs">
                {result.warnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Total panels" value={String(result.totalPanels)} unit="pcs" highlight />
          <Stat label="Total area" value={fmt(result.totalM2)} unit="m²" />
          <Stat label="Weight" value={fmt(result.totalWeightKg, 1)} unit="kg" />
          <Stat label="Cost" value={fmt(result.totalCost)} unit={pricing ? "" : "(set price)"} />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <AreaCard
            title="Walls"
            m2={result.wallsM2}
            panels={result.wallsPanels}
            sub={`${result.wallStacks} stack${result.wallStacks === 1 ? "" : "s"} × ${result.bays} bays × 2 sides · ${fmt(panelW)}×${fmt(panelH)}m panels`}
          />
          {result.customWallInfill ? (
            <AreaCard
              title="Custom wall infill"
              m2={result.customWallInfill.m2}
              panels={result.customWallInfill.panelsCount}
              sub={`${fmt(result.customWallInfill.height)}m tall (custom cut)`}
              accent
              customCut
            />
          ) : (
            <EmptyCard title="Custom wall infill" sub="Not needed — wall fits whole panels" />
          )}
          <AreaCard
            title="Roof"
            m2={result.roofM2}
            panels={result.roofPanels}
            sub={`full panels only · ${fmt(panelW)}×${fmt(panelH)}m panels`}
          />
          <AreaCard
            title="Apex"
            m2={result.apexM2}
            panels={result.apexPieces}
            sub={`${fmt(result.apexWidth)}m × ${fmt(value.baySize, 0)}m × ${result.bays} bays`}
            accent
            customCut
          />
          <AreaCard
            title="Gable walls"
            m2={result.gableWallsM2}
            panels={result.gableWallsPanels}
            sub={`rectangular fill, both ends · ${fmt(panelW)}×${fmt(panelH)}m panels`}
          />
          <AreaCard
            title="Gable triangles"
            m2={result.gableTriM2}
            panels={result.gableTriCount}
            sub={`custom triangles, max ${value.baySize}m wide`}
            accent
            customCut
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              Geometry
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <KV k="Slope length" v={`${fmt(result.slopeLength)} m`} />
              <KV k="Ridge height (total)" v={`${fmt(result.ridgeHeightTotal)} m`} />
              <KV k="Bays" v={String(result.bays)} />
              <KV k="Apex (auto)" v={`${fmt(result.apexAuto)} m`} />
            </div>
          </CardContent>
        </Card>

      </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <BayDiagram input={calcInput} result={result} panelW={panelW} panelH={panelH} />
        <GableDiagram input={calcInput} result={result} panelW={panelW} panelH={panelH} />
      </div>
    </div>
  );
}

function EmptyCard({ title, sub }: { title: string; sub: string }) {
  return (
    <Card className="border-dashed bg-muted/20">
      <CardContent className="p-4">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{title}</div>
        <div className="mt-1 tabular text-2xl font-semibold text-muted-foreground/60">—</div>
        <div className="mt-1 text-xs text-muted-foreground">{sub}</div>
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function Stat({ label, value, unit, highlight }: { label: string; value: string; unit?: string; highlight?: boolean }) {
  return (
    <div className={`rounded-md border p-3 ${highlight ? "border-primary/40 bg-primary/5" : "border-border bg-card"}`}>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="tabular text-xl font-semibold">{value}</span>
        {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
      </div>
    </div>
  );
}

function AreaCard({ title, m2, panels, sub, accent, customCut }: { title: string; m2: number; panels: number; sub?: string; accent?: boolean; customCut?: boolean }) {
  return (
    <Card className={accent ? "border-primary/30" : ""}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">{title}</div>
          {customCut && <Badge variant="outline" className="text-[10px] uppercase tracking-wider">Custom cut</Badge>}
        </div>
        <div className="mt-1 tabular text-3xl font-semibold">
          {panels}<span className="ml-1 text-xs text-muted-foreground">panels</span>
        </div>
        <div className="mt-0.5 tabular text-sm text-muted-foreground">{fmt(m2)} m²</div>
        {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
      </CardContent>
    </Card>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{k}</div>
      <div className="tabular text-sm">{v}</div>
    </div>
  );
}
