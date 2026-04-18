import type { ReactElement } from "react";
import { CalcInput, CalcResult, fmt } from "@/lib/calculator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CadFrame, CAD_COLORS, CAD_STROKE, CAD_STROKE_THIN, CAD_STROKE_THICK, CAD_FONT_SM, DimLine, Legend, PartLabel, TickMark, TitleBlock } from "./diagrams/cad";

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
  const { width, eaveHeight, length } = input;
  const { ridgeHeight, wallStacks, customWallInfill, apexWidth, customRoofEave, slopeLength } = result;
  const roofPanelsPerSide = result.bays > 0 ? result.roofPanels / 2 / result.bays : 0;

  const totalH = eaveHeight + ridgeHeight;
  const padL = 4;
  const padR = 9; // room for dimension + legend
  const padT = 2;
  const padB = 4;
  const vbW = width + padL + padR;
  const vbH = totalH + padT + padB;
  const ox = padL;
  const oy = padT;

  const groundY = oy + totalH;
  const eaveY = groundY - eaveHeight;
  const ridgeY = groundY - totalH;
  const leftX = ox;
  const rightX = ox + width;
  const midX = ox + width / 2;

  const apexHalfPlan = (apexWidth / 2) * (width / 2 / slopeLength);
  const apexLeftX = midX - apexHalfPlan;
  const apexRightX = midX + apexHalfPlan;
  const apexBaseY = ridgeY + (apexWidth / 2) * (ridgeHeight / slopeLength);

  // Leg double-line spacing
  const legHalf = 0.06;

  // Roof slope segment positions (panels along slope from eave to apex)
  const slopeNoApex = Math.max(0.01, slopeLength - apexWidth / 2);
  const segPlan = (panelH * (width / 2)) / slopeLength; // plan distance per roof panel segment
  const segRise = (panelH * ridgeHeight) / slopeLength;

  // Eave-cut slope position (the partial roof piece nearest eave)
  const eaveCutPlan = customRoofEave ? (customRoofEave.height * (width / 2)) / slopeLength : 0;
  const eaveCutRise = customRoofEave ? (customRoofEave.height * ridgeHeight) / slopeLength : 0;

  // Build roof tick positions (per side)
  const roofTicks: { x: number; y: number; angle: number }[] = [];
  for (let side = 0; side < 2; side++) {
    const dir = side === 0 ? 1 : -1; // left side moves right toward apex
    const startX = side === 0 ? leftX : rightX;
    const startY = eaveY;
    let cursorPlan = 0;
    let cursorRise = 0;
    if (customRoofEave) {
      cursorPlan += eaveCutPlan;
      cursorRise += eaveCutRise;
      roofTicks.push({ x: startX + dir * cursorPlan, y: startY - cursorRise, angle: side === 0 ? 135 : 45 });
    }
    // full panels along slope until reaching apex
    while (cursorPlan + segPlan < (width / 2) - apexHalfPlan - 0.001) {
      cursorPlan += segPlan;
      cursorRise += segRise;
      roofTicks.push({ x: startX + dir * cursorPlan, y: startY - cursorRise, angle: side === 0 ? 135 : 45 });
    }
  }

  // Wall stack ticks (per side leg, between stacks)
  const wallTicks: { x: number; y: number }[] = [];
  for (const x of [leftX, rightX]) {
    for (let i = 1; i < wallStacks; i++) {
      const y = groundY - i * panelH;
      if (y > eaveY) wallTicks.push({ x, y });
    }
  }

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
        <CadFrame vbW={vbW} vbH={vbH}>
          {/* Ground line */}
          <line x1={ox - 1} y1={groundY} x2={ox + width + 1} y2={groundY} stroke={CAD_COLORS.outline} strokeWidth={CAD_STROKE} />
          {/* Ground hatching */}
          {Array.from({ length: Math.floor(width + 2) }).map((_, i) => (
            <line key={`gh${i}`} x1={ox - 1 + i * 0.4} y1={groundY} x2={ox - 1 + i * 0.4 - 0.2} y2={groundY + 0.25} stroke={CAD_COLORS.dim} strokeWidth={CAD_STROKE_THIN} />
          ))}

          {/* Legs as double lines */}
          {[leftX, rightX].map((x, side) => (
            <g key={`leg${side}`}>
              <line x1={x - legHalf} y1={groundY} x2={x - legHalf} y2={eaveY} stroke={CAD_COLORS.beam} strokeWidth={CAD_STROKE} />
              <line x1={x + legHalf} y1={groundY} x2={x + legHalf} y2={eaveY} stroke={CAD_COLORS.beam} strokeWidth={CAD_STROKE} />
              <line x1={x - legHalf} y1={eaveY} x2={x + legHalf} y2={eaveY} stroke={CAD_COLORS.beam} strokeWidth={CAD_STROKE} />
              {/* Up/down arrows decorative */}
              <polygon points={`${x},${eaveY + 0.3} ${x - 0.08},${eaveY + 0.5} ${x + 0.08},${eaveY + 0.5}`} fill={CAD_COLORS.dim} opacity={0.5} />
              <polygon points={`${x},${groundY - 0.5} ${x - 0.08},${groundY - 0.7} ${x + 0.08},${groundY - 0.7}`} fill={CAD_COLORS.dim} opacity={0.5} />
            </g>
          ))}

          {/* Roof rafters as double lines */}
          {[
            { from: { x: leftX, y: eaveY }, to: { x: apexLeftX, y: apexBaseY } },
            { from: { x: rightX, y: eaveY }, to: { x: apexRightX, y: apexBaseY } },
          ].map((r, i) => {
            const dx = r.to.x - r.from.x;
            const dy = r.to.y - r.from.y;
            const len = Math.hypot(dx, dy);
            const nx = -dy / len * 0.06;
            const ny = dx / len * 0.06;
            return (
              <g key={`rf${i}`}>
                <line x1={r.from.x + nx} y1={r.from.y + ny} x2={r.to.x + nx} y2={r.to.y + ny} stroke={CAD_COLORS.beam} strokeWidth={CAD_STROKE} />
                <line x1={r.from.x - nx} y1={r.from.y - ny} x2={r.to.x - nx} y2={r.to.y - ny} stroke={CAD_COLORS.beam} strokeWidth={CAD_STROKE} />
                {/* Decorative slope arrow */}
                <polygon points={`${(r.from.x + r.to.x) / 2},${(r.from.y + r.to.y) / 2 - 0.05} ${(r.from.x + r.to.x) / 2 - 0.12},${(r.from.y + r.to.y) / 2 + 0.05} ${(r.from.x + r.to.x) / 2 + 0.12},${(r.from.y + r.to.y) / 2 + 0.05}`} fill={CAD_COLORS.dim} opacity={0.4} />
              </g>
            );
          })}

          {/* Apex cap — flush triangular cap sitting on the ridge, sharing corners with rafters */}
          <polygon
            points={`${apexLeftX},${apexBaseY} ${apexRightX},${apexBaseY} ${midX},${ridgeY}`}
            fill={CAD_COLORS.fillApex}
            stroke={CAD_COLORS.beam}
            strokeWidth={CAD_STROKE}
            strokeLinejoin="round"
          />
          {/* Pink edge highlight on the two sloping apex edges */}
          <line x1={apexLeftX} y1={apexBaseY} x2={midX} y2={ridgeY} stroke={CAD_COLORS.panelEdgePink} strokeWidth={CAD_STROKE_THICK * 0.6} />
          <line x1={apexRightX} y1={apexBaseY} x2={midX} y2={ridgeY} stroke={CAD_COLORS.panelEdgePink} strokeWidth={CAD_STROKE_THICK * 0.6} />
          {/* Tick marks at apex-to-rafter joins */}
          <TickMark x={apexLeftX} y={apexBaseY} angle={45} />
          <TickMark x={apexRightX} y={apexBaseY} angle={135} />

          {/* Wall stack labels (centered between stacks) */}
          {[leftX, rightX].map((x, side) => (
            <g key={`wlab${side}`}>
              {Array.from({ length: wallStacks }).map((_, i) => {
                const stackY = groundY - (i + 0.5) * panelH;
                if (stackY < eaveY + 0.05) return null;
                return (
                  <PartLabel
                    key={i}
                    x={x + (side === 0 ? 0.55 : -0.55)}
                    y={stackY}
                    label={`thermoline ${fmt(panelW, 0)}×${fmt(panelH, 0)}`}
                    code={`MAL-W-${i + 1}`}
                    rotate={90}
                  />
                );
              })}
              {customWallInfill && (
                <PartLabel
                  x={x + (side === 0 ? 0.55 : -0.55)}
                  y={eaveY + customWallInfill.height / 2}
                  label="custom infill"
                  code={`${fmt(panelW, 0)}×${fmt(customWallInfill.height)}`}
                  rotate={90}
                />
              )}
              {/* Rafter flap label rotated along leg */}
              <PartLabel
                x={x + (side === 0 ? -0.45 : 0.45)}
                y={(groundY + eaveY) / 2}
                label="rafter flap"
                code={`${input.rafterFlapWidth ?? 0.4}×${input.roofRafterLength ?? 10}m`}
                rotate={90}
              />
            </g>
          ))}

          {/* Roof panel labels (centered along each slope segment) */}
          {[0, 1].map((side) => {
            const labels: ReactElement[] = [];
            const dir = side === 0 ? 1 : -1;
            const startX = side === 0 ? leftX : rightX;
            const segCount = roofPanelsPerSide;
            let cursorPlan = 0;
            let cursorRise = 0;
            if (customRoofEave) {
              const lx = startX + dir * eaveCutPlan / 2;
              const ly = eaveY - eaveCutRise / 2;
              labels.push(<PartLabel key={`re${side}`} x={lx + dir * 0.4} y={ly - 0.25} label="roof eave" code={`${fmt(panelW, 0)}×${fmt(customRoofEave.height)}`} />);
              cursorPlan += eaveCutPlan;
              cursorRise += eaveCutRise;
            }
            for (let i = 0; i < segCount; i++) {
              const lx = startX + dir * (cursorPlan + segPlan / 2);
              const ly = eaveY - (cursorRise + segRise / 2);
              labels.push(<PartLabel key={`r${side}-${i}`} x={lx} y={ly - 0.3} label={`thermoline ${fmt(panelW, 0)}×${fmt(panelH, 0)}`} code={`MAL-R-${i + 1}`} />);
              cursorPlan += segPlan;
              cursorRise += segRise;
            }
            return <g key={`rl${side}`}>{labels}</g>;
          })}

          {/* Apex part label with leader line */}
          <line x1={midX} y1={ridgeY} x2={midX + 1.5} y2={ridgeY - 0.8} stroke={CAD_COLORS.dim} strokeWidth={CAD_STROKE_THIN} />
          <PartLabel x={midX + 1.6} y={ridgeY - 0.95} label="apex fitting piece" code={`${Math.round(apexWidth * 1000)}mm`} anchor="start" />

          {/* Tick marks at panel joins */}
          {wallTicks.map((t, i) => <TickMark key={`wt${i}`} x={t.x} y={t.y} angle={45} />)}
          {roofTicks.map((t, i) => <TickMark key={`rt${i}`} x={t.x} y={t.y} angle={t.angle} />)}
          {/* Eave junction ticks */}
          <TickMark x={leftX} y={eaveY} angle={45} />
          <TickMark x={rightX} y={eaveY} angle={135} />

          {/* Eave height dimension on the right */}
          <DimLine x1={rightX + 1.2} y1={groundY} x2={rightX + 1.2} y2={eaveY} label={`${fmt(eaveHeight)}m`} offset={0.25} />
          <line x1={rightX + 0.2} y1={groundY} x2={rightX + 1.4} y2={groundY} stroke={CAD_COLORS.dim} strokeWidth={CAD_STROKE_THIN} strokeDasharray="0.08,0.08" />
          <line x1={rightX + 0.2} y1={eaveY} x2={rightX + 1.4} y2={eaveY} stroke={CAD_COLORS.dim} strokeWidth={CAD_STROKE_THIN} strokeDasharray="0.08,0.08" />

          {/* Total ridge height dimension */}
          <DimLine x1={rightX + 2.2} y1={groundY} x2={rightX + 2.2} y2={ridgeY} label={`${fmt(result.ridgeHeightTotal)}m`} offset={0.25} />
          <line x1={rightX + 1.4} y1={ridgeY} x2={rightX + 2.4} y2={ridgeY} stroke={CAD_COLORS.dim} strokeWidth={CAD_STROKE_THIN} strokeDasharray="0.08,0.08" />

          {/* Width dimension at bottom */}
          <DimLine x1={leftX} y1={groundY + 1.4} x2={rightX} y2={groundY + 1.4} label={`${fmt(width)}m`} offset={0.25} />

          {/* 250mm seal callouts */}
          <text x={leftX - 3.2} y={groundY - 0.3} fontSize={CAD_FONT_SM} fill={CAD_COLORS.dim} style={{ fontFamily: "ui-sans-serif, system-ui" }}>
            <tspan x={leftX - 3.2} dy="0">250mm seal</tspan>
            <tspan x={leftX - 3.2} dy="1.1em">on floor</tspan>
          </text>
          <line x1={leftX - 1.2} y1={groundY - 0.1} x2={leftX - 0.05} y2={groundY - 0.1} stroke={CAD_COLORS.dim} strokeWidth={CAD_STROKE_THIN} />

          {/* Legend top-right */}
          <Legend
            x={vbW - padR + 0.3}
            y={padT + 0.2}
            items={[
              { color: CAD_COLORS.panelEdgeGreen, label: "bottom-edge gable" },
              { color: CAD_COLORS.panelEdgeBlue, label: "top-edge standard" },
              { color: CAD_COLORS.panelEdgePink, label: "bottom-edge standard" },
            ]}
            width={vbW - (vbW - padR + 0.3) - 0.3}
          />

          {/* Title block bottom-right */}
          <TitleBlock
            x={vbW - padR + 0.3}
            y={vbH - padB + 0.3}
            width={vbW - (vbW - padR + 0.3) - 0.3}
            project="Marquee Lining"
            dims={`${fmt(length, 0)}×${fmt(width, 0)}m`}
          />
        </CadFrame>

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
