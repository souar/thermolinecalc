import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CalculatorPanel } from "@/components/CalculatorPanel";
import { CalcInput, DEFAULT_INPUT, DEFAULT_INSTALL_INPUT, InstallInput } from "@/lib/calculator";

export const Route = createFileRoute("/calculator")({
  component: QuickCalc,
});

const KEY = "marquee.quickcalc";
const INSTALL_KEY = "marquee.quickcalc.install";

function QuickCalc() {
  const [input, setInput] = useState<CalcInput>(DEFAULT_INPUT);
  const [install, setInstall] = useState<InstallInput>(DEFAULT_INSTALL_INPUT);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem(KEY);
    if (raw) {
      try { setInput(JSON.parse(raw)); } catch { /* noop */ }
    }
    const rawI = localStorage.getItem(INSTALL_KEY);
    if (rawI) {
      try { setInstall({ ...DEFAULT_INSTALL_INPUT, ...JSON.parse(rawI) }); } catch { /* noop */ }
    }
  }, []);
  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem(KEY, JSON.stringify(input));
  }, [input]);
  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem(INSTALL_KEY, JSON.stringify(install));
  }, [install, install]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Quick calculator</h1>
        <p className="mt-1 text-sm text-muted-foreground">Estimate without saving. Inputs persist in your browser.</p>
      </div>
      <CalculatorPanel
        value={input}
        onChange={setInput}
        install={install}
        onInstallChange={setInstall}
      />
    </div>
  );
}
