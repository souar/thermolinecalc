import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Plus, FolderOpen, ExternalLink, Pencil } from "lucide-react";
import { getUsername } from "@/lib/username";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  component: DashboardPage,
});

function DashboardPage() {
  const qc = useQueryClient();

  const customersQ = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("*, jobs(id, name, reference, reference_url, updated_at, created_by)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  const createCustomer = useMutation({
    mutationFn: async (n: string) => {
      const { data, error } = await supabase
        .from("customers")
        .insert({ name: n, created_by: getUsername() })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Customer added");
      setOpen(false);
      setName("");
      qc.invalidateQueries({ queryKey: ["customers"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string; jobCount: number } | null>(null);

  const updateCustomer = useMutation({
    mutationFn: async (c: { id: string; name: string }) => {
      const { error } = await supabase.from("customers").update({ name: c.name }).eq("id", c.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Customer updated");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["customers"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const deleteCustomer = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("customers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Customer deleted");
      setConfirmDelete(null);
      qc.invalidateQueries({ queryKey: ["customers"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Projects</h1>
          <p className="mt-1 text-sm text-muted-foreground">Customers and the jobs underneath them.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-1 h-4 w-4" /> New customer</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New customer</DialogTitle></DialogHeader>
            <div className="space-y-2">
              <Label>Customer name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Gaylord Hotels" autoFocus />
            </div>
            <DialogFooter>
              <Button onClick={() => createCustomer.mutate(name)} disabled={!name.trim() || createCustomer.isPending}>
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {customersQ.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}

      {customersQ.data && customersQ.data.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No customers yet. Create your first one to start saving jobs.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {customersQ.data?.map((c: any) => (
          <Card key={c.id}>
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  {c.name}
                  <button
                    type="button"
                    onClick={() => setEditing({ id: c.id, name: c.name })}
                    className="text-muted-foreground hover:text-foreground"
                    aria-label="Edit customer"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </CardTitle>
                {c.created_by && <p className="text-xs text-muted-foreground">added by {c.created_by}</p>}
              </div>
              <Link to="/customers/$customerId" params={{ customerId: c.id }} className="text-sm text-primary hover:underline">
                Open
              </Link>
            </CardHeader>
            <CardContent>
              {c.jobs && c.jobs.length > 0 ? (
                <ul className="space-y-2">
                  {c.jobs.slice(0, 4).map((j: any) => (
                    <li key={j.id} className="flex items-center justify-between rounded border border-border px-3 py-2 text-sm">
                      <Link to="/jobs/$jobId" params={{ jobId: j.id }} className="flex items-center gap-2 hover:text-primary">
                        <FolderOpen className="h-4 w-4 text-muted-foreground" />
                        <span>{j.name}</span>
                        {j.reference && (
                          j.reference_url ? (
                            <a href={j.reference_url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-0.5 rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground hover:text-primary">
                              {j.reference} <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{j.reference}</span>
                          )
                        )}
                      </Link>
                      {j.created_by && <span className="text-xs text-muted-foreground">{j.created_by}</span>}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No jobs yet.</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit customer</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-2">
              <Label>Customer name</Label>
              <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} autoFocus />
            </div>
          )}
          <DialogFooter className="sm:justify-between">
            <Button
              variant="destructive"
              onClick={() => {
                if (!editing) return;
                const cust = customersQ.data?.find((c: any) => c.id === editing.id);
                const jobCount = cust?.jobs?.length ?? 0;
                setConfirmDelete({ id: editing.id, name: editing.name, jobCount });
                setEditing(null);
              }}
            >
              Delete
            </Button>
            <Button
              onClick={() => editing && updateCustomer.mutate(editing)}
              disabled={!editing?.name.trim() || updateCustomer.isPending}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDelete} onOpenChange={(v) => !v && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {confirmDelete?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDelete && confirmDelete.jobCount > 0
                ? `This customer has ${confirmDelete.jobCount} job(s). Delete those jobs first before removing the customer.`
                : "This permanently deletes the customer."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={(confirmDelete?.jobCount ?? 0) > 0 || deleteCustomer.isPending}
              onClick={() => confirmDelete && deleteCustomer.mutate(confirmDelete.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
