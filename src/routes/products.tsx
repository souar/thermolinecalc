import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import { useState } from "react";
import { getUsername } from "@/lib/username";
import { toast } from "sonner";

export const Route = createFileRoute("/products")({
  component: ProductsPage,
});

type VariantRow = {
  id: string;
  name: string;
  description: string | null;
  default_panel_width: number | null;
  default_panel_height: number | null;
  active: boolean;
  notes: string | null;
  lining_variant_components: {
    qty_per_m2: number;
    sections: string[] | null;
    components: { cost_per_unit: number } | null;
  }[];
};

type NewForm = {
  name: string;
  description: string;
  default_panel_width: string;
  default_panel_height: string;
  notes: string;
};

const emptyForm: NewForm = {
  name: "",
  description: "",
  default_panel_width: "5",
  default_panel_height: "5",
  notes: "",
};

function ProductsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);

  const variantsQ = useQuery({
    queryKey: ["lining_variants"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lining_variants")
        .select(
          "id,name,description,default_panel_width,default_panel_height,active,notes,lining_variant_components(qty_per_m2,sections,components(cost_per_unit))",
        )
        .order("name");
      if (error) throw error;
      return (data ?? []) as unknown as VariantRow[];
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase
        .from("lining_variants")
        .update({ active, updated_by: getUsername() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lining_variants"] }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const createM = useMutation({
    mutationFn: async (f: NewForm) => {
      if (!f.name.trim()) throw new Error("Name is required");
      const { data, error } = await supabase
        .from("lining_variants")
        .insert({
          name: f.name.trim(),
          description: f.description.trim() || null,
          default_panel_width: Number(f.default_panel_width) || null,
          default_panel_height: Number(f.default_panel_height) || null,
          notes: f.notes.trim() || null,
          created_by: getUsername(),
        })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: (id) => {
      toast.success("Variant created");
      qc.invalidateQueries({ queryKey: ["lining_variants"] });
      setCreateOpen(false);
      navigate({ to: "/products/$variantId", params: { variantId: id } });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const baseCost = (v: VariantRow) =>
    v.lining_variant_components
      .filter((b) => !b.sections || b.sections.length === 0)
      .reduce((s, b) => s + Number(b.qty_per_m2) * Number(b.components?.cost_per_unit ?? 0), 0);

  const sectionLineCount = (v: VariantRow) =>
    v.lining_variant_components.filter((b) => b.sections && b.sections.length > 0).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Products</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Lining variants and their bills of materials.
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>+ New variant</Button>
          </DialogTrigger>
          <CreateDialog onSubmit={(f) => createM.mutate(f)} pending={createM.isPending} />
        </Dialog>
      </div>

      <div className="rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Default panel</TableHead>
              <TableHead className="text-right">Base £/m²</TableHead>
              <TableHead className="text-right"># section lines</TableHead>
              <TableHead>Active</TableHead>
              <TableHead className="w-32"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {variantsQ.isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            ) : (variantsQ.data ?? []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No variants yet.
                </TableCell>
              </TableRow>
            ) : (
              (variantsQ.data ?? []).map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="font-medium">
                    <div>{v.name}</div>
                    {v.description && (
                      <div className="text-xs text-muted-foreground">{v.description}</div>
                    )}
                  </TableCell>
                  <TableCell className="tabular">
                    {v.default_panel_width ?? "—"} × {v.default_panel_height ?? "—"} m
                  </TableCell>
                  <TableCell className="text-right tabular">
                    £{baseCost(v).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right tabular">{sectionLineCount(v)}</TableCell>
                  <TableCell>
                    <Switch
                      checked={v.active}
                      onCheckedChange={(active) => toggleActive.mutate({ id: v.id, active })}
                    />
                  </TableCell>
                  <TableCell>
                    <Button asChild size="sm" variant="outline">
                      <Link to="/products/$variantId" params={{ variantId: v.id }}>
                        View / Edit
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function CreateDialog({
  onSubmit,
  pending,
}: {
  onSubmit: (f: NewForm) => void;
  pending: boolean;
}) {
  const [form, setForm] = useState<NewForm>(emptyForm);
  const upd = (k: keyof NewForm) => (v: string) => setForm({ ...form, [k]: v });
  return (
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>New variant</DialogTitle>
      </DialogHeader>
      <div className="grid gap-4">
        <div className="grid gap-1.5">
          <Label>Name *</Label>
          <Input value={form.name} onChange={(e) => upd("name")(e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label>Description</Label>
          <Input value={form.description} onChange={(e) => upd("description")(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-1.5">
            <Label>Default panel width (m)</Label>
            <Input
              type="number"
              step="0.1"
              value={form.default_panel_width}
              onChange={(e) => upd("default_panel_width")(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Default panel height (m)</Label>
            <Input
              type="number"
              step="0.1"
              value={form.default_panel_height}
              onChange={(e) => upd("default_panel_height")(e.target.value)}
            />
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label>Notes</Label>
          <Textarea rows={3} value={form.notes} onChange={(e) => upd("notes")(e.target.value)} />
        </div>
      </div>
      <DialogFooter>
        <Button onClick={() => onSubmit(form)} disabled={pending}>
          {pending ? "Creating…" : "Create"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
