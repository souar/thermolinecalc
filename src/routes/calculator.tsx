import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CalculatorPanel } from "@/components/CalculatorPanel";
import { CalcInput, DEFAULT_INPUT, LINING_TYPES } from "@/lib/calculator";

export const Route = createFileRoute("/calculator")({
  component: QuickCalc,
});

const KEY = "marquee.quickcalc";

function QuickCalc() {
  const [input, setInput] = useState<CalcInput>(DEFAULT_INPUT);

  useEffect(() => {
    const raw = typeof window !== "undefined" ? localStorage.getItem(KEY) : null;
    if (raw) {
      try { setInput(JSON.parse(raw)); } catch { /* noop */ }
    }
  }, []);
  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem(KEY, JSON.stringify(input));
  }, [input]);

  const pricingQ = useQuery({
    queryKey: ["pricing"],
    queryFn: async () => {
      const { data, error } = await supabase.from("lining_pricing").select("*");
      if (error) throw error;
      return data ?? [];
    },
  });

  const linePrice = pricingQ.data?.find((p) => p.lining_type === input.liningType);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Quick calculator</h1>
        <p className="mt-1 text-sm text-muted-foreground">Estimate without saving. Inputs persist in your browser.</p>
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
      />
    </div>
  );
}
