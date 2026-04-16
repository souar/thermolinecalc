import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getUsername, setUsername, clearUsername } from "@/lib/username";
import { toast } from "sonner";

export function UsernameGate() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [user, setUser] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const u = getUsername();
    setUser(u);
    if (!u) setOpen(true);
  }, []);

  const submit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await setUsername(name);
      setUser(name.trim());
      setOpen(false);
      toast.success(`Welcome, ${name.trim()}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save name");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {user && (
        <button
          onClick={() => {
            clearUsername();
            setUser(null);
            setName("");
            setOpen(true);
          }}
          className="fixed bottom-4 right-4 z-40 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground shadow-sm hover:bg-muted"
        >
          Signed in as <span className="font-medium text-foreground">{user}</span> · switch
        </button>
      )}
      <Dialog open={open} onOpenChange={(o) => user && setOpen(o)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>What's your name?</DialogTitle>
            <DialogDescription>
              We'll attach your name to projects you create so the team can see who did what. No password needed.
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="e.g. Alice"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            autoFocus
          />
          <DialogFooter>
            <Button onClick={submit} disabled={saving || !name.trim()}>
              {saving ? "Saving..." : "Continue"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
