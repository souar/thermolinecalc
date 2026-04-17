import { CalcInput, CalcResult, fmt } from "@/lib/calculator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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

  const pad = 2;
  const vbW = width + pad * 2;
  const vbH = stackH + ridgeHeight + pad * 2 + 1.5;
  const ox = pad;
  const oy = pad + 0.5;
  const groundY = oy + stackH + ridgeHeight;
  const eaveY = groundY - stackH;
  const ridgeY = oy;
  const midX = ox + width / 2;

  type Poly = { pts: string; kind: "triangle" | "infill" };
  const leftPolys: Poly[] = [];
  const rightPolys: Poly[] = [];
  let xL = 0;
  for (const slice of gableTriSlices) {
    const x1 = ox + xL;
    const x2 = ox + xL + slice.base;
    const rx1 = ox + width - xL;
    const rx2 = ox + width - xL - slice.base;
    const yOuterTop = eaveY - slice.hOuter;
    const yInnerTop = eaveY - slice.hInner;

    for (const p of slice.pieces) {
      if (p.kind === "triangle") {
        leftPolys.push({ pts: `${x1},${yOuterTop} ${x2},${yOuterTop} ${x2},${yInnerTop}`, kind: "triangle" });
        rightPolys.push({ pts: `${rx1},${yOuterTop} ${rx2},${yOuterTop} ${rx2},${yInnerTop}`, kind: "triangle" });
      }
    }
    let cursorY = yOuterTop;
    for (const p of slice.pieces) {
      if (p.kind === "infill") {
        const yBottom = cursorY + p.height;
        leftPolys.push({ pts: `${x1},${cursorY} ${x2},${cursorY} ${x2},${yBottom} ${x1},${yBottom}`, kind: "infill" });
        rightPolys.push({ pts: `${rx1},${cursorY} ${rx2},${cursorY} ${rx2},${yBottom} ${rx1},${yBottom}`, kind: "infill" });
        cursorY = yBottom;
      }
    }
    xL += slice.base;
  }

  const halfTotalM2 = gableTriSlices.reduce(
    (s, sl) => s + sl.pieces.reduce((a, p) => a + (p.kind === "triangle" ? (sl.base * p.height) / 2 : sl.base * p.height), 0),
    0,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Gable end (elevation)
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

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="overflow-hidden rounded-lg border border-border">
            <div className="border-b border-border bg-muted px-4 py-2 text-[11px] uppercase tracking-wider text-muted-foreground">
              Summary
            </div>
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Section</th>
                  <th className="px-4 py-2 text-right font-medium">Per end</th>
                  <th className="px-4 py-2 text-right font-medium">Both ends</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-border">
                  <td className="px-4 py-2.5">Wall panels <span className="ml-1 text-xs text-muted-foreground">({colsPerEnd}×{rowsPerEnd})</span></td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{gableWallsPanels / 2}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{gableWallsPanels}</td>
                </tr>
                <tr className="border-t border-border bg-muted/30">
                  <td className="px-4 py-2.5">
                    <span className="flex items-center gap-2">
                      Triangles
                      <Badge variant="outline" className="text-[9px] uppercase tracking-wider">Custom</Badge>
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{gableTriCount / 2}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{gableTriCount}</td>
                </tr>
                {gableInfillCount > 0 && (
                  <tr className="border-t border-border">
                    <td className="px-4 py-2.5">
                      <span className="flex items-center gap-2">
                        Infill
                        <Badge variant="outline" className="text-[9px] uppercase tracking-wider">Custom</Badge>
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{gableInfillCount / 2}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{gableInfillCount}</td>
                  </tr>
                )}
                <tr className="border-t-2 border-border bg-primary/5">
                  <td className="px-4 py-3 font-semibold">Ridge height</td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums" colSpan={2}>{fmt(result.ridgeHeightTotal)} m</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="overflow-hidden rounded-lg border border-border">
            <div className="border-b border-border bg-muted px-4 py-2 text-[11px] uppercase tracking-wider text-muted-foreground">
              Slice pieces (per half · eave → apex)
            </div>
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Slice</th>
                  <th className="px-4 py-2 text-left font-medium">Piece</th>
                  <th className="px-4 py-2 text-right font-medium">Size (m)</th>
                  <th className="px-4 py-2 text-right font-medium">m²</th>
                </tr>
              </thead>
              <tbody>
                {gableTriSlices.flatMap((s, sIdx) =>
                  s.pieces.map((p, pIdx) => {
                    const area = p.kind === "triangle" ? (s.base * p.height) / 2 : s.base * p.height;
                    return (
                      <tr key={`${sIdx}-${pIdx}`} className={`border-t border-border ${(sIdx + pIdx) % 2 === 1 ? "bg-muted/30" : ""}`}>
                        <td className="px-4 py-2.5 text-muted-foreground">{pIdx === 0 ? `#${sIdx + 1}` : ""}</td>
                        <td className="px-4 py-2.5 capitalize">{p.kind}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{fmt(s.base)} × {fmt(p.height)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{fmt(area)}</td>
                      </tr>
                    );
                  }),
                )}
                <tr className="border-t-2 border-border bg-primary/5">
                  <td className="px-4 py-3 font-semibold" colSpan={3}>Per half · base = {fmt(baySize, 0)}m bays</td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">{fmt(halfTotalM2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
