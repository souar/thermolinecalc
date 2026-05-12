import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CalculatorPanel } from "@/components/CalculatorPanel";
import { CalcInput, DEFAULT_INPUT, DEFAULT_INSTALL_INPUT, InstallInput, calculate, calculateJobCosts } from "@/lib/calculator";
import { fetchVariantsWithBom, VARIANTS_QUERY_KEY, type VariantWithBom } from "@/lib/variantsQuery";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, ExternalLink, Save, Pencil } from "lucide-react";
import { getUsername } from "@/lib/username";
import { toast } from "sonner";

export const Route = createFileRoute("/jobs/$jobId")({
  component: JobPage,
});

function JobPage() {
  const { jobId } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();

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

  const variantsQ = useQuery({
    queryKey: VARIANTS_QUERY_KEY,
    queryFn: fetchVariantsWithBom,
  });

  const [input, setInput] = useState<CalcInput>(DEFAULT_INPUT);
  const [install, setInstall] = useState<InstallInput>(DEFAULT_INSTALL_INPUT);

  const installKey = `marquee.job.install.${jobId}`;
  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem(installKey);
    if (raw) {
      try { setInstall({ ...DEFAULT_INSTALL_INPUT, ...JSON.parse(raw) }); } catch { /* noop */ }
    }
  }, [installKey]);
  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem(installKey, JSON.stringify(install));
  }, [install, installKey]);

  // Hydrate from latest spec on load — look up variant by name
  useEffect(() => {
    if (!jobQ.data || !variantsQ.data) return;
    const specs = (jobQ.data.marquee_specs ?? []) as any[];
    if (specs.length === 0) return;
    const latest = specs.sort((a, b) => (a.created_at < b.created_at ? 1 : -1))[0];
    const matchedVariant: VariantWithBom | undefined = variantsQ.data.find(
      (v) => v.name === latest.lining_type,
    );
    setInput({
      length: Number(latest.length),
      width: Number(latest.width),
      eaveHeight: Number(latest.eave_height),
      pitchDeg: Number(latest.pitch_deg),
      baySize: Number(latest.bay_size),
      liningType: matchedVariant?.id ?? "",
      roofOverhangEnabled: latest.roof_overhang_enabled,
      wallFloorSealEnabled: latest.wall_floor_seal_enabled,
      apexOverride: latest.apex_override,
      lineRoof: latest.line_roof ?? true,
      lineWalls: latest.line_walls ?? true,
      lineGableWalls: latest.line_gable_walls ?? true,
      lineGableTriangles: latest.line_gable_triangles ?? true,
      lineApex: latest.line_apex ?? true,
    });
  }, [jobQ.data, variantsQ.data]);

  const saveSpec = useMutation({
    mutationFn: async () => {
      const variants = variantsQ.data ?? (await fetchVariantsWithBom());
      const variant = variants.find((v) => v.id === input.liningType);
      if (!variant) throw new Error("Select a lining variant first.");

      const panelW = variant.default_panel_width != null ? Number(variant.default_panel_width) : undefined;
      const panelH = variant.default_panel_height != null ? Number(variant.default_panel_height) : undefined;
      const result = calculate({ ...input, panelW, panelH });
      const jobCosts = calculateJobCosts(result, variant.bom);

      const { data: spec, error } = await supabase
        .from("marquee_specs")
        .insert({
          job_id: jobId,
          length: input.length,
          width: input.width,
          eave_height: input.eaveHeight,
          pitch_deg: input.pitchDeg,
          bay_size: input.baySize,
          // Store variant NAME (string) for compatibility with old rows
          lining_type: variant.name,
          roof_overhang_enabled: input.roofOverhangEnabled,
          wall_floor_seal_enabled: input.wallFloorSealEnabled,
          apex_override: input.apexOverride,
          line_roof: input.lineRoof !== false,
          line_walls: input.lineWalls !== false,
          line_gable_walls: input.lineGableWalls !== false,
          line_gable_triangles: input.lineGableTriangles !== false,
          line_apex: input.lineApex !== false,
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
        total_weight_kg: jobCosts.totalWeightKg,
        total_cost: jobCosts.totalCost,
        breakdown_json: { ...result, jobCosts } as any,
      });
      if (rErr) throw rErr;
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

  const canSave = !!input.liningType && !variantsQ.isLoading && !saveSpec.isPending;

  // Edit / delete job
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [form, setForm] = useState({ name: "", reference: "", reference_url: "", notes: "" });
  useEffect(() => {
    if (job) setForm({
      name: job.name ?? "",
      reference: job.reference ?? "",
      reference_url: job.reference_url ?? "",
      notes: job.notes ?? "",
    });
  }, [job]);

  const updateJob = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("jobs").update({
        name: form.name,
        reference: form.reference || null,
        reference_url: form.reference_url || null,
        notes: form.notes || null,
        updated_at: new Date().toISOString(),
      }).eq("id", jobId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Job updated");
      setEditOpen(false);
      qc.invalidateQueries({ queryKey: ["job", jobId] });
      qc.invalidateQueries({ queryKey: ["jobs"] });
      qc.invalidateQueries({ queryKey: ["customers"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const deleteJob = useMutation({
    mutationFn: async () => {
      const specIds = revisions.map((s) => s.id);
      if (specIds.length > 0) {
        await supabase.from("lining_results").delete().in("spec_id", specIds);
        await supabase.from("marquee_specs").delete().eq("job_id", jobId);
      }
      const { error } = await supabase.from("jobs").delete().eq("id", jobId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Job deleted");
      qc.invalidateQueries({ queryKey: ["customers"] });
      if (job?.customers?.id) navigate({ to: "/customers/$customerId", params: { customerId: job.customers.id } });
      else navigate({ to: "/" });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

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
        <Button onClick={() => saveSpec.mutate()} disabled={!canSave}>
          <Save className="mr-1 h-4 w-4" /> {saveSpec.isPending ? "Saving…" : "Save revision"}
        </Button>
      </div>

      <CalculatorPanel
        value={input}
        onChange={setInput}
        install={install}
        onInstallChange={setInstall}
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
