import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ExternalLink, Plus, ArrowLeft, Pencil } from "lucide-react";
import { getUsername } from "@/lib/username";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/customers/$customerId")({
  component: CustomerPage,
});

type JobForm = { name: string; reference: string; reference_url: string; notes: string };
const EMPTY_JOB: JobForm = { name: "", reference: "", reference_url: "", notes: "" };

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
  const [editJobId, setEditJobId] = useState<string | null>(null);
  const [form, setForm] = useState<JobForm>(EMPTY_JOB);

  const openNew = () => { setEditJobId(null); setForm(EMPTY_JOB); setOpen(true); };
  const openEdit = (j: any) => {
    setEditJobId(j.id);
    setForm({ name: j.name ?? "", reference: j.reference ?? "", reference_url: j.reference_url ?? "", notes: j.notes ?? "" });
    setOpen(true);
  };

  const saveJob = useMutation({
    mutationFn: async () => {
      if (editJobId) {
        const { error } = await supabase
          .from("jobs")
          .update({
            name: form.name,
            reference: form.reference || null,
            reference_url: form.reference_url || null,
            notes: form.notes || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editJobId);
        if (error) throw error;
        return { id: editJobId, isNew: false };
      }
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
      return { id: data.id, isNew: true };
    },
    onSuccess: ({ id, isNew }) => {
      toast.success(isNew ? "Job created" : "Job updated");
      setOpen(false);
      setForm(EMPTY_JOB);
      setEditJobId(null);
      qc.invalidateQueries({ queryKey: ["jobs", customerId] });
      qc.invalidateQueries({ queryKey: ["customers"] });
      if (isNew) navigate({ to: "/jobs/$jobId", params: { jobId: id } });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const [confirmDeleteJob, setConfirmDeleteJob] = useState<{ id: string; name: string } | null>(null);

  const deleteJob = useMutation({
    mutationFn: async (jobId: string) => {
      const { data: specs } = await supabase.from("marquee_specs").select("id").eq("job_id", jobId);
      const specIds = (specs ?? []).map((s) => s.id);
      if (specIds.length > 0) {
        await supabase.from("lining_results").delete().in("spec_id", specIds);
        await supabase.from("marquee_specs").delete().eq("job_id", jobId);
      }
      const { error } = await supabase.from("jobs").delete().eq("id", jobId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Job deleted");
      setConfirmDeleteJob(null);
      qc.invalidateQueries({ queryKey: ["jobs", customerId] });
      qc.invalidateQueries({ queryKey: ["customers"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  // Edit / delete customer
  const [editCustOpen, setEditCustOpen] = useState(false);
  const [custName, setCustName] = useState("");
  useEffect(() => { if (customerQ.data) setCustName(customerQ.data.name); }, [customerQ.data]);

  const updateCustomer = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("customers").update({ name: custName }).eq("id", customerId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Customer updated");
      setEditCustOpen(false);
      qc.invalidateQueries({ queryKey: ["customer", customerId] });
      qc.invalidateQueries({ queryKey: ["customers"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const [confirmDeleteCust, setConfirmDeleteCust] = useState(false);
  const deleteCustomer = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("customers").delete().eq("id", customerId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Customer deleted");
      qc.invalidateQueries({ queryKey: ["customers"] });
      navigate({ to: "/" });
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
          <h1 className="text-3xl font-semibold tracking-tight flex items-center gap-2">
            {customerQ.data?.name ?? "…"}
            {customerQ.data && (
              <button
                type="button"
                onClick={() => setEditCustOpen(true)}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Edit customer"
              >
                <Pencil className="h-4 w-4" />
              </button>
            )}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{jobsQ.data?.length ?? 0} job(s)</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button onClick={openNew}><Plus className="mr-1 h-4 w-4" /> New job</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editJobId ? "Edit job" : "New job"}</DialogTitle></DialogHeader>
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
            <DialogFooter className="sm:justify-between">
              {editJobId ? (
                <Button
                  variant="destructive"
                  onClick={() => { setConfirmDeleteJob({ id: editJobId, name: form.name }); setOpen(false); }}
                >
                  Delete
                </Button>
              ) : <span />}
              <Button onClick={() => saveJob.mutate()} disabled={!form.name.trim() || saveJob.isPending}>
                {editJobId ? "Save" : "Create"}
              </Button>
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
                <CardTitle className="text-base flex items-center gap-2">
                  <Link to="/jobs/$jobId" params={{ jobId: j.id }} className="hover:text-primary">{j.name}</Link>
                  <button
                    type="button"
                    onClick={() => openEdit(j)}
                    className="text-muted-foreground hover:text-foreground"
                    aria-label="Edit job"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
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

      {/* Edit customer dialog */}
      <Dialog open={editCustOpen} onOpenChange={setEditCustOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit customer</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>Customer name</Label>
            <Input value={custName} onChange={(e) => setCustName(e.target.value)} autoFocus />
          </div>
          <DialogFooter className="sm:justify-between">
            <Button variant="destructive" onClick={() => { setEditCustOpen(false); setConfirmDeleteCust(true); }}>
              Delete
            </Button>
            <Button onClick={() => updateCustomer.mutate()} disabled={!custName.trim() || updateCustomer.isPending}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm delete customer */}
      <AlertDialog open={confirmDeleteCust} onOpenChange={setConfirmDeleteCust}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {customerQ.data?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              {(jobsQ.data?.length ?? 0) > 0
                ? `This customer has ${jobsQ.data?.length} job(s). Delete those jobs first before removing the customer.`
                : "This permanently deletes the customer."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={(jobsQ.data?.length ?? 0) > 0 || deleteCustomer.isPending}
              onClick={() => deleteCustomer.mutate()}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm delete job */}
      <AlertDialog open={!!confirmDeleteJob} onOpenChange={(v) => !v && setConfirmDeleteJob(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {confirmDeleteJob?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the job and all its saved revisions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteJob.isPending}
              onClick={() => confirmDeleteJob && deleteJob.mutate(confirmDeleteJob.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
