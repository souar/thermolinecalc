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
  const { ridgeHeight, wallStacks, gableWallsPanels, gableTriCount, gableTriSlices } = result;
  const stackH = wallStacks * panelH;

  // Gable wall panel grid (per end)
  const colsPerEnd = Math.ceil(width / panelW);
  const rowsPerEnd = Math.max(1, wallStacks);

  const slicesPerEnd = gableTriCount / 2;
  const slicesPerHalf = gableTriSlices.length;
  const halfW = width / 2;

  const pad = 2;
  const vbW = width + pad * 2;
  const vbH = stackH + ridgeHeight + pad * 2 + 1.5;
  const ox = pad;
  const oy = pad + 0.5;
  const groundY = oy + stackH + ridgeHeight;
  const eaveY = groundY - stackH;
  const ridgeY = oy;
  const midX = ox + width / 2;

  // Build right-triangle polygons: left half slices go eave→apex (left to right)
  // Each slice i occupies horizontal [xCursor, xCursor+base] from the LEFT eave.
  // Tall (vertical) leg is on the inner side (toward centre).
  const leftTris: Array<{ pts: string }> = [];
  let xL = 0;
  for (const s of gableTriSlices) {
    const x1 = ox + xL; // outer (shorter) edge x
    const x2 = ox + xL + s.base; // inner (taller) edge x
    // Roof slope on left half rises from eave (x=ox, y=eaveY) to apex (x=midX, y=ridgeY)
    // Height at horizontal distance d from left eave = d * (ridgeHeight/halfW)
    const yOuter = eaveY; // base sits on eave line at outer corner
    const yInnerTop = eaveY - s.height; // top of vertical leg meets the slope
    // Right triangle vertices: outer-bottom, inner-bottom, inner-top
    leftTris.push({ pts: `${x1},${yOuter} ${x2},${yOuter} ${x2},${yInnerTop}` });
    xL += s.base;
  }
  // Mirror for right half
  const rightTris: Array<{ pts: string }> = [];
  let xR = 0;
  for (const s of gableTriSlices) {
    const x1 = ox + width - xR; // outer edge (right eave side)
    const x2 = ox + width - xR - s.base; // inner edge (toward centre)
    const yOuter = eaveY;
    const yInnerTop = eaveY - s.height;
    rightTris.push({ pts: `${x1},${yOuter} ${x2},${yOuter} ${x2},${yInnerTop}` });
    xR += s.base;
  }

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
              {/* Triangle outline (whole gable) */}
              <polygon
                points={`${ox},${eaveY} ${ox + width},${eaveY} ${midX},${ridgeY}`}
                className="fill-accent/10 stroke-accent"
                strokeWidth="0.05"
              />
              {/* Right-angle triangle slices */}
              {leftTris.map((t, i) => (
                <polygon key={`lt${i}`} points={t.pts} className="fill-accent/30 stroke-accent" strokeWidth="0.04" />
              ))}
              {rightTris.map((t, i) => (
                <polygon key={`rt${i}`} points={t.pts} className="fill-accent/30 stroke-accent" strokeWidth="0.04" />
              ))}
              {/* Labels */}
              <text x={midX} y={ridgeY - 0.2} textAnchor="middle" fontSize="0.5" className="fill-foreground">
                {slicesPerEnd} triangles per end
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
                  <td className="px-2 py-1.5 text-right text-muted-foreground">right-angle, base = bay ({fmt(baySize, 0)}m)</td>
                </tr>
                {gableTriSlices.length > 0 && (
                  <tr className="border-t border-border">
                    <td className="px-2 py-1.5 align-top">Slice sizes<br /><span className="text-[10px] text-muted-foreground">(per half, eave→apex)</span></td>
                    <td colSpan={3} className="px-2 py-1.5 text-right text-muted-foreground">
                      {gableTriSlices.map((s, i) => (
                        <span key={i} className="ml-2 inline-block">{fmt(s.base)}×{fmt(s.height)}m</span>
                      ))}
                    </td>
                  </tr>
                )}
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
