import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CalcInput,
  CalcResult,
  DEFAULT_INSTALL_INPUT,
  InstallInput,
  calculate,
  calculateJobCosts,
  fmt,
} from "@/lib/calculator";
import { fetchVariantsWithBom, VARIANTS_QUERY_KEY, type VariantWithBom } from "@/lib/variantsQuery";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, HardHat, Factory, LayoutDashboard, Ruler } from "lucide-react";
import { BayDiagram } from "./BayDiagram";
import { GableDiagram } from "./GableDiagram";
import { RoofPlanDiagram } from "./RoofPlanDiagram";
import { InstallPanel } from "./InstallPanel";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Props {
  value: CalcInput;
  onChange: (v: CalcInput) => void;
  rightExtra?: React.ReactNode;
  install?: InstallInput;
  onInstallChange?: (v: InstallInput) => void;
}

export function CalculatorPanel({ value, onChange, rightExtra, install, onInstallChange }: Props) {
  const set = <K extends keyof CalcInput>(k: K, v: CalcInput[K]) => onChange({ ...value, [k]: v });
  const num = (s: string) => (s === "" ? 0 : Number(s));

  const variantsQ = useQuery({
    queryKey: VARIANTS_QUERY_KEY,
    queryFn: fetchVariantsWithBom,
  });

  const variants = variantsQ.data ?? [];
  const selectedVariant: VariantWithBom | undefined = useMemo(
    () => variants.find((v) => v.id === value.liningType),
    [variants, value.liningType],
  );

  const panelW =
    selectedVariant?.default_panel_width != null
      ? Number(selectedVariant.default_panel_width)
      : 5;
  const panelH =
    selectedVariant?.default_panel_height != null
      ? Number(selectedVariant.default_panel_height)
      : 5;

  // Approx blended weight/m² for gable splitting purposes only
  const blendedWeightPerM2 = useMemo(() => {
    if (!selectedVariant) return 0;
    return selectedVariant.bom.reduce((s, l) => {
      if (l.componentKind === "labour" || l.weightPerM2 == null) return s;
      // Only count "all sections" lines for the blended estimate
      if (l.sections && l.sections.length > 0) return s;
      return s + l.qtyPerM2 * l.weightPerM2;
    }, 0);
  }, [selectedVariant]);

  const calcInput: CalcInput = {
    ...value,
    panelW,
    panelH,
    weightPerM2: blendedWeightPerM2,
  };
  const result = useMemo<CalcResult>(() => calculate(calcInput), [value, panelW, panelH, blendedWeightPerM2]);

  const jobCosts = useMemo(
    () => calculateJobCosts(result, selectedVariant?.bom ?? []),
    [result, selectedVariant],
  );

  // Per-section cost: sum of resolved BOM lines whose sections include this key,
  // plus the section's share of "all sections" lines (scaled by sectionM2 / totalM2).
  const sectionCost = (sectionKey: string, sectionM2: number): number => {
    if (sectionM2 <= 0 || result.totalM2 <= 0) return 0;
    let cost = 0;
    for (const l of jobCosts.lines) {
      if (!l.sections || l.sections.length === 0) {
        cost += l.cost * (sectionM2 / result.totalM2);
      } else if (l.sections.includes(sectionKey as never)) {
        // Allocate this line's cost across its sections proportional to section m²
        const totalLineM2 = l.m2 || 1;
        cost += l.cost * (sectionM2 / totalLineM2);
      }
    }
    return cost;
  };

  const sectionWeight = (sectionM2: number): number => {
    if (sectionM2 <= 0 || result.totalM2 <= 0) return 0;
    return jobCosts.totalWeightKg * (sectionM2 / result.totalM2);
  };

  const mkRow = (
    sectionKey: string,
    component: string,
    panels: number,
    panelSize: string,
    m2: number,
    notes: string,
    opts: { custom?: boolean; perBayLabel?: string } = {},
  ): SectionRow => ({
    component,
    panels,
    panelSize,
    perBay: result.bays > 0 ? panels / result.bays : 0,
    perBayLabel: opts.perBayLabel,
    m2,
    weight: sectionWeight(m2),
    cost: sectionCost(sectionKey, m2),
    notes,
    custom: opts.custom,
  });

  // Roof rows
  const roofRows: SectionRow[] = [
    mkRow(
      "roof",
      "Roof panels",
      result.roofPanels,
      `${fmt(panelW)}×${fmt(result.roofPanelHeight)} m${result.roofPanelHeight < panelH - 1e-3 ? " (cut)" : ""}`,
      result.roofM2,
      `${result.roofPanels / Math.max(1, result.bays * 2)} per side × ${result.bays} bays × 2 sides`,
    ),
  ];
  if (result.apexPieces > 0) {
    roofRows.push(
      mkRow(
        "apex",
        "Apex Infill",
        result.apexPieces,
        `${fmt(result.apexWidth)}×${fmt(value.baySize)} m`,
        result.apexM2,
        "One per bay along the ridge",
        { custom: true },
      ),
    );
  }
  if (result.customRoofEave) {
    roofRows.push(
      mkRow(
        "eave",
        "Eave Infill",
        result.customRoofEave.panelsCount,
        `${fmt(panelW)}×${fmt(result.customRoofEave.height)} m`,
        result.customRoofEave.m2,
        "Absorbs slope leftover at eave",
        { custom: true },
      ),
    );
  }

  // Wall rows
  const wallRows: SectionRow[] = [
    mkRow(
      "walls",
      "Wall panels",
      result.wallsPanels,
      `${fmt(panelW)}×${fmt(result.wallPanelHeight)} m${result.wallPanelHeight < panelH - 1e-3 ? " (cut)" : ""}`,
      result.wallsM2,
      `${result.wallStacks} stack${result.wallStacks === 1 ? "" : "s"} × ${result.bays} bays × 2 sides`,
    ),
  ];
  if (result.customWallInfill) {
    wallRows.push(
      mkRow(
        "wall_infill",
        "Wall infill",
        result.customWallInfill.panelsCount,
        `${fmt(panelW)}×${fmt(result.customWallInfill.height)} m`,
        result.customWallInfill.m2,
        "Custom infill above stacked panels",
        { custom: true },
      ),
    );
  }

  // Gable rows
  const gableTriOnlyM2 = result.gableTriM2 - result.gableInfillM2;
  const gableRows: SectionRow[] = [
    mkRow(
      "gable_walls",
      "Rectangular fill",
      result.gableWallsPanels,
      `${fmt(panelW)}×${fmt(panelH)} m`,
      result.gableWallsM2,
      `${result.gableWallsPanels / 2} per end × 2 ends`,
      { perBayLabel: `${result.gableWallsPanels / 2} / end` },
    ),
  ];
  if (result.gableTriCount > 0) {
    gableRows.push(
      mkRow(
        "gable_triangles",
        "Triangles",
        result.gableTriCount,
        `≤ ${fmt(panelW)}×${fmt(panelH)} m`,
        gableTriOnlyM2,
        `${result.gableTriCount / 2} per end × 2 ends`,
        { custom: true, perBayLabel: `${result.gableTriCount / 2} / end` },
      ),
    );
  }
  if (result.gableInfillCount > 0) {
    gableRows.push(
      mkRow(
        "gable_triangles",
        "Triangle infills",
        result.gableInfillCount,
        `≤ ${fmt(panelW)}×${fmt(panelH)} m`,
        result.gableInfillM2,
        `${result.gableInfillCount / 2} per end × 2 ends`,
        { custom: true, perBayLabel: `${result.gableInfillCount / 2} / end` },
      ),
    );
  }

  const rafterRows: SectionRow[] = [];
  if (result.roofRafterCovers) {
    const rc = result.roofRafterCovers;
    if (rc.fullPanels > 0) {
      rafterRows.push(
        mkRow(
          "roof_rafters",
          "Roof rafter covers (full)",
          rc.fullPanels,
          `${fmt(rc.flapLength)}×${fmt(value.rafterFlapWidth ?? 0.4)} m`,
          rc.fullPanels * rc.flapLength * (value.rafterFlapWidth ?? 0.4),
          `${rc.flapsPerRafter} flap${rc.flapsPerRafter === 1 ? "" : "s"} per rafter × ${rc.countRafters} rafters · 150mm overlaps`,
        ),
      );
    }
    if (rc.customLastFlap != null && rc.customPanels > 0) {
      rafterRows.push(
        mkRow(
          "roof_rafters",
          "Roof rafter covers (custom length)",
          rc.customPanels,
          `${fmt(rc.customLastFlap)}×${fmt(value.rafterFlapWidth ?? 0.4)} m`,
          rc.customPanels * rc.customLastFlap * (value.rafterFlapWidth ?? 0.4),
          "Last flap per rafter, cut to fit",
          { custom: true },
        ),
      );
    }
  }
  if (result.legRafterCovers) {
    const lc = result.legRafterCovers;
    rafterRows.push(
      mkRow(
        "leg_rafters",
        "Leg rafter covers",
        lc.count,
        `${fmt(lc.legLength)}×${fmt(value.rafterFlapWidth ?? 0.4)} m`,
        lc.m2,
        "One per leg rafter · 150mm overlap onto roof at eave",
      ),
    );
  }
  if (rafterRows.length === 0) {
    rafterRows.push({
      component: "Rafter covers",
      panels: null,
      panelSize: "—",
      perBay: null,
      m2: null,
      weight: null,
      cost: null,
      notes: "Enable in spec to include",
      muted: true,
    });
  }

  return (
    <Tabs defaultValue="overview" className="space-y-6">
      <TabsList className="grid w-full grid-cols-2 sm:w-auto sm:inline-grid sm:grid-cols-4">
        <TabsTrigger value="overview" className="gap-1.5"><LayoutDashboard className="h-3.5 w-3.5" />Overview</TabsTrigger>
        <TabsTrigger value="diagrams" className="gap-1.5"><Ruler className="h-3.5 w-3.5" />Diagrams</TabsTrigger>
        <TabsTrigger value="labour" className="gap-1.5"><HardHat className="h-3.5 w-3.5" />Install</TabsTrigger>
        <TabsTrigger value="manufacturing" className="gap-1.5"><Factory className="h-3.5 w-3.5" />Manufacturing</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-6">
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
                  <Select value={value.liningType || undefined} onValueChange={(v) => set("liningType", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder={variantsQ.isLoading ? "Loading…" : "Select a variant"} />
                    </SelectTrigger>
                    <SelectContent>
                      {variants.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.name} (£{v.baseCostPerM2.toFixed(2)}/m² base + {v.sectionKeysCount} section costs)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <div className="space-y-3 rounded-md border border-border bg-muted/30 p-3">
                <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Sections to line
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <ToggleRow
                    label="Roof"
                    checked={value.lineRoof !== false}
                    onChange={(v) => {
                      const next: CalcInput = { ...value, lineRoof: v };
                      if (!v) {
                        next.lineApex = false;
                        next.roofRaftersEnabled = false;
                      }
                      onChange(next);
                    }}
                  />
                  {value.lineRoof !== false && (
                    <ToggleRow
                      label="Apex infill"
                      checked={value.lineApex !== false}
                      onChange={(v) => set("lineApex", v)}
                    />
                  )}
                  <ToggleRow
                    label="Walls (long sides)"
                    checked={value.lineWalls !== false}
                    onChange={(v) => {
                      const next: CalcInput = { ...value, lineWalls: v };
                      if (!v) next.legRaftersEnabled = false;
                      onChange(next);
                    }}
                  />
                  <ToggleRow
                    label="Gable walls"
                    checked={value.lineGableWalls !== false}
                    onChange={(v) => set("lineGableWalls", v)}
                  />
                  <ToggleRow
                    label="Gable triangles & infills"
                    checked={value.lineGableTriangles !== false}
                    onChange={(v) => set("lineGableTriangles", v)}
                  />
                  {value.lineRoof !== false && (
                    <ToggleRow
                      label="Roof rafter covers"
                      checked={!!value.roofRaftersEnabled}
                      onChange={(v) => set("roofRaftersEnabled", v)}
                    />
                  )}
                  {value.lineWalls !== false && (
                    <ToggleRow
                      label="Leg rafter covers"
                      checked={!!value.legRaftersEnabled}
                      onChange={(v) => set("legRaftersEnabled", v)}
                    />
                  )}
                </div>
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
                {(value.roofRaftersEnabled || value.legRaftersEnabled) && (
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <Field label="Flap width (mm)">
                      <Input
                        type="number"
                        inputMode="decimal"
                        step="10"
                        value={Math.round((value.rafterFlapWidth ?? 0.4) * 1000)}
                        onChange={(e) => set("rafterFlapWidth", num(e.target.value) / 1000)}
                      />
                    </Field>
                    {value.roofRaftersEnabled && (
                      <Field label="Roof rafter length (m)">
                        <Input
                          type="number"
                          inputMode="decimal"
                          step="0.5"
                          value={value.roofRafterLength ?? 10}
                          onChange={(e) => set("roofRafterLength", num(e.target.value))}
                        />
                      </Field>
                    )}
                  </div>
                )}
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

            <SectionTable
              title="Roof"
              description="Full roof panels + apex strips + any custom eave cuts"
              rows={roofRows}
            />

            <SectionTable
              title="Walls"
              description="Long-side walls (both sides) including any custom infill"
              rows={wallRows}
            />

            <SectionTable
              title="Gables"
              description="Both gable ends — rectangular fill + custom triangles + infills"
              rows={gableRows}
            />

            <SectionTable
              title="Rafter covers"
              description="Fabric flaps along roof and leg rafters with 150mm overlaps"
              rows={rafterRows}
            />

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
      </TabsContent>

      <TabsContent value="diagrams" className="space-y-6">
        <BayDiagram input={calcInput} result={result} panelW={panelW} panelH={panelH} />
        <GableDiagram input={calcInput} result={result} panelW={panelW} panelH={panelH} />
        <RoofPlanDiagram input={calcInput} result={result} />
      </TabsContent>

      <TabsContent value="labour" className="space-y-6">
        <InstallPanel
          result={result}
          value={install ?? DEFAULT_INSTALL_INPUT}
          onChange={onInstallChange ?? (() => {})}
        />
      </TabsContent>

      <TabsContent value="manufacturing">
        <ComingSoon
          icon={<Factory className="h-8 w-8" />}
          title="Manufacturing"
          description="Scope material quantities, supplier costs, and production hours per piece. Will pull from a bill-of-materials database and generate a per-job manufacturing plan with lead times."
        />
      </TabsContent>
    </Tabs>
  );
}

function ComingSoon({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <Card className="border-dashed">
      <CardHeader className="items-center text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
          {icon}
        </div>
        <div className="flex items-center gap-2 pt-2">
          <CardTitle>{title}</CardTitle>
          <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">Coming soon</Badge>
        </div>
        <CardDescription className="max-w-md pt-1">{description}</CardDescription>
      </CardHeader>
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

interface SectionRow {
  component: string;
  panels: number | null;
  panelSize: string;
  perBay: number | null;
  perBayLabel?: string;
  m2: number | null;
  weight: number | null;
  cost: number | null;
  notes: string;
  muted?: boolean;
  custom?: boolean;
}

function SectionTable({
  title,
  description,
  rows,
}: {
  title: string;
  description?: string;
  rows: SectionRow[];
}) {
  const totals = rows.reduce(
    (acc, r) => ({
      panels: acc.panels + (r.panels ?? 0),
      m2: acc.m2 + (r.m2 ?? 0),
      weight: acc.weight + (r.weight ?? 0),
      cost: acc.cost + (r.cost ?? 0),
      hasValues: acc.hasValues || r.panels != null,
    }),
    { panels: 0, m2: 0, weight: 0, cost: 0, hasValues: false },
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          {title}
        </CardTitle>
        {description && <CardDescription className="text-xs">{description}</CardDescription>}
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="pl-4">Component</TableHead>
              <TableHead className="text-right">Panels</TableHead>
              <TableHead>Panel size</TableHead>
              <TableHead className="text-right">Per bay</TableHead>
              <TableHead className="text-right">m²</TableHead>
              <TableHead className="text-right">Weight (kg)</TableHead>
              <TableHead className="text-right">Cost</TableHead>
              <TableHead className="pr-4">Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.component}>
                <TableCell className="pl-4">
                  <div className="flex items-center gap-2">
                    <span className={r.muted ? "text-muted-foreground" : "font-medium"}>{r.component}</span>
                    {r.custom && (
                      <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                        Custom
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className={`text-right tabular-nums ${r.muted ? "text-muted-foreground" : ""}`}>
                  {r.panels ?? "—"}
                </TableCell>
                <TableCell className={`tabular-nums text-xs ${r.muted ? "text-muted-foreground" : ""}`}>
                  {r.panelSize}
                </TableCell>
                <TableCell className={`text-right tabular-nums ${r.muted ? "text-muted-foreground" : ""}`}>
                  {r.perBayLabel ?? (r.perBay != null ? fmt(r.perBay, 1) : "—")}
                </TableCell>
                <TableCell className={`text-right tabular-nums ${r.muted ? "text-muted-foreground" : ""}`}>
                  {r.m2 != null ? fmt(r.m2) : "—"}
                </TableCell>
                <TableCell className={`text-right tabular-nums ${r.muted ? "text-muted-foreground" : ""}`}>
                  {r.weight != null ? fmt(r.weight, 1) : "—"}
                </TableCell>
                <TableCell className={`text-right tabular-nums ${r.muted ? "text-muted-foreground" : ""}`}>
                  {r.cost != null ? fmt(r.cost) : "—"}
                </TableCell>
                <TableCell className="pr-4 text-xs text-muted-foreground">{r.notes}</TableCell>
              </TableRow>
            ))}
            {totals.hasValues && rows.length > 1 && (
              <TableRow className="bg-muted/30 font-semibold">
                <TableCell className="pl-4">Totals</TableCell>
                <TableCell className="text-right tabular-nums">{totals.panels}</TableCell>
                <TableCell />
                <TableCell />
                <TableCell className="text-right tabular-nums">{fmt(totals.m2)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmt(totals.weight, 1)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmt(totals.cost)}</TableCell>
                <TableCell className="pr-4" />
              </TableRow>
            )}
          </TableBody>
        </Table>
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
