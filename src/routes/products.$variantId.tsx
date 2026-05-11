import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useEffect, useMemo, useState } from "react";
import { getUsername } from "@/lib/username";
import { toast } from "sonner";
import { SECTION_KEYS, type SectionKey, calculate, calculateJobCosts, DEFAULT_INPUT, type BomLine } from "@/lib/calculator";

export const Route = createFileRoute("/products/$variantId")({
  component: ProductDetail,
});

type Variant = {
  id: string;
  name: string;
  description: string | null;
  default_panel_width: number | null;
  default_panel_height: number | null;
  active: boolean;
  notes: string | null;
};

type Component = {
  id: string;
  name: string;
  kind: "sleeve" | "material" | "labour";
  unit: string;
  cost_per_unit: number;
  manufacturing_stage: string | null;
  time_minutes_per_unit: number | null;
};

type BomRow = {
  id: string;
  variant_id: string;
  component_id: string;
  qty_per_m2: number;
  panel_m2: number | null;
  sections: string[] | null;
  sort_order: number;
  notes: string | null;
  components: Component | null;
};

const KIND_LABEL: Record<Component["kind"], string> = {
  sleeve: "Sleeve",
  material: "Material",
  labour: "Labour",
};

function sectionLabel(k: string) {
  return SECTION_KEYS.find((s) => s.key === k)?.label ?? k;
}

function ProductDetail() {
  const { variantId } = Route.useParams();
  const qc = useQueryClient();
  const [editVariantOpen, setEditVariantOpen] = useState(false);
  const [bomDialog, setBomDialog] = useState<{ mode: "new" } | { mode: "edit"; row: BomRow } | null>(null);

  const variantQ = useQuery({
    queryKey: ["lining_variants", variantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lining_variants")
        .select("*")
        .eq("id", variantId)
        .single();
      if (error) throw error;
      return data as Variant;
    },
  });

  const bomQ = useQuery({
    queryKey: ["lining_variant_components", variantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lining_variant_components")
        .select("*, components(*)")
        .eq("variant_id", variantId)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as unknown as BomRow[];
    },
  });

  const componentsQ = useQuery({
    queryKey: ["components"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("components")
        .select("*")
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return (data ?? []) as Component[];
    },
  });

  const updateVariantM = useMutation({
    mutationFn: async (v: Variant) => {
      const { error } = await supabase
        .from("lining_variants")
        .update({
          name: v.name.trim(),
          description: v.description,
          default_panel_width: v.default_panel_width,
          default_panel_height: v.default_panel_height,
          active: v.active,
          notes: v.notes,
          updated_by: getUsername(),
        })
        .eq("id", v.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["lining_variants"] });
      setEditVariantOpen(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const upsertBomM = useMutation({
    mutationFn: async (input: {
      id?: string;
      component_id: string;
      qty_per_m2: number;
      panel_m2: number | null;
      sections: string[] | null;
      sort_order: number;
      notes: string | null;
    }) => {
      if (input.id) {
        const { error } = await supabase
          .from("lining_variant_components")
          .update({
            component_id: input.component_id,
            qty_per_m2: input.qty_per_m2,
            panel_m2: input.panel_m2,
            sections: input.sections,
            sort_order: input.sort_order,
            notes: input.notes,
          })
          .eq("id", input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("lining_variant_components").insert({
          variant_id: variantId,
          component_id: input.component_id,
          qty_per_m2: input.qty_per_m2,
          panel_m2: input.panel_m2,
          sections: input.sections,
          sort_order: input.sort_order,
          notes: input.notes,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["lining_variant_components", variantId] });
      qc.invalidateQueries({ queryKey: ["lining_variants"] });
      setBomDialog(null);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const removeBomM = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("lining_variant_components").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Removed");
      qc.invalidateQueries({ queryKey: ["lining_variant_components", variantId] });
      qc.invalidateQueries({ queryKey: ["lining_variants"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const variant = variantQ.data;
  const rows = bomQ.data ?? [];

  const baseRows = rows.filter((r) => !r.sections || r.sections.length === 0);
  const sectionRows = rows.filter((r) => r.sections && r.sections.length > 0);
  const baseCost = baseRows.reduce(
    (s, r) => s + Number(r.qty_per_m2) * Number(r.components?.cost_per_unit ?? 0),
    0,
  );

  const sectionBreakdown = useMemo(() => {
    const map = new Map<string, { component: string; cost: number }[]>();
    for (const r of sectionRows) {
      const c = Number(r.qty_per_m2) * Number(r.components?.cost_per_unit ?? 0);
      for (const s of r.sections!) {
        if (!map.has(s)) map.set(s, []);
        map.get(s)!.push({ component: r.components?.name ?? "—", cost: c });
      }
    }
    return Array.from(map.entries());
  }, [sectionRows]);

  // Reference total cost from running calculate() against DEFAULT_INPUT
  const reference = useMemo(() => {
    const SECTION_KEY_SET = new Set<string>(SECTION_KEYS.map((s) => s.key));
    const bom: BomLine[] = rows
      .filter((r) => r.components)
      .map((r) => {
        const c = r.components!;
        const sections = ((r.sections as string[] | null) ?? []).filter(
          (s): s is SectionKey => SECTION_KEY_SET.has(s),
        );
        return {
          componentId: c.id,
          componentName: c.name,
          componentKind: c.kind,
          manufacturingStage: c.manufacturing_stage ?? null,
          unit: c.unit,
          costPerUnit: Number(c.cost_per_unit ?? 0),
          qtyPerM2: Number(r.qty_per_m2 ?? 0),
          sections: sections.length > 0 ? sections : null,
          timeMinutesPerUnit: (c as any).time_minutes_per_unit != null ? Number((c as any).time_minutes_per_unit) : null,
          m2PerUnit: (c as any).m2_per_unit != null ? Number((c as any).m2_per_unit) : null,
          weightPerM2: (c as any).weight_per_m2 != null ? Number((c as any).weight_per_m2) : null,
          primarySupplierId: null,
          primarySupplierName: null,
        };
      });
    const panelW = variantQ.data?.default_panel_width != null ? Number(variantQ.data.default_panel_width) : undefined;
    const panelH = variantQ.data?.default_panel_height != null ? Number(variantQ.data.default_panel_height) : undefined;
    const result = calculate({ ...DEFAULT_INPUT, panelW, panelH, liningType: variantId });
    const jc = calculateJobCosts(result, bom);
    return { result, jc };
  }, [rows, variantQ.data, variantId]);

  if (variantQ.isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!variant) return <p className="text-sm text-muted-foreground">Variant not found.</p>;

  const defaultPanelM2 =
    Number(variant.default_panel_width ?? 0) * Number(variant.default_panel_height ?? 0);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link to="/products" className="text-xs text-muted-foreground hover:underline">
            ← Products
          </Link>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{variant.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Panel {variant.default_panel_width ?? "—"} × {variant.default_panel_height ?? "—"} m
            {variant.description ? ` · ${variant.description}` : ""}
            {!variant.active && " · Inactive"}
          </p>
        </div>
        <Button variant="outline" onClick={() => setEditVariantOpen(true)}>
          Edit details
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">
              Bill of materials
            </CardTitle>
            <Button size="sm" onClick={() => setBomDialog({ mode: "new" })}>
              + Add component
            </Button>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Component</TableHead>
                  <TableHead>Kind</TableHead>
                  <TableHead>Sections</TableHead>
                  <TableHead className="text-right">Qty/m²</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className="text-right">Cost/unit</TableHead>
                  <TableHead className="text-right">£/m²</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead className="w-32"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9}>
                      <div className="flex flex-col items-center gap-3 py-8 text-center">
                        <div className="text-base font-medium">No components attached yet</div>
                        <p className="max-w-md text-xs text-muted-foreground">
                          This variant won't appear with cost, weight or labour in the
                          calculator until at least one component is added. Sleeves
                          typically apply to specific sections (roof, walls, gables);
                          materials and labour can apply to all sections.
                        </p>
                        {(componentsQ.data ?? []).length === 0 ? (
                          <p className="text-xs text-amber-600 dark:text-amber-400">
                            You have no components defined.{" "}
                            <Link to="/components" className="underline">
                              Create sleeves, materials and labour
                            </Link>{" "}
                            first.
                          </p>
                        ) : (
                          <Button onClick={() => setBomDialog({ mode: "new" })}>
                            + Add your first component
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r) => {
                    const cost = Number(r.qty_per_m2) * Number(r.components?.cost_per_unit ?? 0);
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.components?.name ?? "—"}</TableCell>
                        <TableCell>
                          {r.components ? (
                            <Badge variant="secondary">{KIND_LABEL[r.components.kind]}</Badge>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {!r.sections || r.sections.length === 0 ? (
                              <Badge variant="outline">All sections</Badge>
                            ) : (
                              r.sections.map((s) => (
                                <Badge key={s} variant="outline">
                                  {sectionLabel(s)}
                                </Badge>
                              ))
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular">
                          {Number(r.qty_per_m2).toFixed(4)}
                          {r.components?.kind === "labour" && r.components.time_minutes_per_unit ? (
                            <div className="text-[10px] font-normal text-muted-foreground">
                              {(Number(r.qty_per_m2) * Number(r.components.time_minutes_per_unit)).toFixed(2)} min/m²
                            </div>
                          ) : null}
                        </TableCell>
                        <TableCell>{r.components?.unit ?? "—"}</TableCell>
                        <TableCell className="text-right tabular">
                          £{Number(r.components?.cost_per_unit ?? 0).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right tabular">£{cost.toFixed(2)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {r.components?.manufacturing_stage ?? "—"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setBomDialog({ mode: "edit", row: r })}
                            >
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                if (confirm("Remove this component?")) removeBomM.mutate(r.id);
                              }}
                            >
                              ×
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">
                Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">
                  Base £/m²
                </div>
                <div className="mt-1 text-2xl font-semibold tabular">£{baseCost.toFixed(2)}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Sectionless components only.
                </div>
              </div>

              {sectionBreakdown.length > 0 && (
                <div>
                  <div className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">
                    Section-specific £/m²
                  </div>
                  <div className="space-y-3">
                    {sectionBreakdown.map(([key, items]) => {
                      const total = items.reduce((s, i) => s + i.cost, 0);
                      return (
                        <div key={key} className="rounded border border-border p-2">
                          <div className="flex items-center justify-between text-sm font-medium">
                            <span>{sectionLabel(key)}</span>
                            <span className="tabular">£{total.toFixed(2)}/m²</span>
                          </div>
                          <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                            {items.map((i, idx) => (
                              <li key={idx} className="flex justify-between">
                                <span>{i.component}</span>
                                <span className="tabular">£{i.cost.toFixed(2)}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">
                Reference total cost
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Reference: 50×30m at 18° pitch with all sections lined
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-[10px] uppercase text-muted-foreground">Total cost</div>
                  <div className="tabular text-lg font-semibold">£{reference.jc.totalCost.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-muted-foreground">Total m²</div>
                  <div className="tabular text-lg font-semibold">{reference.result.totalM2.toFixed(1)}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-muted-foreground">£/m²</div>
                  <div className="tabular text-lg font-semibold">
                    £{reference.result.totalM2 > 0 ? (reference.jc.totalCost / reference.result.totalM2).toFixed(2) : "—"}
                  </div>
                </div>
              </div>

              {reference.jc.lines.filter((l) => l.componentKind !== "labour").length > 0 && (
                <div>
                  <div className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">Materials</div>
                  <ul className="space-y-0.5 text-xs">
                    {reference.jc.lines
                      .filter((l) => l.componentKind !== "labour")
                      .map((l) => (
                        <li key={l.componentId + (l.sections?.join(",") ?? "")} className="flex justify-between gap-2">
                          <span className="truncate">{l.componentName}</span>
                          <span className="tabular text-muted-foreground whitespace-nowrap">
                            {l.m2.toFixed(1)}m² · {l.qty.toFixed(2)} {l.unit} · £{l.cost.toFixed(2)}
                          </span>
                        </li>
                      ))}
                  </ul>
                </div>
              )}

              {reference.jc.lines.filter((l) => l.componentKind === "labour").length > 0 && (
                <div>
                  <div className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">Labour</div>
                  <ul className="space-y-0.5 text-xs">
                    {reference.jc.lines
                      .filter((l) => l.componentKind === "labour")
                      .map((l) => (
                        <li key={l.componentId + (l.sections?.join(",") ?? "")} className="flex justify-between gap-2">
                          <span className="truncate">{l.componentName}</span>
                          <span className="tabular text-muted-foreground whitespace-nowrap">
                            {l.m2.toFixed(1)}m² · {l.qty.toFixed(2)} {l.unit} · {l.minutes.toFixed(0)}min · £{l.cost.toFixed(2)}
                          </span>
                        </li>
                      ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={editVariantOpen} onOpenChange={setEditVariantOpen}>
        {editVariantOpen && (
          <EditVariantDialog
            variant={variant}
            onSave={(v) => updateVariantM.mutate(v)}
            pending={updateVariantM.isPending}
          />
        )}
      </Dialog>

      <Dialog open={!!bomDialog} onOpenChange={(o) => !o && setBomDialog(null)}>
        {bomDialog && (
          <BomDialog
            mode={bomDialog.mode}
            row={bomDialog.mode === "edit" ? bomDialog.row : null}
            components={componentsQ.data ?? []}
            defaultPanelM2={defaultPanelM2}
            onSubmit={(payload) => upsertBomM.mutate(payload)}
            pending={upsertBomM.isPending}
          />
        )}
      </Dialog>
    </div>
  );
}

function EditVariantDialog({
  variant,
  onSave,
  pending,
}: {
  variant: Variant;
  onSave: (v: Variant) => void;
  pending: boolean;
}) {
  const [v, setV] = useState<Variant>(variant);
  return (
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>Edit variant</DialogTitle>
      </DialogHeader>
      <div className="grid gap-4">
        <div className="grid gap-1.5">
          <Label>Name *</Label>
          <Input value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />
        </div>
        <div className="grid gap-1.5">
          <Label>Description</Label>
          <Input
            value={v.description ?? ""}
            onChange={(e) => setV({ ...v, description: e.target.value || null })}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-1.5">
            <Label>Panel width (m)</Label>
            <Input
              type="number"
              step="0.1"
              value={v.default_panel_width ?? ""}
              onChange={(e) =>
                setV({ ...v, default_panel_width: e.target.value === "" ? null : Number(e.target.value) })
              }
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Panel height (m)</Label>
            <Input
              type="number"
              step="0.1"
              value={v.default_panel_height ?? ""}
              onChange={(e) =>
                setV({ ...v, default_panel_height: e.target.value === "" ? null : Number(e.target.value) })
              }
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={v.active} onCheckedChange={(active) => setV({ ...v, active })} />
          <Label>Active</Label>
        </div>
        <div className="grid gap-1.5">
          <Label>Notes</Label>
          <Textarea
            rows={3}
            value={v.notes ?? ""}
            onChange={(e) => setV({ ...v, notes: e.target.value || null })}
          />
        </div>
      </div>
      <DialogFooter>
        <Button onClick={() => onSave(v)} disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function BomDialog({
  mode,
  row,
  components,
  defaultPanelM2,
  onSubmit,
  pending,
}: {
  mode: "new" | "edit";
  row: BomRow | null;
  components: Component[];
  defaultPanelM2: number;
  onSubmit: (p: {
    id?: string;
    component_id: string;
    qty_per_m2: number;
    panel_m2: number | null;
    sections: string[] | null;
    sort_order: number;
    notes: string | null;
  }) => void;
  pending: boolean;
}) {
  const initialPanelM2 = row?.panel_m2 != null ? Number(row.panel_m2) : defaultPanelM2 || 0;
  const initialQtyM2 = row ? Number(row.qty_per_m2) : 0;
  const initialQtyPanel = initialQtyM2 * (initialPanelM2 || 0);

  const [componentId, setComponentId] = useState<string>(row?.component_id ?? "");
  const [qtyM2, setQtyM2] = useState<string>(row ? String(initialQtyM2) : "0");
  const [qtyPanel, setQtyPanel] = useState<string>(row ? String(initialQtyPanel) : "0");
  const [panelM2, setPanelM2] = useState<string>(String(initialPanelM2));
  const [allSections, setAllSections] = useState<boolean>(!row || !row.sections || row.sections.length === 0);
  const [sections, setSections] = useState<SectionKey[]>(
    (row?.sections ?? []).filter((s): s is SectionKey =>
      SECTION_KEYS.some((k) => k.key === s),
    ),
  );
  const [sortOrder, setSortOrder] = useState<string>(String(row?.sort_order ?? 0));
  const [notes, setNotes] = useState<string>(row?.notes ?? "");

  // Auto-pick default sort order on new
  useEffect(() => {
    if (mode === "new" && !row) setSortOrder(String(0));
  }, [mode, row]);

  const grouped = useMemo(() => {
    return {
      sleeve: components.filter((c) => c.kind === "sleeve"),
      material: components.filter((c) => c.kind === "material"),
      labour: components.filter((c) => c.kind === "labour"),
    };
  }, [components]);

  const selected = components.find((c) => c.id === componentId);
  const liveCost = Number(qtyM2) * Number(selected?.cost_per_unit ?? 0);

  const onQtyPanelChange = (v: string) => {
    setQtyPanel(v);
    const p = Number(panelM2);
    if (p > 0) setQtyM2(String(Number(v) / p));
  };
  const onQtyM2Change = (v: string) => {
    setQtyM2(v);
    const p = Number(panelM2);
    setQtyPanel(String(Number(v) * p));
  };
  const onPanelM2Change = (v: string) => {
    setPanelM2(v);
    const p = Number(v);
    setQtyPanel(String(Number(qtyM2) * p));
  };

  const toggleSection = (k: SectionKey, on: boolean) => {
    setAllSections(false);
    setSections((prev) => (on ? [...prev, k] : prev.filter((s) => s !== k)));
  };

  const submit = () => {
    if (!componentId) {
      toast.error("Select a component");
      return;
    }
    onSubmit({
      id: row?.id,
      component_id: componentId,
      qty_per_m2: Number(qtyM2) || 0,
      panel_m2: Number(panelM2) || null,
      sections: allSections || sections.length === 0 ? null : sections,
      sort_order: Number(sortOrder) || 0,
      notes: notes.trim() || null,
    });
  };

  return (
    <DialogContent className="sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle>{mode === "new" ? "Add component" : "Edit component"}</DialogTitle>
      </DialogHeader>
      <div className="grid gap-4">
        <div className="grid gap-1.5">
          <Label>Component *</Label>
          <Select value={componentId} onValueChange={setComponentId}>
            <SelectTrigger>
              <SelectValue placeholder="Select component" />
            </SelectTrigger>
            <SelectContent>
              {(["sleeve", "material", "labour"] as const).map((kind) =>
                grouped[kind].length > 0 ? (
                  <SelectGroup key={kind}>
                    <SelectLabel>{KIND_LABEL[kind]}</SelectLabel>
                    {grouped[kind].map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} — £{Number(c.cost_per_unit).toFixed(2)}/{c.unit}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ) : null,
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-1.5">
            <Label>Qty per panel</Label>
            <Input
              type="number"
              step="0.0001"
              value={qtyPanel}
              onChange={(e) => onQtyPanelChange(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Qty per m²</Label>
            <Input
              type="number"
              step="0.0001"
              value={qtyM2}
              onChange={(e) => onQtyM2Change(e.target.value)}
            />
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label className="text-xs text-muted-foreground">Panel m² (denominator)</Label>
          <Input
            type="number"
            step="0.01"
            value={panelM2}
            onChange={(e) => onPanelM2Change(e.target.value)}
            className="w-32"
          />
        </div>

        <div className="grid gap-1.5">
          <Label>Sections this applies to</Label>
          <div className="flex items-center gap-2 rounded border border-border p-2">
            <Checkbox
              id="all-sec"
              checked={allSections}
              onCheckedChange={(c) => {
                const on = c === true;
                setAllSections(on);
                if (on) setSections([]);
              }}
            />
            <Label htmlFor="all-sec" className="font-medium">All sections</Label>
          </div>
          <div className="grid grid-cols-3 gap-2 rounded border border-border p-2">
            {SECTION_KEYS.map((s) => (
              <label key={s.key} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={sections.includes(s.key)}
                  onCheckedChange={(c) => toggleSection(s.key, c === true)}
                  disabled={allSections}
                />
                {s.label}
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-1.5">
            <Label>Sort order</Label>
            <Input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
            />
          </div>
          <div className="flex flex-col justify-end">
            <div className="rounded bg-muted px-3 py-2 text-sm">
              Cost contribution:{" "}
              <span className="font-semibold tabular">£{liveCost.toFixed(2)}/m²</span>
            </div>
          </div>
        </div>

        <div className="grid gap-1.5">
          <Label>Notes</Label>
          <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>
      <DialogFooter>
        <Button onClick={submit} disabled={pending}>
          {pending ? "Saving…" : mode === "new" ? "Add" : "Save"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
