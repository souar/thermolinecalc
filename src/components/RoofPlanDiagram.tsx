import { CalcInput, CalcResult, fmt } from "@/lib/calculator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CadFrame, CAD_COLORS, CAD_STROKE, CAD_STROKE_THIN, CAD_FONT_SM, DimLine, Legend, TitleBlock } from "./diagrams/cad";

interface Props {
  input: CalcInput;
  result: CalcResult;
  projectName?: string;
  variantName?: string | null;
}

/**
 * Top-down roof plan: shows the full marquee footprint divided into bays
 * (vertical columns) and roof zones (horizontal bands from eave → ridge → eave).
 * Bands are computed dynamically from `roofPanelsPerSide`, `customRoofEave`
 * and `apexWidth` so the diagram matches the actual lining quantities.
 */
export function RoofPlanDiagram({ input, result, projectName, variantName }: Props) {
  const { length, width, baySize, panelH: panelHInput } = input;
  const { bays, slopeLength, apexWidth, roofPanelsPerSide, roofPanelHeight, customRoofEave } = result;

  if (input.lineRoof === false) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Roof plan (top-down)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-dashed border-border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
            Roof not lined — enable "Roof" in the marquee specification to see the roof plan.
          </div>
        </CardContent>
      </Card>
    );
  }

  const padL = 6;
  const padR = 10;
  const padT = 3;
  const padB = 5;

  const planW = length;
  const planH = width;
  const vbW = planW + padL + padR;
  const vbH = planH + padT + padB;
  const ox = padL;
  const oy = padT;

  // Plan-projection scale: slope-metres → plan-metres along the width axis.
  const projScale = slopeLength > 0 ? width / (2 * slopeLength) : 1;

  // Build the band stack for ONE side (eave → ridge), then mirror for the other side.
  // Each band: { kind, slopeH (m along slope), label }
  type Band = { kind: "panel" | "eaveCut" | "apex"; slopeH: number; label: string };
  const sideBands: Band[] = [];

  const hasEaveCut = !!customRoofEave && customRoofEave.height > 1e-6;
  const fullPanelSlopeH = roofPanelsPerSide === 1 && !hasEaveCut ? roofPanelHeight : (panelHInput ?? roofPanelHeight);

  if (hasEaveCut) {
    sideBands.push({ kind: "eaveCut", slopeH: customRoofEave!.height, label: "Eave cut" });
  }
  for (let i = 0; i < roofPanelsPerSide; i++) {
    sideBands.push({ kind: "panel", slopeH: fullPanelSlopeH, label: "Roof panel" });
  }

  // Apex is a single continuous strip along the ridge (apexWidth is measured along the slope).
  const fullStack: Band[] = [
    ...sideBands,
    ...(apexWidth > 1e-6 ? [{ kind: "apex" as const, slopeH: apexWidth, label: "Apex" }] : []),
    ...[...sideBands].reverse(),
  ];

  // Convert each band slope-height to plan-projection height (m) along the width axis.
  const bandsPx = fullStack.map((b) => ({ ...b, planH: b.slopeH * projScale }));

  // Normalise so the stack exactly fills planH (handles rounding / overhang).
  const totalPlanH = bandsPx.reduce((s, b) => s + b.planH, 0);
  const scale = totalPlanH > 0 ? planH / totalPlanH : 1;
  const bandsScaled = bandsPx.map((b) => ({ ...b, planH: b.planH * scale }));

  // Compute Y boundaries.
  const ys: number[] = [oy];
  for (const b of bandsScaled) ys.push(ys[ys.length - 1] + b.planH);

  const bayJunctionXs = Array.from({ length: bays + 1 }).map((_, i) => ox + i * baySize);

  // Letter labels A, B, C... for each band
  const letterFor = (i: number) => String.fromCharCode(65 + i);

  // Legend: only show what's present
  const legendItems = [
    { color: CAD_COLORS.fillLowerRoof, label: "Roof Panel" },
    ...(apexWidth > 1e-6 ? [{ color: CAD_COLORS.fillApex, label: "Apex Ridge" }] : []),
    ...(hasEaveCut ? [{ color: CAD_COLORS.fillKeder, label: "Eave Cut" }] : []),
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Roof plan (top-down)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <CadFrame vbW={vbW} vbH={vbH}>
          {/* Band fills */}
          {bandsScaled.map((b, i) => {
            const fill =
              b.kind === "apex"
                ? CAD_COLORS.fillApex
                : b.kind === "eaveCut"
                  ? CAD_COLORS.fillKeder
                  : CAD_COLORS.fillLowerRoof;
            return (
              <rect key={`band${i}`} x={ox} y={ys[i]} width={planW} height={b.planH} fill={fill} />
            );
          })}

          {/* Keder track strips along eaves */}
          <rect x={ox} y={oy - 0.15} width={planW} height={0.15} fill={CAD_COLORS.fillKeder} stroke={CAD_COLORS.outline} strokeWidth={CAD_STROKE_THIN} />
          <rect x={ox} y={oy + planH} width={planW} height={0.15} fill={CAD_COLORS.fillKeder} stroke={CAD_COLORS.outline} strokeWidth={CAD_STROKE_THIN} />

          {/* Outer outline */}
          <rect x={ox} y={oy} width={planW} height={planH} fill="none" stroke={CAD_COLORS.outline} strokeWidth={CAD_STROKE} />

          {/* Horizontal band lines */}
          {ys.slice(1, -1).map((y, i) => (
            <line key={`bl${i}`} x1={ox} y1={y} x2={ox + planW} y2={y} stroke={CAD_COLORS.outline} strokeWidth={CAD_STROKE_THIN} />
          ))}

          {/* Bay vertical lines + X bracing per cell */}
          {bayJunctionXs.map((x, i) => (
            <line key={`bay${i}`} x1={x} y1={oy} x2={x} y2={oy + planH} stroke={CAD_COLORS.outline} strokeWidth={CAD_STROKE_THIN} />
          ))}
          {Array.from({ length: bays }).map((_, b) => {
            const x1 = bayJunctionXs[b];
            const x2 = bayJunctionXs[b + 1];
            return bandsScaled.map((_band, r) => {
              const yT = ys[r];
              const yB = ys[r + 1];
              return (
                <g key={`x${b}-${r}`} opacity={0.35}>
                  <line x1={x1} y1={yT} x2={x2} y2={yB} stroke={CAD_COLORS.dim} strokeWidth={CAD_STROKE_THIN} />
                  <line x1={x2} y1={yT} x2={x1} y2={yB} stroke={CAD_COLORS.dim} strokeWidth={CAD_STROKE_THIN} />
                </g>
              );
            });
          })}

          {/* Bay junction tags (top) — RB at ends, VB next, NB middle */}
          {bayJunctionXs.map((x, i) => {
            const tag = i === 0 || i === bayJunctionXs.length - 1 ? "RB" : i === 1 || i === bayJunctionXs.length - 2 ? "VB" : "NB";
            return (
              <text key={`tag${i}`} x={x} y={oy - 0.7} textAnchor="middle" fontSize={CAD_FONT_SM} fill={CAD_COLORS.outline} fontWeight={600} style={{ fontFamily: "ui-sans-serif, system-ui" }}>{tag}</text>
            );
          })}

          {/* Bay numbers (bottom inside) */}
          {bayJunctionXs.map((x, i) => (
            <text key={`bn${i}`} x={x} y={oy + planH + 0.8} textAnchor="middle" fontSize={CAD_FONT_SM} fill={CAD_COLORS.dim} style={{ fontFamily: "ui-monospace, monospace" }}>{i + 1}</text>
          ))}

          {/* Band letters (left, centred in each band) */}
          {bandsScaled.map((_b, i) => {
            const cy = (ys[i] + ys[i + 1]) / 2;
            return (
              <text key={`bll${i}`} x={ox - 1} y={cy} textAnchor="middle" dominantBaseline="middle" fontSize={CAD_FONT_SM} fill={CAD_COLORS.outline} fontWeight={600} style={{ fontFamily: "ui-sans-serif, system-ui" }}>{letterFor(i)}</text>
            );
          })}

          {/* Bottom dimension lines (per-bay) */}
          {Array.from({ length: bays }).map((_, b) => (
            <DimLine
              key={`dimb${b}`}
              x1={bayJunctionXs[b]}
              y1={oy + planH + 1.8}
              x2={bayJunctionXs[b + 1]}
              y2={oy + planH + 1.8}
              label={`${Math.round(baySize * 1000)}`}
            />
          ))}
          {/* Total length */}
          <DimLine
            x1={ox}
            y1={oy + planH + 3.5}
            x2={ox + planW}
            y2={oy + planH + 3.5}
            label={`${fmt(length)}m`}
          />

          {/* Left side dimensions per band — show actual band height in mm */}
          {bandsScaled.map((b, i) => (
            <DimLine
              key={`dl${i}`}
              x1={ox - 2.5}
              y1={ys[i]}
              x2={ox - 2.5}
              y2={ys[i + 1]}
              label={`${letterFor(i)} ${Math.round(b.slopeH * 1000)}`}
            />
          ))}
          {/* Total width */}
          <DimLine x1={ox - 4.5} y1={oy} x2={ox - 4.5} y2={oy + planH} label={`${fmt(width)}m`} />

          {/* Legend */}
          <Legend
            x={vbW - padR + 0.3}
            y={padT + 0.2}
            items={legendItems}
            width={vbW - (vbW - padR + 0.3) - 0.3}
          />

          {/* Title block */}
          <TitleBlock
            x={vbW - padR + 0.3}
            y={vbH - padB + 0.3}
            width={vbW - (vbW - padR + 0.3) - 0.3}
            project="Roof Assembly Plan"
            dims={`${fmt(length, 0)}×${fmt(width, 0)}m`}
          />
        </CadFrame>
      </CardContent>
    </Card>
  );
}
