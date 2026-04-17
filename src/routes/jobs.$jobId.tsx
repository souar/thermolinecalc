import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CalculatorPanel } from "@/components/CalculatorPanel";
import { CalcInput, DEFAULT_INPUT, calculate } from "@/lib/calculator";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ExternalLink, Save } from "lucide-react";
import { getUsername } from "@/lib/username";
import { toast } from "sonner";

export const Route = createFileRoute("/jobs/$jobId")({
  component: JobPage,
});

function JobPage() {
  const { jobId } = Route.useParams();
  const qc = useQueryClient();

  const jobQ = useQuery({
    queryKey: ["job", jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("*, customers(id, name), marquee_specs(*, lining_results(*))")
        .eq("id", jobId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const pricingQ = useQuery({
    queryKey: ["pricing"],
    queryFn: async () => {
      const { data, error } = await supabase.from("lining_pricing").select("*");
      if (error) throw error;
      return data ?? [];
    },
  });

  const [input, setInput] = useState<CalcInput>(DEFAULT_INPUT);

  // Hydrate from latest spec on load
  useEffect(() => {
    if (!jobQ.data) return;
    const specs = (jobQ.data.marquee_specs ?? []) as any[];
    if (specs.length === 0) return;
    const latest = specs.sort((a, b) => (a.created_at < b.created_at ? 1 : -1))[0];
    setInput({
      length: Number(latest.length),
      width: Number(latest.width),
      eaveHeight: Number(latest.eave_height),
      pitchDeg: Number(latest.pitch_deg),
      baySize: Number(latest.bay_size),
      liningType: latest.lining_type,
      roofOverhangEnabled: latest.roof_overhang_enabled,
      wallFloorSealEnabled: latest.wall_floor_seal_enabled,
      apexOverride: latest.apex_override,
    });
  }, [jobQ.data]);

  const linePrice = pricingQ.data?.find((p) => p.lining_type === input.liningType);

  const saveSpec = useMutation({
    mutationFn: async () => {
      const result = calculate({
        ...input,
        costPerM2: linePrice?.cost_per_m2 ?? 0,
        weightPerM2: linePrice?.weight_per_m2 ?? 0,
        panelW: linePrice?.panel_width != null ? Number(linePrice.panel_width) : undefined,
        panelH: linePrice?.panel_height != null ? Number(linePrice.panel_height) : undefined,
      });
      const { data: spec, error } = await supabase
        .from("marquee_specs")
        .insert({
          job_id: jobId,
          length: input.length,
          width: input.width,
          eave_height: input.eaveHeight,
          pitch_deg: input.pitchDeg,
          bay_size: input.baySize,
          lining_type: input.liningType,
          roof_overhang_enabled: input.roofOverhangEnabled,
          wall_floor_seal_enabled: input.wallFloorSealEnabled,
          apex_override: input.apexOverride,
          created_by: getUsername(),
        })
        .select()
        .single();
      if (error) throw error;
      const { error: rErr } = await supabase.from("lining_results").insert({
        spec_id: spec.id,
        walls_m2: result.wallsM2,
        roof_m2: result.roofM2,
        gables_m2: result.gableWallsM2 + result.gableTriM2,
        total_m2: result.totalM2,
        walls_panels: result.wallsPanels + (result.customWallInfill?.panelsCount ?? 0),
        roof_panels: result.roofPanels + result.apexPieces,
        gable_panels: result.gableWallsPanels + result.gableTriCount,
        apex_width: result.apexWidth,
        total_weight_kg: result.totalWeightKg,
        total_cost: result.totalCost,
        breakdown_json: result as any,
      });
      if (rErr) throw rErr;
      // bump job updated_at
      await supabase.from("jobs").update({ updated_at: new Date().toISOString() }).eq("id", jobId);
    },
    onSuccess: () => {
      toast.success("Revision saved");
      qc.invalidateQueries({ queryKey: ["job", jobId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Save failed"),
  });

  const job = jobQ.data;
  const revisions = (job?.marquee_specs ?? []) as any[];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          {job?.customers && (
            <Link to="/customers/$customerId" params={{ customerId: job.customers.id }} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" /> {job.customers.name}
            </Link>
          )}
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{job?.name ?? "…"}</h1>
          {job?.reference && (
            <div className="mt-1 text-sm">
              {job.reference_url ? (
                <a href={job.reference_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                  {job.reference} <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                <span className="text-muted-foreground">{job.reference}</span>
              )}
            </div>
          )}
        </div>
        <Button onClick={() => saveSpec.mutate()} disabled={saveSpec.isPending}>
          <Save className="mr-1 h-4 w-4" /> {saveSpec.isPending ? "Saving…" : "Save revision"}
        </Button>
      </div>

      <CalculatorPanel
        value={input}
        onChange={setInput}
        pricing={
          linePrice
            ? {
                cost_per_m2: Number(linePrice.cost_per_m2),
                weight_per_m2: linePrice.weight_per_m2 != null ? Number(linePrice.weight_per_m2) : null,
                panel_width: Number(linePrice.panel_width),
                panel_height: Number(linePrice.panel_height),
              }
            : null
        }
        pricingAll={pricingQ.data ?? []}
      />

      {revisions.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Revision history</h2>
          <div className="space-y-2">
            {revisions
              .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
              .map((s) => {
                const r = (s.lining_results ?? [])[0];
                return (
                  <div key={s.id} className="flex items-center justify-between rounded border border-border bg-card px-3 py-2 text-sm">
                    <div>
                      <div className="tabular">{Number(s.length)}×{Number(s.width)}m, {s.lining_type}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(s.created_at).toLocaleString()} {s.created_by && `· ${s.created_by}`}
                      </div>
                    </div>
                    {r && (
                      <div className="tabular text-right text-xs text-muted-foreground">
                        <div>{Number(r.total_m2).toFixed(1)} m² · {r.walls_panels + r.roof_panels + r.gable_panels} panels</div>
                        <div>{Number(r.total_weight_kg ?? 0).toFixed(1)} kg · {Number(r.total_cost ?? 0).toFixed(2)}</div>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
