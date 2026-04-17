import { CalcInput, CalcResult, fmt } from "@/lib/calculator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Props {
  input: CalcInput;
  result: CalcResult;
  panelW: number;
  panelH: number;
}

type BayRow = {
  group: "Walls" | "Roof" | "Apex";
  label: string;
  qty: string;
  size: string;
  m2: number;
  custom?: boolean;
};

export function BayDiagram({ input, result, panelW, panelH }: Props) {
  const { width, eaveHeight } = input;
  const { ridgeHeight, wallStacks, customWallInfill, apexWidth, customRoofEave } = result;
  const roofPanelsPerSide = result.bays > 0 ? result.roofPanels / 2 / result.bays : 0;

  const totalH = eaveHeight + ridgeHeight;
  const pad = 2;
  const vbW = width + pad * 2;
  const vbH = totalH + pad * 2 + 1.5;
  const ox = pad;
  const oy = pad + 0.5;

  const groundY = oy + totalH;
  const eaveY = groundY - eaveHeight;
  const ridgeY = groundY - totalH;
  const leftX = ox;
  const rightX = ox + width;
  const midX = ox + width / 2;

  const apexHalfPlan = (apexWidth / 2) * (width / 2 / result.slopeLength);
  const apexLeftX = midX - apexHalfPlan;
  const apexRightX = midX + apexHalfPlan;
  const apexBaseY = ridgeY + (apexWidth / 2) * (ridgeHeight / result.slopeLength);

  const rows: BayRow[] = [
    {
      group: "Walls",
      label: "Wall (each side)",
      qty: `2 × ${wallStacks}`,
      size: `${fmt(panelW, 0)}×${fmt(result.wallPanelHeight)}`,
      m2: 2 * wallStacks * panelW * result.wallPanelHeight,
    },
    ...(customWallInfill
      ? [{
          group: "Walls" as const,
          label: "Custom infill",
          qty: "2",
          size: `${fmt(panelW, 0)}×${fmt(customWallInfill.height)}`,
          m2: 2 * panelW * customWallInfill.height,
          custom: true,
        }]
      : []),
    {
      group: "Roof",
      label: "Roof (each side)",
      qty: `2 × ${roofPanelsPerSide}`,
      size: `${fmt(panelW, 0)}×${fmt(result.roofPanelHeight)}`,
      m2: 2 * roofPanelsPerSide * panelW * result.roofPanelHeight,
    },
    ...(customRoofEave
      ? [{
          group: "Roof" as const,
          label: "Roof eave cut",
          qty: "2",
          size: `${fmt(panelW, 0)}×${fmt(customRoofEave.height)}`,
          m2: 2 * panelW * customRoofEave.height,
          custom: true,
        }]
      : []),
    {
      group: "Apex",
      label: "Apex strip",
      qty: "1",
      size: `${fmt(apexWidth)}×${fmt(input.baySize, 0)}`,
      m2: apexWidth * input.baySize,
      custom: true,
    },
  ];
  const totalM2 = rows.reduce((s, r) => s + r.m2, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Single bay (cross-section)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-lg border border-border bg-muted/20 p-4">
          <svg
            viewBox={`0 0 ${vbW} ${vbH}`}
            className="mx-auto h-auto w-full max-h-[60vh]"
            preserveAspectRatio="xMidYMid meet"
          >
            <line x1={ox - 0.5} y1={groundY} x2={ox + width + 0.5} y2={groundY} stroke="currentColor" strokeWidth="0.05" className="text-muted-foreground" />
            {[leftX, rightX].map((x, side) => {
              const stackH = wallStacks * panelH;
              const stackTop = groundY - stackH;
              return (
                <g key={side}>
                  <rect x={x - 0.15} y={stackTop} width={0.3} height={stackH} className="fill-primary/15 stroke-primary/60" strokeWidth="0.04" />
                  {Array.from({ length: wallStacks - 1 }).map((_, i) => (
                    <line key={i} x1={x - 0.15} y1={stackTop + (i + 1) * panelH} x2={x + 0.15} y2={stackTop + (i + 1) * panelH} className="stroke-primary/60" strokeWidth="0.03" />
                  ))}
                  {customWallInfill && (
                    <rect x={x - 0.15} y={stackTop - customWallInfill.height} width={0.3} height={customWallInfill.height} className="fill-accent/40 stroke-accent" strokeWidth="0.04" />
                  )}
                </g>
              );
            })}
            <line x1={leftX} y1={eaveY} x2={apexLeftX} y2={apexBaseY} className="stroke-primary" strokeWidth="0.08" />
            <line x1={rightX} y1={eaveY} x2={apexRightX} y2={apexBaseY} className="stroke-primary" strokeWidth="0.08" />
            <polygon points={`${apexLeftX},${apexBaseY} ${apexRightX},${apexBaseY} ${midX},${ridgeY}`} className="fill-accent/50 stroke-accent" strokeWidth="0.05" />
            <text x={midX} y={ridgeY - 0.2} textAnchor="middle" fontSize="0.5" className="fill-foreground">Apex × 1</text>
            <text x={leftX - 0.3} y={(groundY + eaveY) / 2} textAnchor="end" fontSize="0.5" className="fill-foreground">{wallStacks}↕</text>
            <text x={rightX + 0.3} y={(groundY + eaveY) / 2} textAnchor="start" fontSize="0.5" className="fill-foreground">{wallStacks}↕</text>
            <text x={(leftX + midX) / 2} y={(eaveY + ridgeY) / 2 - 0.1} textAnchor="middle" fontSize="0.5" className="fill-foreground">{roofPanelsPerSide} roof</text>
            <text x={(rightX + midX) / 2} y={(eaveY + ridgeY) / 2 - 0.1} textAnchor="middle" fontSize="0.5" className="fill-foreground">{roofPanelsPerSide} roof</text>
          </svg>
        </div>

        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium">Section</th>
                <th className="px-4 py-2.5 text-left font-medium">Piece</th>
                <th className="px-4 py-2.5 text-right font-medium">Per bay</th>
                <th className="px-4 py-2.5 text-right font-medium">Panel size (m)</th>
                <th className="px-4 py-2.5 text-right font-medium">m² / bay</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const prevGroup = i > 0 ? rows[i - 1].group : null;
                const isFirstInGroup = r.group !== prevGroup;
                return (
                  <tr key={i} className={`border-t border-border ${i % 2 === 1 ? "bg-muted/30" : ""}`}>
                    <td className="px-4 py-2.5 font-medium text-foreground/80">
                      {isFirstInGroup ? r.group : ""}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="flex items-center gap-2">
                        {r.label}
                        {r.custom && <Badge variant="outline" className="text-[9px] uppercase tracking-wider">Custom</Badge>}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{r.qty}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{r.size}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{fmt(r.m2)}</td>
                  </tr>
                );
              })}
              <tr className="border-t-2 border-border bg-primary/5">
                <td className="px-4 py-3 font-semibold" colSpan={4}>Total per bay</td>
                <td className="px-4 py-3 text-right font-semibold tabular-nums">{fmt(totalM2)} m²</td>
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
