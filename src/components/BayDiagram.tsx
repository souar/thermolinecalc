import { CalcInput, CalcResult, fmt } from "@/lib/calculator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  input: CalcInput;
  result: CalcResult;
  panelW: number;
  panelH: number;
}

export function BayDiagram({ input, result, panelW, panelH }: Props) {
  const { width, eaveHeight } = input;
  const { ridgeHeight, wallStacks, customWallInfill, apexWidth, customRoofEave } = result;
  const roofPanelsPerSide = result.bays > 0 ? result.roofPanels / 2 / result.bays : 0;

  // viewBox sizing
  const totalH = eaveHeight + ridgeHeight;
  const pad = 2;
  const vbW = width + pad * 2;
  const vbH = totalH + pad * 2 + 1.5; // extra for labels
  const ox = pad;
  const oy = pad + 0.5;

  // Coordinates (SVG y grows down; we flip)
  const groundY = oy + totalH;
  const eaveY = groundY - eaveHeight;
  const ridgeY = groundY - totalH;
  const leftX = ox;
  const rightX = ox + width;
  const midX = ox + width / 2;

  // Apex strip at top - apexWidth is the slope-length of the strip
  // For diagram show apex as horizontal cap proportional to apexWidth/2 each side of ridge
  const apexHalfPlan = (apexWidth / 2) * (width / 2 / result.slopeLength); // horizontal projection
  const apexLeftX = midX - apexHalfPlan;
  const apexRightX = midX + apexHalfPlan;
  const apexBaseY = ridgeY + (apexWidth / 2) * (ridgeHeight / result.slopeLength);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Single bay (cross-section)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-md border border-border bg-muted/20 p-2">
            <svg
              viewBox={`0 0 ${vbW} ${vbH}`}
              className="h-auto w-full"
              preserveAspectRatio="xMidYMid meet"
            >
              {/* Ground */}
              <line
                x1={ox - 0.5}
                y1={groundY}
                x2={ox + width + 0.5}
                y2={groundY}
                stroke="currentColor"
                strokeWidth="0.05"
                className="text-muted-foreground"
              />
              {/* Walls (left & right) — show stacked panels */}
              {[leftX, rightX].map((x, side) => {
                const stackH = wallStacks * panelH;
                const stackTop = groundY - stackH;
                return (
                  <g key={side}>
                    {/* full stack rect */}
                    <rect
                      x={x - 0.15}
                      y={stackTop}
                      width={0.3}
                      height={stackH}
                      className="fill-primary/15 stroke-primary/60"
                      strokeWidth="0.04"
                    />
                    {/* divisions */}
                    {Array.from({ length: wallStacks - 1 }).map((_, i) => (
                      <line
                        key={i}
                        x1={x - 0.15}
                        y1={stackTop + (i + 1) * panelH}
                        x2={x + 0.15}
                        y2={stackTop + (i + 1) * panelH}
                        className="stroke-primary/60"
                        strokeWidth="0.03"
                      />
                    ))}
                    {/* infill (if any) sits above stack */}
                    {customWallInfill && (
                      <rect
                        x={x - 0.15}
                        y={stackTop - customWallInfill.height}
                        width={0.3}
                        height={customWallInfill.height}
                        className="fill-accent/40 stroke-accent"
                        strokeWidth="0.04"
                      />
                    )}
                  </g>
                );
              })}
              {/* Roof slopes */}
              <line
                x1={leftX}
                y1={eaveY}
                x2={apexLeftX}
                y2={apexBaseY}
                className="stroke-primary"
                strokeWidth="0.08"
              />
              <line
                x1={rightX}
                y1={eaveY}
                x2={apexRightX}
                y2={apexBaseY}
                className="stroke-primary"
                strokeWidth="0.08"
              />
              {/* Apex strip */}
              <polygon
                points={`${apexLeftX},${apexBaseY} ${apexRightX},${apexBaseY} ${midX},${ridgeY}`}
                className="fill-accent/50 stroke-accent"
                strokeWidth="0.05"
              />
              {/* Labels */}
              <text x={midX} y={ridgeY - 0.2} textAnchor="middle" fontSize="0.5" className="fill-foreground">
                Apex × 1
              </text>
              <text x={leftX - 0.3} y={(groundY + eaveY) / 2} textAnchor="end" fontSize="0.5" className="fill-foreground">
                {wallStacks}↕
              </text>
              <text x={rightX + 0.3} y={(groundY + eaveY) / 2} textAnchor="start" fontSize="0.5" className="fill-foreground">
                {wallStacks}↕
              </text>
              <text x={(leftX + midX) / 2} y={(eaveY + ridgeY) / 2 - 0.1} textAnchor="middle" fontSize="0.5" className="fill-foreground">
                {roofPanelsPerSide} roof
              </text>
              <text x={(rightX + midX) / 2} y={(eaveY + ridgeY) / 2 - 0.1} textAnchor="middle" fontSize="0.5" className="fill-foreground">
                {roofPanelsPerSide} roof
              </text>
            </svg>
          </div>

          <div className="overflow-hidden rounded-md border border-border">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-2 py-1.5 text-left">Section</th>
                  <th className="px-2 py-1.5 text-right">Per bay</th>
                  <th className="px-2 py-1.5 text-right">Panel size</th>
                  <th className="px-2 py-1.5 text-right">m²/bay</th>
                </tr>
              </thead>
              <tbody className="tabular">
                <Row
                  label="Wall (each side)"
                  qty={`2 × ${wallStacks}`}
                  size={`${fmt(panelW, 0)}×${fmt(result.wallPanelHeight)}`}
                  m2={2 * wallStacks * panelW * result.wallPanelHeight}
                />
                {customWallInfill && (
                  <Row
                    label="Custom infill"
                    qty="2"
                    size={`${fmt(panelW, 0)}×${fmt(customWallInfill.height)}`}
                    m2={2 * panelW * customWallInfill.height}
                    accent
                  />
                )}
                <Row
                  label="Roof (each side)"
                  qty={`2 × ${roofPanelsPerSide}`}
                  size={`${fmt(panelW, 0)}×${fmt(result.roofPanelHeight)}`}
                  m2={2 * roofPanelsPerSide * panelW * result.roofPanelHeight}
                />
                {customRoofEave && (
                  <Row
                    label="Roof eave cut"
                    qty="2"
                    size={`${fmt(panelW, 0)}×${fmt(customRoofEave.height)}`}
                    m2={2 * panelW * customRoofEave.height}
                    accent
                  />
                )}
                <Row
                  label="Apex"
                  qty="1"
                  size={`${fmt(apexWidth)}×${fmt(input.baySize, 0)}`}
                  m2={apexWidth * input.baySize}
                  accent
                />
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Row({ label, qty, size, m2, accent }: { label: string; qty: string; size: string; m2: number; accent?: boolean }) {
  return (
    <tr className={`border-t border-border ${accent ? "bg-accent/10" : ""}`}>
      <td className="px-2 py-1.5">{label}</td>
      <td className="px-2 py-1.5 text-right">{qty}</td>
      <td className="px-2 py-1.5 text-right text-muted-foreground">{size}</td>
      <td className="px-2 py-1.5 text-right">{fmt(m2)}</td>
    </tr>
  );
}
