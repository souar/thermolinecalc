import { supabase } from "@/integrations/supabase/client";
import type { BomLine, SectionKey } from "@/lib/calculator";
import { SECTION_KEYS } from "@/lib/calculator";

export interface VariantWithBom {
  id: string;
  name: string;
  description: string | null;
  default_panel_width: number | null;
  default_panel_height: number | null;
  active: boolean;
  bom: BomLine[];
  baseCostPerM2: number;
  sectionKeysCount: number;
}

const SECTION_KEY_SET = new Set<string>(SECTION_KEYS.map((s) => s.key));

export async function fetchVariantsWithBom(): Promise<VariantWithBom[]> {
  const { data, error } = await supabase
    .from("lining_variants")
    .select(
      `id, name, description, default_panel_width, default_panel_height, active,
       lining_variant_components(
         id, qty_per_m2, sections, sort_order,
         components(
           id, name, kind, unit, cost_per_unit, manufacturing_stage,
           time_minutes_per_unit, m2_per_unit, weight_per_m2, primary_supplier_id,
           suppliers:primary_supplier_id(id, name)
         )
       )`,
    )
    .eq("active", true)
    .order("name");
  if (error) throw error;

  return (data ?? []).map((v: any) => {
    const rawRows: any[] = v.lining_variant_components ?? [];
    const sortedRows = [...rawRows].sort(
      (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
    );
    const bom: BomLine[] = sortedRows
      .filter((r) => r.components)
      .map((r) => {
        const c = r.components;
        const sections = ((r.sections as string[] | null) ?? []).filter(
          (s): s is SectionKey => SECTION_KEY_SET.has(s),
        );
        return {
          componentId: c.id,
          componentName: c.name,
          componentKind: c.kind,
          manufacturingStage: c.manufacturing_stage ?? null,
          unit: c.unit,
          costPerUnit: Number(c.cost_per_unit ?? 0),
          qtyPerM2: Number(r.qty_per_m2 ?? 0),
          sections: sections.length > 0 ? sections : null,
          timeMinutesPerUnit:
            c.time_minutes_per_unit != null ? Number(c.time_minutes_per_unit) : null,
          m2PerUnit: c.m2_per_unit != null ? Number(c.m2_per_unit) : null,
          weightPerM2: c.weight_per_m2 != null ? Number(c.weight_per_m2) : null,
          primarySupplierId: c.primary_supplier_id ?? null,
          primarySupplierName: c.suppliers?.name ?? null,
        };
      });

    const baseCostPerM2 = bom
      .filter((l) => !l.sections || l.sections.length === 0)
      .reduce((s, l) => s + l.qtyPerM2 * l.costPerUnit, 0);
    const sectionKeysCount = new Set(
      bom.flatMap((l) => l.sections ?? []),
    ).size;

    return {
      id: v.id,
      name: v.name,
      description: v.description,
      default_panel_width: v.default_panel_width,
      default_panel_height: v.default_panel_height,
      active: v.active,
      bom,
      baseCostPerM2,
      sectionKeysCount,
    };
  });
}

export const VARIANTS_QUERY_KEY = ["lining_variants_with_bom"] as const;
