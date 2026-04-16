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

type Edit = { cost: string; weight: string; width: string; height: string };

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

  const [edits, setEdits] = useState<Record<string, Edit>>({});

  useEffect(() => {
    if (pricingQ.data) {
      const next: Record<string, Edit> = {};
      pricingQ.data.forEach((p) => {
        next[p.id] = {
          cost: String(p.cost_per_m2 ?? ""),
          weight: String(p.weight_per_m2 ?? ""),
          width: String(p.panel_width ?? ""),
          height: String(p.panel_height ?? ""),
        };
      });
      setEdits(next);
    }
  }, [pricingQ.data]);

  const save = useMutation({
    mutationFn: async ({
      id,
      cost,
      weight,
      width,
      height,
    }: {
      id: string;
      cost: number;
      weight: number | null;
      width: number;
      height: number;
    }) => {
      if (!(width > 0) || !(height > 0)) throw new Error("Panel width and height must be greater than 0");
      const { error } = await supabase
        .from("lining_pricing")
        .update({
          cost_per_m2: cost,
          weight_per_m2: weight,
          panel_width: width,
          panel_height: height,
          updated_by: getUsername(),
        })
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
          Shared price book for each lining type. Panel width × height feed directly into the calculator. Component and labour cost columns are reserved for future breakdowns.
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Price book</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lining type</TableHead>
                <TableHead className="text-right">Panel width (m)</TableHead>
                <TableHead className="text-right">Panel height (m)</TableHead>
                <TableHead className="text-right">Cost / m²</TableHead>
                <TableHead className="text-right">Weight kg/m²</TableHead>
                <TableHead className="text-right">Component cost</TableHead>
                <TableHead className="text-right">Labour / panel</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pricingQ.data?.map((p) => {
                const e = edits[p.id] ?? { cost: "", weight: "", width: "", height: "" };
                const widthNum = Number(e.width);
                const heightNum = Number(e.height);
                const dimsValid = widthNum > 0 && heightNum > 0;
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.lining_type}</TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        step="0.1"
                        min="0.1"
                        value={e.width}
                        onChange={(ev) => setEdits({ ...edits, [p.id]: { ...e, width: ev.target.value } })}
                        className={`w-20 text-right tabular ${widthNum > 0 ? "" : "border-destructive"}`}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        step="0.1"
                        min="0.1"
                        value={e.height}
                        onChange={(ev) => setEdits({ ...edits, [p.id]: { ...e, height: ev.target.value } })}
                        className={`w-20 text-right tabular ${heightNum > 0 ? "" : "border-destructive"}`}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Input type="number" step="0.01" value={e.cost} onChange={(ev) => setEdits({ ...edits, [p.id]: { ...e, cost: ev.target.value } })} className="w-28 text-right tabular" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Input type="number" step="0.01" value={e.weight} onChange={(ev) => setEdits({ ...edits, [p.id]: { ...e, weight: ev.target.value } })} className="w-24 text-right tabular" />
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground italic">soon</TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground italic">soon</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        onClick={() =>
                          save.mutate({
                            id: p.id,
                            cost: Number(e.cost) || 0,
                            weight: e.weight === "" ? null : Number(e.weight),
                            width: widthNum,
                            height: heightNum,
                          })
                        }
                        disabled={save.isPending || !dimsValid}
                      >
                        Save
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {pricingQ.isLoading && <p className="mt-4 text-sm text-muted-foreground">Loading…</p>}
        </CardContent>
      </Card>
    </div>
  );
}
