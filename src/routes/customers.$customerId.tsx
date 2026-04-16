import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ExternalLink, Plus, ArrowLeft } from "lucide-react";
import { getUsername } from "@/lib/username";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/customers/$customerId")({
  component: CustomerPage,
});

function CustomerPage() {
  const { customerId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const customerQ = useQuery({
    queryKey: ["customer", customerId],
    queryFn: async () => {
      const { data, error } = await supabase.from("customers").select("*").eq("id", customerId).single();
      if (error) throw error;
      return data;
    },
  });

  const jobsQ = useQuery({
    queryKey: ["jobs", customerId],
    queryFn: async () => {
      const { data, error } = await supabase.from("jobs").select("*").eq("customer_id", customerId).order("updated_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", reference: "", reference_url: "", notes: "" });

  const createJob = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .insert({
          customer_id: customerId,
          name: form.name,
          reference: form.reference || null,
          reference_url: form.reference_url || null,
          notes: form.notes || null,
          created_by: getUsername(),
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (job) => {
      toast.success("Job created");
      setOpen(false);
      setForm({ name: "", reference: "", reference_url: "", notes: "" });
      qc.invalidateQueries({ queryKey: ["jobs", customerId] });
      navigate({ to: "/jobs/$jobId", params: { jobId: job.id } });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  return (
    <div className="space-y-6">
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> All customers
      </Link>

      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{customerQ.data?.name ?? "…"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{jobsQ.data?.length ?? 0} job(s)</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-1 h-4 w-4" /> New job</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New job</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Job name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. San Diego 30×50" autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Reference</Label>
                  <Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="QUOTE-1234" />
                </div>
                <div className="space-y-1.5">
                  <Label>Reference URL</Label>
                  <Input value={form.reference_url} onChange={(e) => setForm({ ...form, reference_url: e.target.value })} placeholder="https://…" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => createJob.mutate()} disabled={!form.name.trim() || createJob.isPending}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3">
        {jobsQ.data?.length === 0 && (
          <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No jobs yet.</CardContent></Card>
        )}
        {jobsQ.data?.map((j) => (
          <Card key={j.id}>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base">
                  <Link to="/jobs/$jobId" params={{ jobId: j.id }} className="hover:text-primary">{j.name}</Link>
                </CardTitle>
                {j.created_by && <p className="text-xs text-muted-foreground">added by {j.created_by}</p>}
              </div>
              {j.reference && (
                j.reference_url ? (
                  <a href={j.reference_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded bg-muted px-2 py-1 text-xs hover:text-primary">
                    {j.reference} <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  <span className="rounded bg-muted px-2 py-1 text-xs text-muted-foreground">{j.reference}</span>
                )
              )}
            </CardHeader>
            {j.notes && <CardContent className="pt-0 text-sm text-muted-foreground">{j.notes}</CardContent>}
          </Card>
        ))}
      </div>
    </div>
  );
}
