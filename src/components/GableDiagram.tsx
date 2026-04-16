import { CalcInput, CalcResult, fmt } from "@/lib/calculator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  input: CalcInput;
  result: CalcResult;
  panelW: number;
  panelH: number;
}

export function GableDiagram({ input, result, panelW, panelH }: Props) {
  const { width, baySize } = input;
  const { ridgeHeight, wallStacks, gableWallsPanels, gableTriCount } = result;
  const stackH = wallStacks * panelH;

  // Gable wall panel grid (per end)
  const colsPerEnd = Math.ceil(width / panelW);
  const rowsPerEnd = Math.max(1, wallStacks);

  // Triangle slices (per end) — gableTriCount counts both ends
  const slicesPerEnd = gableTriCount / 2;

  const pad = 2;
  const vbW = width + pad * 2;
  const vbH = stackH + ridgeHeight + pad * 2 + 1.5;
  const ox = pad;
  const oy = pad + 0.5;
  const groundY = oy + stackH + ridgeHeight;
  const eaveY = groundY - stackH;
  const ridgeY = oy;
  const midX = ox + width / 2;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Gable end (elevation)
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
              {/* Wall rectangle */}
              <rect
                x={ox}
                y={eaveY}
                width={width}
                height={stackH}
                className="fill-primary/10 stroke-primary/60"
                strokeWidth="0.05"
              />
              {/* Vertical column dividers */}
              {Array.from({ length: colsPerEnd - 1 }).map((_, i) => {
                const x = ox + (i + 1) * (width / colsPerEnd);
                return (
                  <line key={`c${i}`} x1={x} y1={eaveY} x2={x} y2={groundY} className="stroke-primary/40" strokeWidth="0.03" />
                );
              })}
              {/* Horizontal row dividers */}
              {Array.from({ length: rowsPerEnd - 1 }).map((_, i) => {
                const y = eaveY + (i + 1) * (stackH / rowsPerEnd);
                return (
                  <line key={`r${i}`} x1={ox} y1={y} x2={ox + width} y2={y} className="stroke-primary/40" strokeWidth="0.03" />
                );
              })}
              {/* Triangle */}
              <polygon
                points={`${ox},${eaveY} ${ox + width},${eaveY} ${midX},${ridgeY}`}
                className="fill-accent/30 stroke-accent"
                strokeWidth="0.05"
              />
              {/* Triangle slice dividers from apex to base */}
              {Array.from({ length: slicesPerEnd - 1 }).map((_, i) => {
                const x = ox + (i + 1) * (width / slicesPerEnd);
                return (
                  <line key={`t${i}`} x1={midX} y1={ridgeY} x2={x} y2={eaveY} className="stroke-accent" strokeWidth="0.03" />
                );
              })}
              {/* Labels */}
              <text x={midX} y={ridgeY - 0.2} textAnchor="middle" fontSize="0.5" className="fill-foreground">
                {slicesPerEnd} triangles
              </text>
              <text x={midX} y={(eaveY + groundY) / 2} textAnchor="middle" fontSize="0.6" className="fill-foreground">
                {colsPerEnd} × {rowsPerEnd} = {colsPerEnd * rowsPerEnd} panels
              </text>
            </svg>
          </div>

          <div className="overflow-hidden rounded-md border border-border">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-2 py-1.5 text-left">Section</th>
                  <th className="px-2 py-1.5 text-right">Per end</th>
                  <th className="px-2 py-1.5 text-right">Both ends</th>
                  <th className="px-2 py-1.5 text-right">Notes</th>
                </tr>
              </thead>
              <tbody className="tabular">
                <tr className="border-t border-border">
                  <td className="px-2 py-1.5">Wall panels</td>
                  <td className="px-2 py-1.5 text-right">{gableWallsPanels / 2}</td>
                  <td className="px-2 py-1.5 text-right">{gableWallsPanels}</td>
                  <td className="px-2 py-1.5 text-right text-muted-foreground">{colsPerEnd}×{rowsPerEnd} grid</td>
                </tr>
                <tr className="border-t border-border bg-accent/10">
                  <td className="px-2 py-1.5">Triangles</td>
                  <td className="px-2 py-1.5 text-right">{slicesPerEnd}</td>
                  <td className="px-2 py-1.5 text-right">{gableTriCount}</td>
                  <td className="px-2 py-1.5 text-right text-muted-foreground">max {fmt(baySize, 0)}m wide</td>
                </tr>
                <tr className="border-t border-border">
                  <td className="px-2 py-1.5">Ridge height</td>
                  <td colSpan={3} className="px-2 py-1.5 text-right">{fmt(result.ridgeHeightTotal)} m total</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
