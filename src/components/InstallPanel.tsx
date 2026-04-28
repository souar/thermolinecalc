import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  CalcResult,
  INSTALL_SECTIONS,
  InstallInput,
  InstallSectionKey,
  MIN_PEOPLE_PER_TEAM,
  calculateInstall,
  fmt,
} from "@/lib/calculator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Users, Clock, CalendarDays } from "lucide-react";

interface Props {
  result: CalcResult;
  value: InstallInput;
  onChange: (v: InstallInput) => void;
}

export function InstallPanel({ result, value, onChange }: Props) {
  const num = (s: string) => (s === "" ? 0 : Number(s));

  // Load global defaults from DB (overrides hard-coded defaults if set).
  const defaultsQ = useQuery({
    queryKey: ["install_time_defaults"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("install_time_defaults")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const dbDefaults = useMemo(() => {
    const m: Partial<Record<InstallSectionKey, number>> = {};
    for (const r of defaultsQ.data ?? []) {
      m[r.section_key as InstallSectionKey] = Number(r.minutes_per_panel);
    }
    return m;
  }, [defaultsQ.data]);

  const effectiveInput: InstallInput = useMemo(() => {
    // Merge: explicit override → db default → hard-coded.
    const merged: Partial<Record<InstallSectionKey, number>> = {};
    for (const s of INSTALL_SECTIONS) {
      merged[s.key] =
        value.minutesPerPanel[s.key] ??
        dbDefaults[s.key] ??
        s.defaultMin;
    }
    return { ...value, minutesPerPanel: merged };
  }, [value, dbDefaults]);

  const install = useMemo(
    () => calculateInstall(result, effectiveInput),
    [result, effectiveInput],
  );

  const setMin = (key: InstallSectionKey, v: number) => {
    onChange({
      ...value,
      minutesPerPanel: { ...value.minutesPerPanel, [key]: v },
    });
  };

  const set = <K extends keyof InstallInput>(k: K, v: InstallInput[K]) =>
    onChange({ ...value, [k]: v });

  return (
    <div className="grid gap-6 lg:grid-cols-[420px_1fr] items-start">
      {/* Inputs */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              Time per panel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Section</TableHead>
                  <TableHead className="w-28 text-right text-xs">Min/panel</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {INSTALL_SECTIONS.map((s) => {
                  const current =
                    value.minutesPerPanel[s.key] ?? dbDefaults[s.key] ?? s.defaultMin;
                  return (
                    <TableRow key={s.key}>
                      <TableCell className="text-sm">{s.label}</TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          inputMode="numeric"
                          step="1"
                          min="0"
                          className="h-8 text-right tabular"
                          value={current}
                          onChange={(e) => setMin(s.key, num(e.target.value))}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              Team configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Number of teams">
                <Input
                  type="number"
                  inputMode="numeric"
                  step="1"
                  min="1"
                  value={value.teams}
                  onChange={(e) => set("teams", Math.max(1, Math.floor(num(e.target.value))))}
                />
              </Field>
              <Field
                label={`People / team (min ${MIN_PEOPLE_PER_TEAM})`}
                hint={`Baseline ${MIN_PEOPLE_PER_TEAM} — extra people scale install time down proportionally`}
              >
                <Input
                  type="number"
                  inputMode="numeric"
                  step="1"
                  min={MIN_PEOPLE_PER_TEAM}
                  value={value.peoplePerTeam}
                  onChange={(e) =>
                    set(
                      "peoplePerTeam",
                      Math.max(MIN_PEOPLE_PER_TEAM, Math.floor(num(e.target.value))),
                    )
                  }
                />
              </Field>
              <Field label="Hours / working day">
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.5"
                  min="1"
                  value={value.hoursPerDay}
                  onChange={(e) => set("hoursPerDay", num(e.target.value))}
                />
              </Field>
            </div>

            <div className="flex items-center justify-between rounded-md border border-border bg-muted/30 p-3">
              <div className="space-y-0.5">
                <Label className="text-xs">Parallel sections</Label>
                <p className="text-[11px] text-muted-foreground">
                  Teams can split across sections concurrently
                </p>
              </div>
              <Switch
                checked={value.parallelSections}
                onCheckedChange={(v) => set("parallelSections", v)}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Results */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Stat
            icon={<CalendarDays className="h-4 w-4" />}
            label="Total install days"
            value={fmt(install.totalDays, 1)}
            unit="days"
            highlight
          />
          <Stat
            icon={<Clock className="h-4 w-4" />}
            label="Person-hours"
            value={fmt(install.personHours, 0)}
            unit="hrs"
          />
          <Stat
            icon={<Users className="h-4 w-4" />}
            label="Panels / day / team"
            value={fmt(install.panelsPerDayPerTeam, 1)}
            unit="pcs"
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              Section breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Section</TableHead>
                  <TableHead className="text-right text-xs">Panels</TableHead>
                  <TableHead className="text-right text-xs">Min/panel</TableHead>
                  <TableHead className="text-right text-xs">Hours</TableHead>
                  <TableHead className="text-right text-xs">Days</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {install.sections.map((s) => (
                  <TableRow key={s.key} className={s.panels === 0 ? "text-muted-foreground" : ""}>
                    <TableCell className="text-sm">{s.label}</TableCell>
                    <TableCell className="text-right tabular text-sm">{s.panels}</TableCell>
                    <TableCell className="text-right tabular text-sm">{s.minutesPerPanel}</TableCell>
                    <TableCell className="text-right tabular text-sm">{fmt(s.hours, 1)}</TableCell>
                    <TableCell className="text-right tabular text-sm">{fmt(s.days, 2)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-medium">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-right tabular">{install.totalPanels}</TableCell>
                  <TableCell />
                  <TableCell className="text-right tabular">{fmt(install.totalHours, 1)}</TableCell>
                  <TableCell className="text-right tabular">{fmt(install.totalDays, 2)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
      {hint && <p className="text-[10px] leading-tight text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Stat({
  label,
  value,
  unit,
  highlight,
  icon,
}: {
  label: string;
  value: string;
  unit?: string;
  highlight?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div
      className={
        "rounded-lg border p-3 " +
        (highlight ? "border-primary/40 bg-primary/5" : "border-border bg-card")
      }
    >
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-2xl font-semibold tabular">{value}</span>
        {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
      </div>
    </div>
  );
}
