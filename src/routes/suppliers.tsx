import { createFileRoute } from "@tanstack/react-router";
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

export const Route = createFileRoute("/suppliers")({
  component: SuppliersPage,
});

type Supplier = {
  id: string;
  name: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  notes: string | null;
  active: boolean;
};

type FormState = {
  name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  address: string;
  notes: string;
};

const emptyForm: FormState = {
  name: "",
  contact_name: "",
  contact_email: "",
  contact_phone: "",
  address: "",
  notes: "",
};

function toNullable(v: string) {
  const t = v.trim();
  return t === "" ? null : t;
}

function SuppliersPage() {
  const qc = useQueryClient();
  const [showArchived, setShowArchived] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);

  const suppliersQ = useQuery({
    queryKey: ["suppliers", { active: !showArchived }],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("suppliers")
        .select("*")
        .eq("active", !showArchived)
        .order("name");
      if (error) throw error;
      return (data ?? []) as Supplier[];
    },
  });

  const createM = useMutation({
    mutationFn: async (form: FormState) => {
      if (!form.name.trim()) throw new Error("Name is required");
      const { error } = await supabase.from("suppliers").insert({
        name: form.name.trim(),
        contact_name: toNullable(form.contact_name),
        contact_email: toNullable(form.contact_email),
        contact_phone: toNullable(form.contact_phone),
        address: toNullable(form.address),
        notes: toNullable(form.notes),
        created_by: getUsername(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Supplier created");
      qc.invalidateQueries({ queryKey: ["suppliers"] });
      setCreateOpen(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const updateM = useMutation({
    mutationFn: async (s: Supplier) => {
      if (!s.name.trim()) throw new Error("Name is required");
      const { error } = await supabase
        .from("suppliers")
        .update({
          name: s.name.trim(),
          contact_name: s.contact_name,
          contact_email: s.contact_email,
          contact_phone: s.contact_phone,
          address: s.address,
          notes: s.notes,
          active: s.active,
        })
        .eq("id", s.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["suppliers"] });
      setEditing(null);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Suppliers</h1>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Switch checked={showArchived} onCheckedChange={setShowArchived} />
            Archived
          </label>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button>+ New supplier</Button>
            </DialogTrigger>
            <CreateDialog
              onSubmit={(f) => createM.mutate(f)}
              pending={createM.isPending}
            />
          </Dialog>
        </div>
      </div>

      <div className="rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="w-24"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {suppliersQ.isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            ) : (suppliersQ.data ?? []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No {showArchived ? "archived" : "active"} suppliers.
                </TableCell>
              </TableRow>
            ) : (
              (suppliersQ.data ?? []).map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell>{s.contact_name ?? "—"}</TableCell>
                  <TableCell>{s.contact_email ?? "—"}</TableCell>
                  <TableCell>{s.contact_phone ?? "—"}</TableCell>
                  <TableCell className="max-w-xs truncate">{s.notes ?? "—"}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" onClick={() => setEditing(s)}>
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        {editing && (
          <EditDialog
            supplier={editing}
            onSave={(s) => updateM.mutate(s)}
            pending={updateM.isPending}
          />
        )}
      </Dialog>
    </div>
  );
}

function CreateDialog({
  onSubmit,
  pending,
}: {
  onSubmit: (f: FormState) => void;
  pending: boolean;
}) {
  const [form, setForm] = useState<FormState>(emptyForm);
  return (
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>New supplier</DialogTitle>
      </DialogHeader>
      <SupplierFields form={form} setForm={setForm} />
      <DialogFooter>
        <Button onClick={() => onSubmit(form)} disabled={pending}>
          {pending ? "Creating…" : "Create"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function EditDialog({
  supplier,
  onSave,
  pending,
}: {
  supplier: Supplier;
  onSave: (s: Supplier) => void;
  pending: boolean;
}) {
  const [s, setS] = useState<Supplier>(supplier);
  const form: FormState = {
    name: s.name,
    contact_name: s.contact_name ?? "",
    contact_email: s.contact_email ?? "",
    contact_phone: s.contact_phone ?? "",
    address: s.address ?? "",
    notes: s.notes ?? "",
  };
  const setForm = (f: FormState) =>
    setS({
      ...s,
      name: f.name,
      contact_name: toNullable(f.contact_name),
      contact_email: toNullable(f.contact_email),
      contact_phone: toNullable(f.contact_phone),
      address: toNullable(f.address),
      notes: toNullable(f.notes),
    });

  return (
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>Edit supplier</DialogTitle>
      </DialogHeader>
      <SupplierFields form={form} setForm={setForm} />
      <DialogFooter className="flex justify-between sm:justify-between">
        <Button
          variant={s.active ? "destructive" : "outline"}
          onClick={() => onSave({ ...s, active: !s.active })}
          disabled={pending}
        >
          {s.active ? "Archive" : "Restore"}
        </Button>
        <Button onClick={() => onSave(s)} disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function SupplierFields({
  form,
  setForm,
}: {
  form: FormState;
  setForm: (f: FormState) => void;
}) {
  const upd = (k: keyof FormState) => (v: string) => setForm({ ...form, [k]: v });
  return (
    <div className="grid gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor="sup-name">Name *</Label>
        <Input id="sup-name" value={form.name} onChange={(e) => upd("name")(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="sup-cn">Contact name</Label>
          <Input id="sup-cn" value={form.contact_name} onChange={(e) => upd("contact_name")(e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="sup-ce">Email</Label>
          <Input id="sup-ce" type="email" value={form.contact_email} onChange={(e) => upd("contact_email")(e.target.value)} />
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="sup-cp">Phone</Label>
        <Input id="sup-cp" value={form.contact_phone} onChange={(e) => upd("contact_phone")(e.target.value)} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="sup-addr">Address</Label>
        <Textarea id="sup-addr" rows={2} value={form.address} onChange={(e) => upd("address")(e.target.value)} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="sup-notes">Notes</Label>
        <Textarea id="sup-notes" rows={3} value={form.notes} onChange={(e) => upd("notes")(e.target.value)} />
      </div>
    </div>
  );
}
