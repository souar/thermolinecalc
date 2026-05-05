import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useState, useEffect, Fragment } from "react";
import { getUsername } from "@/lib/username";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/components")({
  component: ComponentsPage,
});

type Kind = Database["public"]["Enums"]["component_kind"];
type ComponentRow = Database["public"]["Tables"]["components"]["Row"];
type Supplier = { id: string; name: string };
type Quote = Database["public"]["Tables"]["component_supplier_prices"]["Row"];

const STAGES = [
  "sleeve_order",
  "material_prep",
  "material_application",
  "welding",
  "trimming",
  "bagging",
] as const;

const UNIT_SUGGESTIONS = ["piece", "m2", "m", "roll", "hour", "panel"];

const KIND_LABELS: Record<Kind, string> = {
  sleeve: "Sleeves",
  material: "Materials",
  labour: "Labour",
};

const NONE = "__none__";

function ComponentsPage() {
  const [tab, setTab] = useState<Kind>("sleeve");

  const componentsQ = useQuery({
    queryKey: ["components"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("components")
        .select("*")
        .order("name");
      if (error) throw error;
      return (data ?? []) as ComponentRow[];
    },
  });

  const suppliersQ = useQuery({
    queryKey: ["suppliers", { active: true }],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("suppliers")
        .select("id,name")
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return (data ?? []) as Supplier[];
    },
  });

  const supplierName = (id: string | null) =>
    suppliersQ.data?.find((s) => s.id === id)?.name ?? "—";

  const allRows = componentsQ.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Components</h1>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as Kind)}>
        <TabsList>
          {(Object.keys(KIND_LABELS) as Kind[]).map((k) => (
            <TabsTrigger key={k} value={k}>
              {KIND_LABELS[k]}
            </TabsTrigger>
          ))}
        </TabsList>

        {(Object.keys(KIND_LABELS) as Kind[]).map((k) => (
          <TabsContent key={k} value={k} className="space-y-4">
            <KindTable
              kind={k}
              rows={allRows.filter((r) => r.kind === k)}
              suppliers={suppliersQ.data ?? []}
              supplierName={supplierName}
              loading={componentsQ.isLoading}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function KindTable({
  kind,
  rows,
  suppliers,
  supplierName,
  loading,
}: {
  kind: Kind;
  rows: ComponentRow[];
  suppliers: Supplier[];
  supplierName: (id: string | null) => string;
  loading: boolean;
}) {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<ComponentRow | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase
        .from("components")
        .update({ active, updated_by: getUsername() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["components"] }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const extraHeads =
    kind === "sleeve"
      ? ["Panel W", "Panel H", "Weight kg/m²"]
      : kind === "material"
        ? ["m²/unit", "Weight kg/m²"]
        : ["Stage", "Min/unit"];

  const colSpan = 8 + extraHeads.length;

  return (
    <>
      <div className="flex justify-end">
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>+ New {KIND_LABELS[kind].toLowerCase().replace(/s$/, "")}</Button>
          </DialogTrigger>
          <ComponentDialog
            mode="create"
            kind={kind}
            suppliers={suppliers}
            onClose={() => setCreateOpen(false)}
          />
        </Dialog>
      </div>

      <div className="rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8"></TableHead>
              <TableHead>Name</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead>Cost/unit</TableHead>
              <TableHead>Cost/m²</TableHead>
              <TableHead>Supplier</TableHead>
              {extraHeads.map((h) => (
                <TableHead key={h}>{h}</TableHead>
              ))}
              <TableHead>Active</TableHead>
              <TableHead className="w-20"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={colSpan} className="text-center text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={colSpan} className="text-center text-muted-foreground">
                  No {KIND_LABELS[kind].toLowerCase()} yet.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((c) => {
                const costM2 =
                  c.m2_per_unit && Number(c.m2_per_unit) > 0
                    ? `£${(Number(c.cost_per_unit) / Number(c.m2_per_unit)).toFixed(2)}`
                    : "—";
                const isOpen = expanded === c.id;
                return (
                  <Fragment key={c.id}>
                    <TableRow>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={() => setExpanded(isOpen ? null : c.id)}
                          aria-label="Toggle alternative suppliers"
                        >
                          {isOpen ? "▾" : "▸"}
                        </Button>
                      </TableCell>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell>{c.sku ?? "—"}</TableCell>
                      <TableCell>{c.unit}</TableCell>
                      <TableCell>£{Number(c.cost_per_unit).toFixed(2)}</TableCell>
                      <TableCell>{costM2}</TableCell>
                      <TableCell>{supplierName(c.primary_supplier_id)}</TableCell>
                      {kind === "sleeve" && (
                        <>
                          <TableCell>{c.panel_width ?? "—"}</TableCell>
                          <TableCell>{c.panel_height ?? "—"}</TableCell>
                          <TableCell>{c.weight_per_m2 ?? "—"}</TableCell>
                        </>
                      )}
                      {kind === "material" && (
                        <>
                          <TableCell>{c.m2_per_unit ?? "—"}</TableCell>
                          <TableCell>{c.weight_per_m2 ?? "—"}</TableCell>
                        </>
                      )}
                      {kind === "labour" && (
                        <>
                          <TableCell>{c.manufacturing_stage ?? "—"}</TableCell>
                          <TableCell>{c.time_minutes_per_unit ?? "—"}</TableCell>
                        </>
                      )}
                      <TableCell>
                        <Switch
                          checked={c.active}
                          onCheckedChange={(v) =>
                            toggleActive.mutate({ id: c.id, active: v })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" onClick={() => setEditing(c)}>
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                    {isOpen && (
                      <TableRow>
                        <TableCell colSpan={colSpan} className="bg-muted/30">
                          <AlternativeSuppliers
                            componentId={c.id}
                            suppliers={suppliers}
                          />
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        {editing && (
          <ComponentDialog
            mode="edit"
            kind={kind}
            suppliers={suppliers}
            initial={editing}
            onClose={() => setEditing(null)}
          />
        )}
      </Dialog>
    </>
  );
}

type FormState = {
  name: string;
  sku: string;
  unit: string;
  cost_per_unit: string;
  m2_per_unit: string;
  weight_per_m2: string;
  primary_supplier_id: string;
  panel_width: string;
  panel_height: string;
  manufacturing_stage: string;
  time_minutes_per_unit: string;
  notes: string;
  active: boolean;
};

const emptyForm = (): FormState => ({
  name: "",
  sku: "",
  unit: "piece",
  cost_per_unit: "0",
  m2_per_unit: "",
  weight_per_m2: "",
  primary_supplier_id: "",
  panel_width: "",
  panel_height: "",
  manufacturing_stage: "",
  time_minutes_per_unit: "",
  notes: "",
  active: true,
});

function fromRow(r: ComponentRow): FormState {
  return {
    name: r.name,
    sku: r.sku ?? "",
    unit: r.unit,
    cost_per_unit: String(r.cost_per_unit ?? "0"),
    m2_per_unit: r.m2_per_unit != null ? String(r.m2_per_unit) : "",
    weight_per_m2: r.weight_per_m2 != null ? String(r.weight_per_m2) : "",
    primary_supplier_id: r.primary_supplier_id ?? "",
    panel_width: r.panel_width != null ? String(r.panel_width) : "",
    panel_height: r.panel_height != null ? String(r.panel_height) : "",
    manufacturing_stage: r.manufacturing_stage ?? "",
    time_minutes_per_unit:
      r.time_minutes_per_unit != null ? String(r.time_minutes_per_unit) : "",
    notes: r.notes ?? "",
    active: r.active,
  };
}

function numOrNull(v: string): number | null {
  const t = v.trim();
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function ComponentDialog({
  mode,
  kind,
  suppliers,
  initial,
  onClose,
}: {
  mode: "create" | "edit";
  kind: Kind;
  suppliers: Supplier[];
  initial?: ComponentRow;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState<FormState>(initial ? fromRow(initial) : emptyForm());

  useEffect(() => {
    if (initial) setForm(fromRow(initial));
  }, [initial]);

  const upd = (k: keyof FormState) => (v: string | boolean) =>
    setForm({ ...form, [k]: v } as FormState);

  const save = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("Name is required");
      if (!form.unit.trim()) throw new Error("Unit is required");
      if (kind === "labour" && !form.manufacturing_stage)
        throw new Error("Manufacturing stage is required for labour");

      const payload = {
        kind,
        name: form.name.trim(),
        sku: form.sku.trim() || null,
        unit: form.unit.trim(),
        cost_per_unit: Number(form.cost_per_unit) || 0,
        m2_per_unit: kind === "labour" ? null : numOrNull(form.m2_per_unit),
        weight_per_m2: kind === "labour" ? null : numOrNull(form.weight_per_m2),
        primary_supplier_id:
          kind === "labour" ? null : form.primary_supplier_id || null,
        panel_width: kind === "sleeve" ? numOrNull(form.panel_width) : null,
        panel_height: kind === "sleeve" ? numOrNull(form.panel_height) : null,
        manufacturing_stage: form.manufacturing_stage || null,
        time_minutes_per_unit:
          kind === "labour" ? numOrNull(form.time_minutes_per_unit) : null,
        notes: form.notes.trim() || null,
        active: form.active,
        updated_by: getUsername(),
      };

      if (mode === "create") {
        const { error } = await supabase
          .from("components")
          .insert({ ...payload, created_by: getUsername() });
        if (error) throw error;
      } else if (initial) {
        const { error } = await supabase
          .from("components")
          .update(payload)
          .eq("id", initial.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["components"] });
      onClose();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const costM2 = (() => {
    const c = Number(form.cost_per_unit);
    const m = Number(form.m2_per_unit);
    if (!Number.isFinite(c) || !Number.isFinite(m) || !(m > 0)) return null;
    return c / m;
  })();

  const showSupplyFields = kind !== "labour";
  const showPanelFields = kind === "sleeve";
  const showLabourFields = kind === "labour";

  return (
    <DialogContent className="sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle>
          {mode === "create" ? "New" : "Edit"}{" "}
          {KIND_LABELS[kind].toLowerCase().replace(/s$/, "")}
        </DialogTitle>
      </DialogHeader>
      <div className="grid gap-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Name *" id="cmp-name">
            <Input
              id="cmp-name"
              value={form.name}
              onChange={(e) => upd("name")(e.target.value)}
            />
          </Field>
          <Field label="SKU" id="cmp-sku">
            <Input
              id="cmp-sku"
              value={form.sku}
              onChange={(e) => upd("sku")(e.target.value)}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Unit *" id="cmp-unit">
            <Input
              id="cmp-unit"
              list="unit-suggestions"
              value={form.unit}
              onChange={(e) => upd("unit")(e.target.value)}
            />
            <datalist id="unit-suggestions">
              {UNIT_SUGGESTIONS.map((u) => (
                <option key={u} value={u} />
              ))}
            </datalist>
          </Field>
          <Field label="Cost / unit (£)" id="cmp-cost">
            <Input
              id="cmp-cost"
              type="number"
              step="0.01"
              value={form.cost_per_unit}
              onChange={(e) => upd("cost_per_unit")(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              {costM2 != null ? `Cost per m²: £${costM2.toFixed(2)}` : "Cost per m²: —"}
            </p>
          </Field>
        </div>

        {showSupplyFields && (
          <div className="grid grid-cols-2 gap-4">
            <Field label="m² / unit" id="cmp-m2">
              <Input
                id="cmp-m2"
                type="number"
                step="0.001"
                value={form.m2_per_unit}
                onChange={(e) => upd("m2_per_unit")(e.target.value)}
              />
            </Field>
            <Field label="Weight kg/m²" id="cmp-w">
              <Input
                id="cmp-w"
                type="number"
                step="0.01"
                value={form.weight_per_m2}
                onChange={(e) => upd("weight_per_m2")(e.target.value)}
              />
            </Field>
          </div>
        )}

        {showPanelFields && (
          <div className="grid grid-cols-2 gap-4">
            <Field label="Panel width (m)" id="cmp-pw">
              <Input
                id="cmp-pw"
                type="number"
                step="0.01"
                value={form.panel_width}
                onChange={(e) => upd("panel_width")(e.target.value)}
              />
            </Field>
            <Field label="Panel height (m)" id="cmp-ph">
              <Input
                id="cmp-ph"
                type="number"
                step="0.01"
                value={form.panel_height}
                onChange={(e) => upd("panel_height")(e.target.value)}
              />
            </Field>
          </div>
        )}

        {showLabourFields && (
          <Field label="Minutes / unit" id="cmp-min">
            <Input
              id="cmp-min"
              type="number"
              step="0.1"
              value={form.time_minutes_per_unit}
              onChange={(e) => upd("time_minutes_per_unit")(e.target.value)}
            />
          </Field>
        )}

        <div className="grid grid-cols-2 gap-4">
          {showSupplyFields && (
            <Field label="Primary supplier">
              <Select
                value={form.primary_supplier_id || NONE}
                onValueChange={(v) =>
                  upd("primary_supplier_id")(v === NONE ? "" : v)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>—</SelectItem>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
          <Field label={`Manufacturing stage${kind === "labour" ? " *" : ""}`}>
            <Select
              value={form.manufacturing_stage || NONE}
              onValueChange={(v) =>
                upd("manufacturing_stage")(v === NONE ? "" : v)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>—</SelectItem>
                {STAGES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <Field label="Notes" id="cmp-notes">
          <Textarea
            id="cmp-notes"
            rows={2}
            value={form.notes}
            onChange={(e) => upd("notes")(e.target.value)}
          />
        </Field>

        <label className="flex items-center gap-2 text-sm">
          <Switch
            checked={form.active}
            onCheckedChange={(v) => upd("active")(v)}
          />
          Active
        </label>
      </div>
      <DialogFooter>
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? "Saving…" : "Save"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function Field({
  label,
  id,
  children,
}: {
  label: string;
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

// ---------- Alternative supplier quotes ----------

type QuoteDraft = {
  supplier_id: string;
  cost_per_unit: string;
  lead_time_days: string;
  is_preferred: boolean;
  notes: string;
};

function AlternativeSuppliers({
  componentId,
  suppliers,
}: {
  componentId: string;
  suppliers: Supplier[];
}) {
  const qc = useQueryClient();
  const quotesQ = useQuery({
    queryKey: ["component_supplier_prices", componentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("component_supplier_prices")
        .select("*")
        .eq("component_id", componentId);
      if (error) throw error;
      return (data ?? []) as Quote[];
    },
  });

  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [draft, setDraft] = useState<QuoteDraft>({
    supplier_id: "",
    cost_per_unit: "0",
    lead_time_days: "",
    is_preferred: false,
    notes: "",
  });

  const startNew = () => {
    setDraft({
      supplier_id: "",
      cost_per_unit: "0",
      lead_time_days: "",
      is_preferred: false,
      notes: "",
    });
    setEditingId("new");
  };

  const startEdit = (q: Quote) => {
    setDraft({
      supplier_id: q.supplier_id,
      cost_per_unit: String(q.cost_per_unit),
      lead_time_days: q.lead_time_days != null ? String(q.lead_time_days) : "",
      is_preferred: q.is_preferred ?? false,
      notes: q.notes ?? "",
    });
    setEditingId(q.id);
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!draft.supplier_id) throw new Error("Pick a supplier");
      const payload = {
        component_id: componentId,
        supplier_id: draft.supplier_id,
        cost_per_unit: Number(draft.cost_per_unit) || 0,
        lead_time_days:
          draft.lead_time_days.trim() === "" ? null : Number(draft.lead_time_days),
        is_preferred: draft.is_preferred,
        notes: draft.notes.trim() || null,
      };
      if (editingId === "new") {
        const { error } = await supabase
          .from("component_supplier_prices")
          .insert(payload);
        if (error) throw error;
      } else if (editingId) {
        const { error } = await supabase
          .from("component_supplier_prices")
          .update(payload)
          .eq("id", editingId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["component_supplier_prices", componentId] });
      setEditingId(null);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("component_supplier_prices")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["component_supplier_prices", componentId] }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const supplierName = (id: string) =>
    suppliers.find((s) => s.id === id)?.name ?? id;

  return (
    <div className="space-y-3 py-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Alternative supplier quotes</h4>
        {editingId === null && (
          <Button size="sm" variant="outline" onClick={startNew}>
            + Add quote
          </Button>
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Supplier</TableHead>
            <TableHead>Cost/unit</TableHead>
            <TableHead>Lead time (days)</TableHead>
            <TableHead>Preferred</TableHead>
            <TableHead>Notes</TableHead>
            <TableHead className="w-32"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {quotesQ.isLoading ? (
            <TableRow>
              <TableCell colSpan={6} className="text-muted-foreground">
                Loading…
              </TableCell>
            </TableRow>
          ) : (quotesQ.data ?? []).length === 0 && editingId !== "new" ? (
            <TableRow>
              <TableCell colSpan={6} className="text-muted-foreground">
                No alternative quotes yet.
              </TableCell>
            </TableRow>
          ) : (
            (quotesQ.data ?? []).map((q) =>
              editingId === q.id ? (
                <QuoteEditRow
                  key={q.id}
                  draft={draft}
                  setDraft={setDraft}
                  suppliers={suppliers}
                  onSave={() => save.mutate()}
                  onCancel={() => setEditingId(null)}
                  pending={save.isPending}
                />
              ) : (
                <TableRow key={q.id}>
                  <TableCell>{supplierName(q.supplier_id)}</TableCell>
                  <TableCell>£{Number(q.cost_per_unit).toFixed(2)}</TableCell>
                  <TableCell>{q.lead_time_days ?? "—"}</TableCell>
                  <TableCell>{q.is_preferred ? "Yes" : "—"}</TableCell>
                  <TableCell className="max-w-xs truncate">{q.notes ?? "—"}</TableCell>
                  <TableCell className="space-x-1">
                    <Button size="sm" variant="ghost" onClick={() => startEdit(q)}>
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => del.mutate(q.id)}
                    >
                      ✕
                    </Button>
                  </TableCell>
                </TableRow>
              )
            )
          )}
          {editingId === "new" && (
            <QuoteEditRow
              draft={draft}
              setDraft={setDraft}
              suppliers={suppliers}
              onSave={() => save.mutate()}
              onCancel={() => setEditingId(null)}
              pending={save.isPending}
            />
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function QuoteEditRow({
  draft,
  setDraft,
  suppliers,
  onSave,
  onCancel,
  pending,
}: {
  draft: QuoteDraft;
  setDraft: (d: QuoteDraft) => void;
  suppliers: Supplier[];
  onSave: () => void;
  onCancel: () => void;
  pending: boolean;
}) {
  return (
    <TableRow>
      <TableCell>
        <Select
          value={draft.supplier_id || NONE}
          onValueChange={(v) =>
            setDraft({ ...draft, supplier_id: v === NONE ? "" : v })
          }
        >
          <SelectTrigger className="h-8">
            <SelectValue placeholder="Pick…" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>—</SelectItem>
            {suppliers.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <Input
          className="h-8"
          type="number"
          step="0.01"
          value={draft.cost_per_unit}
          onChange={(e) => setDraft({ ...draft, cost_per_unit: e.target.value })}
        />
      </TableCell>
      <TableCell>
        <Input
          className="h-8"
          type="number"
          value={draft.lead_time_days}
          onChange={(e) => setDraft({ ...draft, lead_time_days: e.target.value })}
        />
      </TableCell>
      <TableCell>
        <Switch
          checked={draft.is_preferred}
          onCheckedChange={(v) => setDraft({ ...draft, is_preferred: v })}
        />
      </TableCell>
      <TableCell>
        <Input
          className="h-8"
          value={draft.notes}
          onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
        />
      </TableCell>
      <TableCell className="space-x-1">
        <Button size="sm" onClick={onSave} disabled={pending}>
          {pending ? "…" : "Save"}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </TableCell>
    </TableRow>
  );
}
