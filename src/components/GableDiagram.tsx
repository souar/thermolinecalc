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
  const { ridgeHeight, wallStacks, gableWallsPanels, gableTriCount, gableInfillCount, gableTriSlices } = result;
  const stackH = wallStacks * panelH;

  const colsPerEnd = Math.ceil(width / panelW);
  const rowsPerEnd = Math.max(1, wallStacks);

  const slicesPerHalf = gableTriSlices.length;

  const pad = 2;
  const vbW = width + pad * 2;
  const vbH = stackH + ridgeHeight + pad * 2 + 1.5;
  const ox = pad;
  const oy = pad + 0.5;
  const groundY = oy + stackH + ridgeHeight;
  const eaveY = groundY - stackH;
  const ridgeY = oy;
  const midX = ox + width / 2;

  // Build polygons for each slice's pieces (left half + mirrored right half)
  type Poly = { pts: string; kind: "triangle" | "infill" };
  const leftPolys: Poly[] = [];
  const rightPolys: Poly[] = [];
  let xL = 0;
  for (const slice of gableTriSlices) {
    const x1 = ox + xL; // outer (shorter) edge x
    const x2 = ox + xL + slice.base; // inner (taller) edge x
    // Top of strip is at eaveY (at ground reference for gable triangle area)
    // Pieces stack inside the trapezoid, top piece = triangle hugging slope
    // The triangle's top vertex is at (x2, eaveY - hInner)
    const topInnerY = eaveY - slice.hInner;

    // Walk pieces from top (triangle) downward
    let cursorY = topInnerY; // top of next piece on inner edge
    for (const p of slice.pieces) {
      if (p.kind === "triangle") {
        // Right triangle: vertices = (x1, cursorY + p.height) outer-bottom, (x2, cursorY + p.height) inner-bottom, (x2, cursorY) inner-top
        const yBottom = cursorY + p.height;
        leftPolys.push({
          pts: `${x1},${yBottom} ${x2},${yBottom} ${x2},${cursorY}`,
          kind: "triangle",
        });
        // Mirror
        const rx1 = ox + width - xL;
        const rx2 = ox + width - xL - slice.base;
        rightPolys.push({
          pts: `${rx1},${yBottom} ${rx2},${yBottom} ${rx2},${cursorY}`,
          kind: "triangle",
        });
        cursorY = yBottom;
      } else {
        // Infill rectangle: from (x1, cursorY) to (x2, cursorY + p.height)
        const yBottom = cursorY + p.height;
        leftPolys.push({
          pts: `${x1},${cursorY} ${x2},${cursorY} ${x2},${yBottom} ${x1},${yBottom}`,
          kind: "infill",
        });
        const rx1 = ox + width - xL;
        const rx2 = ox + width - xL - slice.base;
        rightPolys.push({
          pts: `${rx1},${cursorY} ${rx2},${cursorY} ${rx2},${yBottom} ${rx1},${yBottom}`,
          kind: "infill",
        });
        cursorY = yBottom;
      }
    }
    xL += slice.base;
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
              <line x1={ox - 0.5} y1={groundY} x2={ox + width + 0.5} y2={groundY} stroke="currentColor" strokeWidth="0.05" className="text-muted-foreground" />
              <rect x={ox} y={eaveY} width={width} height={stackH} className="fill-primary/10 stroke-primary/60" strokeWidth="0.05" />
              {Array.from({ length: colsPerEnd - 1 }).map((_, i) => {
                const x = ox + (i + 1) * (width / colsPerEnd);
                return <line key={`c${i}`} x1={x} y1={eaveY} x2={x} y2={groundY} className="stroke-primary/40" strokeWidth="0.03" />;
              })}
              {Array.from({ length: rowsPerEnd - 1 }).map((_, i) => {
                const y = eaveY + (i + 1) * (stackH / rowsPerEnd);
                return <line key={`r${i}`} x1={ox} y1={y} x2={ox + width} y2={y} className="stroke-primary/40" strokeWidth="0.03" />;
              })}
              <polygon points={`${ox},${eaveY} ${ox + width},${eaveY} ${midX},${ridgeY}`} className="fill-accent/5 stroke-accent" strokeWidth="0.05" />
              {[...leftPolys, ...rightPolys].map((p, i) =>
                p.kind === "triangle" ? (
                  <polygon key={`tri${i}`} points={p.pts} className="fill-accent/30 stroke-accent" strokeWidth="0.04" />
                ) : (
                  <polygon key={`inf${i}`} points={p.pts} className="fill-secondary/40 stroke-secondary-foreground/40" strokeWidth="0.04" />
                ),
              )}
              <text x={midX} y={ridgeY - 0.2} textAnchor="middle" fontSize="0.45" className="fill-foreground">
                {gableTriCount / 2} tri + {gableInfillCount / 2} infill per end
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
                  <td className="px-2 py-1.5 text-right">{gableTriCount / 2}</td>
                  <td className="px-2 py-1.5 text-right">{gableTriCount}</td>
                  <td className="px-2 py-1.5 text-right text-muted-foreground">right-angle, base = bay ({fmt(baySize, 0)}m)</td>
                </tr>
                {gableInfillCount > 0 && (
                  <tr className="border-t border-border bg-secondary/20">
                    <td className="px-2 py-1.5">Gable infill</td>
                    <td className="px-2 py-1.5 text-right">{gableInfillCount / 2}</td>
                    <td className="px-2 py-1.5 text-right">{gableInfillCount}</td>
                    <td className="px-2 py-1.5 text-right text-muted-foreground">custom strip below split triangle</td>
                  </tr>
                )}
                {slicesPerHalf > 0 && (
                  <tr className="border-t border-border">
                    <td className="px-2 py-1.5 align-top">Slice sizes<br /><span className="text-[10px] text-muted-foreground">(per half, eave→apex)</span></td>
                    <td colSpan={3} className="px-2 py-1.5 text-right text-muted-foreground">
                      {gableTriSlices.map((s, i) => (
                        <div key={i} className="text-right">
                          {s.pieces.map((p, j) => (
                            <span key={j} className="ml-2 inline-block">
                              {fmt(s.base)}×{fmt(p.height)}m {p.kind === "triangle" ? "tri" : "infill"}
                            </span>
                          ))}
                        </div>
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
