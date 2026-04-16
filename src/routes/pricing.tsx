import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState, useEffect } from "react";
import { getUsername } from "@/lib/username";
import { toast } from "sonner";

export const Route = createFileRoute("/pricing")({
  component: PricingPage,
});

function PricingPage() {
  const qc = useQueryClient();
  const pricingQ = useQuery({
    queryKey: ["pricing"],
    queryFn: async () => {
      const { data, error } = await supabase.from("lining_pricing").select("*").order("lining_type");
      if (error) throw error;
      return data ?? [];
    },
  });

  const [edits, setEdits] = useState<Record<string, { cost: string; weight: string }>>({});

  useEffect(() => {
    if (pricingQ.data) {
      const next: typeof edits = {};
      pricingQ.data.forEach((p) => {
        next[p.id] = { cost: String(p.cost_per_m2 ?? ""), weight: String(p.weight_per_m2 ?? "") };
      });
      setEdits(next);
    }
  }, [pricingQ.data]);

  const save = useMutation({
    mutationFn: async ({ id, cost, weight }: { id: string; cost: number; weight: number | null }) => {
      const { error } = await supabase
        .from("lining_pricing")
        .update({ cost_per_m2: cost, weight_per_m2: weight, updated_by: getUsername() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["pricing"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Pricing</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Shared price book for each lining type & panel size. Component and labour cost columns are reserved for future breakdowns.
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Price book</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lining type</TableHead>
                <TableHead className="text-right">Panel (m)</TableHead>
                <TableHead className="text-right">Cost / m²</TableHead>
                <TableHead className="text-right">Weight kg/m²</TableHead>
                <TableHead className="text-right">Component cost</TableHead>
                <TableHead className="text-right">Labour / panel</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pricingQ.data?.map((p) => {
                const e = edits[p.id] ?? { cost: "", weight: "" };
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.lining_type}</TableCell>
                    <TableCell className="text-right tabular">{Number(p.panel_width)}×{Number(p.panel_height)}</TableCell>
                    <TableCell className="text-right">
                      <Input type="number" step="0.01" value={e.cost} onChange={(ev) => setEdits({ ...edits, [p.id]: { ...e, cost: ev.target.value } })} className="w-28 text-right tabular" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Input type="number" step="0.01" value={e.weight} onChange={(ev) => setEdits({ ...edits, [p.id]: { ...e, weight: ev.target.value } })} className="w-24 text-right tabular" />
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground italic">soon</TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground italic">soon</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" onClick={() => save.mutate({ id: p.id, cost: Number(e.cost) || 0, weight: e.weight === "" ? null : Number(e.weight) })} disabled={save.isPending}>
                        Save
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {p_loading(pricingQ.isLoading)}
        </CardContent>
      </Card>
    </div>
  );
}

function p_loading(loading: boolean) {
  return loading ? <p className="mt-4 text-sm text-muted-foreground">Loading…</p> : null;
}
