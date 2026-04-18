import { CalcInput, CalcResult, fmt } from "@/lib/calculator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CadFrame, CAD_COLORS, CAD_STROKE, CAD_STROKE_THIN, CAD_FONT_SM, DimLine, Legend, PartLabel, TickMark, TitleBlock } from "./diagrams/cad";

interface Props {
  input: CalcInput;
  result: CalcResult;
  panelW: number;
  panelH: number;
}

export function GableDiagram({ input, result, panelW, panelH }: Props) {
  const { width, length } = input;
  const { ridgeHeight, wallStacks, gableWallsPanels, gableTriCount, gableInfillCount, gableTriSlices } = result;
  const stackH = wallStacks * panelH;

  const colsPerEnd = Math.ceil(width / panelW);
  const rowsPerEnd = Math.max(1, wallStacks);

  const padL = 4;
  const padR = 9;
  const padT = 2;
  const padB = 4;
  const vbW = width + padL + padR;
  const vbH = stackH + ridgeHeight + padT + padB;
  const ox = padL;
  const oy = padT;
  const groundY = oy + stackH + ridgeHeight;
  const eaveY = groundY - stackH;
  const ridgeY = oy;
  const midX = ox + width / 2;

  type Poly = { pts: string; kind: "triangle" | "infill"; cx: number; cy: number; label: string };
  const leftPolys: Poly[] = [];
  const rightPolys: Poly[] = [];
  let xL = 0;
  let sliceIdx = 0;
  for (const slice of gableTriSlices) {
    const x1 = ox + xL;
    const x2 = ox + xL + slice.base;
    const rx1 = ox + width - xL;
    const rx2 = ox + width - xL - slice.base;
    const yOuterTop = eaveY - slice.hOuter;
    const yInnerTop = eaveY - slice.hInner;

    for (const p of slice.pieces) {
      if (p.kind === "triangle") {
        const cx = (x1 + x2 + x2) / 3;
        const cy = (yOuterTop + yOuterTop + yInnerTop) / 3;
        leftPolys.push({ pts: `${x1},${yOuterTop} ${x2},${yOuterTop} ${x2},${yInnerTop}`, kind: "triangle", cx, cy, label: sliceIdx === 0 ? "ridge gable" : sliceIdx === gableTriSlices.length - 1 ? "left gable" : "middle gable" });
        const rcx = (rx1 + rx2 + rx2) / 3;
        rightPolys.push({ pts: `${rx1},${yOuterTop} ${rx2},${yOuterTop} ${rx2},${yInnerTop}`, kind: "triangle", cx: rcx, cy, label: sliceIdx === 0 ? "ridge gable" : sliceIdx === gableTriSlices.length - 1 ? "right gable" : "middle gable" });
      }
    }
    let cursorY = yOuterTop;
    for (const p of slice.pieces) {
      if (p.kind === "infill") {
        const yBottom = cursorY + p.height;
        leftPolys.push({ pts: `${x1},${cursorY} ${x2},${cursorY} ${x2},${yBottom} ${x1},${yBottom}`, kind: "infill", cx: (x1 + x2) / 2, cy: (cursorY + yBottom) / 2, label: "gable infill" });
        rightPolys.push({ pts: `${rx1},${cursorY} ${rx2},${cursorY} ${rx2},${yBottom} ${rx1},${yBottom}`, kind: "infill", cx: (rx1 + rx2) / 2, cy: (cursorY + yBottom) / 2, label: "gable infill" });
        cursorY = yBottom;
      }
    }
    xL += slice.base;
    sliceIdx++;
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
        <CadFrame vbW={vbW} vbH={vbH}>
          {/* Ground line + hatching */}
          <line x1={ox - 0.5} y1={groundY} x2={ox + width + 0.5} y2={groundY} stroke={CAD_COLORS.outline} strokeWidth={CAD_STROKE} />
          {Array.from({ length: Math.floor(width + 1) }).map((_, i) => (
            <line key={`gh${i}`} x1={ox - 0.5 + i * 0.4} y1={groundY} x2={ox - 0.5 + i * 0.4 - 0.2} y2={groundY + 0.25} stroke={CAD_COLORS.dim} strokeWidth={CAD_STROKE_THIN} />
          ))}

          {/* Outer frame outline */}
          <polyline
            points={`${ox},${groundY} ${ox},${eaveY} ${midX},${ridgeY} ${ox + width},${eaveY} ${ox + width},${groundY}`}
            fill="none"
            stroke={CAD_COLORS.outline}
            strokeWidth={CAD_STROKE}
          />

          {/* Wall panel grid */}
          <rect x={ox} y={eaveY} width={width} height={stackH} fill="#fff" stroke={CAD_COLORS.outline} strokeWidth={CAD_STROKE_THIN} />
          {Array.from({ length: colsPerEnd - 1 }).map((_, i) => {
            const x = ox + (i + 1) * (width / colsPerEnd);
            return <line key={`c${i}`} x1={x} y1={eaveY} x2={x} y2={groundY} stroke={CAD_COLORS.outline} strokeWidth={CAD_STROKE_THIN} opacity={0.5} />;
          })}
          {Array.from({ length: rowsPerEnd - 1 }).map((_, i) => {
            const y = eaveY + (i + 1) * (stackH / rowsPerEnd);
            return <line key={`r${i}`} x1={ox} y1={y} x2={ox + width} y2={y} stroke={CAD_COLORS.outline} strokeWidth={CAD_STROKE_THIN} opacity={0.5} />;
          })}
          {/* Wall panel labels */}
          {Array.from({ length: colsPerEnd }).map((_, c) =>
            Array.from({ length: rowsPerEnd }).map((_, r) => {
              const x = ox + (c + 0.5) * (width / colsPerEnd);
              const y = eaveY + (r + 0.5) * (stackH / rowsPerEnd);
              return <PartLabel key={`p${c}-${r}`} x={x} y={y} label={`thermoline ${fmt(panelW, 0)}×${fmt(panelH, 0)}`} code={`MAL-W${c + 1}-${r + 1}`} />;
            })
          )}
          {/* Wall join ticks */}
          {Array.from({ length: colsPerEnd - 1 }).map((_, i) => {
            const x = ox + (i + 1) * (width / colsPerEnd);
            return Array.from({ length: rowsPerEnd }).map((_, r) => {
              const y = eaveY + r * (stackH / rowsPerEnd);
              return <TickMark key={`wt${i}-${r}`} x={x} y={y} angle={45} />;
            });
          })}

          {/* Gable triangle background */}
          <polygon points={`${ox},${eaveY} ${ox + width},${eaveY} ${midX},${ridgeY}`} fill={CAD_COLORS.fillGable} stroke={CAD_COLORS.panelEdgeGreen} strokeWidth={CAD_STROKE} opacity={0.5} />

          {/* Internal struts (vertical at each rafter junction) */}
          {gableTriSlices.length > 0 && (() => {
            let acc = 0;
            return gableTriSlices.slice(0, -1).map((sl, i) => {
              acc += sl.base;
              const x = ox + acc;
              const yTop = eaveY - sl.hOuter;
              return (
                <g key={`st${i}`}>
                  <line x1={x - 0.04} y1={eaveY} x2={x - 0.04} y2={yTop} stroke={CAD_COLORS.beam} strokeWidth={CAD_STROKE_THIN} />
                  <line x1={x + 0.04} y1={eaveY} x2={x + 0.04} y2={yTop} stroke={CAD_COLORS.beam} strokeWidth={CAD_STROKE_THIN} />
                </g>
              );
            });
          })()}

          {/* Gable pieces */}
          {[...leftPolys, ...rightPolys].map((p, i) => (
            <g key={`gp${i}`}>
              <polygon points={p.pts} fill={p.kind === "triangle" ? CAD_COLORS.fillGable : CAD_COLORS.fillUpperRoof} stroke={p.kind === "triangle" ? CAD_COLORS.panelEdgeGreen : CAD_COLORS.panelEdgeBlue} strokeWidth={CAD_STROKE_THIN} />
              <PartLabel x={p.cx} y={p.cy} label={p.label} code={p.kind === "triangle" ? "MAL-G" : "MAL-INF"} />
            </g>
          ))}

          {/* Additional strut callout near apex */}
          <text x={midX + 0.6} y={ridgeY + 0.3} fontSize={CAD_FONT_SM} fill={CAD_COLORS.dim} fontStyle="italic" style={{ fontFamily: "ui-serif, Georgia, serif" }}>additional strut</text>
          <line x1={midX + 0.55} y1={ridgeY + 0.3} x2={midX + 0.05} y2={ridgeY + 0.15} stroke={CAD_COLORS.dim} strokeWidth={CAD_STROKE_THIN} />

          {/* Rafter flap labels on legs (if enabled) */}
          {input.legRaftersEnabled && [ox, ox + width].map((x, side) => (
            <PartLabel
              key={`lr${side}`}
              x={x + (side === 0 ? -0.6 : 0.6)}
              y={(eaveY + groundY) / 2}
              label="rafter flap"
              code={`${input.rafterFlapWidth ?? 0.4}×${fmt(input.eaveHeight)}m`}
              rotate={90}
            />
          ))}

          {/* 250mm seal callout */}
          <text x={ox - 3} y={groundY - 0.3} fontSize={CAD_FONT_SM} fill={CAD_COLORS.dim} style={{ fontFamily: "ui-sans-serif, system-ui" }}>
            <tspan x={ox - 3} dy="0">250mm</tspan>
            <tspan x={ox - 3} dy="1.1em">floor seal</tspan>
          </text>

          {/* Eave height dimension */}
          <DimLine x1={ox + width + 1.2} y1={groundY} x2={ox + width + 1.2} y2={eaveY} label={`${fmt(input.eaveHeight)}m`} offset={0.25} />
          <DimLine x1={ox + width + 2.2} y1={groundY} x2={ox + width + 2.2} y2={ridgeY} label={`${fmt(result.ridgeHeightTotal)}m`} offset={0.25} />
          {/* Width dim */}
          <DimLine x1={ox} y1={groundY + 1.4} x2={ox + width} y2={groundY + 1.4} label={`${fmt(width)}m`} offset={0.25} />

          {/* Legend */}
          <Legend
            x={vbW - padR + 0.3}
            y={padT + 0.2}
            items={[
              { color: CAD_COLORS.panelEdgeGreen, label: "gable edge" },
              { color: CAD_COLORS.panelEdgeBlue, label: "infill edge" },
              { color: CAD_COLORS.panelEdgePink, label: "ridge edge" },
            ]}
            width={vbW - (vbW - padR + 0.3) - 0.3}
          />

          {/* Title block */}
          <TitleBlock
            x={vbW - padR + 0.3}
            y={vbH - padB + 0.3}
            width={vbW - (vbW - padR + 0.3) - 0.3}
            project="Marquee Gable"
            dims={`${fmt(length, 0)}×${fmt(width, 0)}m`}
          />
        </CadFrame>

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
                  <td className="px-4 py-3 font-semibold" colSpan={3}>Per half · base = {fmt(input.baySize, 0)}m bays</td>
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
