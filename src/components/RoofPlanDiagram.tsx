import { CalcInput, CalcResult, fmt } from "@/lib/calculator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CadFrame, CAD_COLORS, CAD_STROKE, CAD_STROKE_THIN, CAD_FONT_SM, DimLine, Legend, TitleBlock } from "./diagrams/cad";

interface Props {
  input: CalcInput;
  result: CalcResult;
}

/**
 * Top-down roof plan: shows the full marquee footprint divided into bays
 * (vertical columns) and roof zones (horizontal bands from eave → ridge → eave),
 * with X-pattern bracing and dimension callouts on bottom and left.
 */
export function RoofPlanDiagram({ input, result }: Props) {
  const { length, width, baySize } = input;
  const { bays, slopeLength, apexWidth } = result;

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

  // Use length × width directly as svg coords (metres).
  const planW = length;
  const planH = width;
  const vbW = planW + padL + padR;
  const vbH = planH + padT + padB;
  const ox = padL;
  const oy = padT;

  // Roof bands (top→bottom in plan view): lower-roof (eave), upper-roof, apex ridge, upper-roof, lower-roof (eave).
  // Each band's plan-projected width = (slope segment length × width / slopeLength).
  const apexPlan = (apexWidth / 2) * (width / slopeLength) * 2; // total apex band
  const remaining = (planH - apexPlan) / 2; // each side
  const lowerBand = remaining * 0.55;
  const upperBand = remaining * 0.45;

  const yEaveTop = oy;
  const yLowerToUpper = oy + lowerBand;
  const yUpperToApex = oy + lowerBand + upperBand;
  const yApexToUpper = yUpperToApex + apexPlan;
  const yUpperToLower = yApexToUpper + upperBand;
  const yEaveBot = oy + planH;

  const bandLetters = ["A", "B", "C", "D", "E"];
  const bandYs = [
    (yEaveTop + yLowerToUpper) / 2,
    (yLowerToUpper + yUpperToApex) / 2,
    (yUpperToApex + yApexToUpper) / 2,
    (yApexToUpper + yUpperToLower) / 2,
    (yUpperToLower + yEaveBot) / 2,
  ];

  const bayJunctionXs = Array.from({ length: bays + 1 }).map((_, i) => ox + i * baySize);

  const tags = ["RB", "VB", "NB", "NB", "NB", "NB", "VB", "RB"];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Roof plan (top-down)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <CadFrame vbW={vbW} vbH={vbH}>
          {/* Color band fills */}
          <rect x={ox} y={yEaveTop} width={planW} height={lowerBand} fill={CAD_COLORS.fillLowerRoof} />
          <rect x={ox} y={yLowerToUpper} width={planW} height={upperBand} fill={CAD_COLORS.fillUpperRoof} />
          <rect x={ox} y={yUpperToApex} width={planW} height={apexPlan} fill={CAD_COLORS.fillApex} />
          <rect x={ox} y={yApexToUpper} width={planW} height={upperBand} fill={CAD_COLORS.fillUpperRoof} />
          <rect x={ox} y={yUpperToLower} width={planW} height={lowerBand} fill={CAD_COLORS.fillLowerRoof} />

          {/* Keder track strips along eaves */}
          <rect x={ox} y={yEaveTop - 0.15} width={planW} height={0.15} fill={CAD_COLORS.fillKeder} stroke={CAD_COLORS.outline} strokeWidth={CAD_STROKE_THIN} />
          <rect x={ox} y={yEaveBot} width={planW} height={0.15} fill={CAD_COLORS.fillKeder} stroke={CAD_COLORS.outline} strokeWidth={CAD_STROKE_THIN} />

          {/* Outer outline */}
          <rect x={ox} y={oy} width={planW} height={planH} fill="none" stroke={CAD_COLORS.outline} strokeWidth={CAD_STROKE} />

          {/* Horizontal band lines */}
          {[yLowerToUpper, yUpperToApex, yApexToUpper, yUpperToLower].map((y, i) => (
            <line key={`band${i}`} x1={ox} y1={y} x2={ox + planW} y2={y} stroke={CAD_COLORS.outline} strokeWidth={CAD_STROKE_THIN} />
          ))}

          {/* Bay vertical lines + X bracing per cell */}
          {bayJunctionXs.map((x, i) => (
            <line key={`bay${i}`} x1={x} y1={oy} x2={x} y2={oy + planH} stroke={CAD_COLORS.outline} strokeWidth={CAD_STROKE_THIN} />
          ))}
          {Array.from({ length: bays }).map((_, b) => {
            const x1 = bayJunctionXs[b];
            const x2 = bayJunctionXs[b + 1];
            return [yEaveTop, yLowerToUpper, yUpperToApex, yApexToUpper, yUpperToLower].map((yT, r) => {
              const yB = [yLowerToUpper, yUpperToApex, yApexToUpper, yUpperToLower, yEaveBot][r];
              return (
                <g key={`x${b}-${r}`} opacity={0.35}>
                  <line x1={x1} y1={yT} x2={x2} y2={yB} stroke={CAD_COLORS.dim} strokeWidth={CAD_STROKE_THIN} />
                  <line x1={x2} y1={yT} x2={x1} y2={yB} stroke={CAD_COLORS.dim} strokeWidth={CAD_STROKE_THIN} />
                </g>
              );
            });
          })}

          {/* Bay junction labels (top) — RB/VB/NB pattern */}
          {bayJunctionXs.map((x, i) => {
            const tag = i === 0 ? "RB" : i === bayJunctionXs.length - 1 ? "RB" : i === 1 || i === bayJunctionXs.length - 2 ? "VB" : "NB";
            return (
              <text key={`tag${i}`} x={x} y={oy - 0.7} textAnchor="middle" fontSize={CAD_FONT_SM} fill={CAD_COLORS.outline} fontWeight={600} style={{ fontFamily: "ui-sans-serif, system-ui" }}>{tag}</text>
            );
          })}

          {/* Bay numbers (bottom inside) */}
          {bayJunctionXs.map((x, i) => (
            <text key={`bn${i}`} x={x} y={oy + planH + 0.8} textAnchor="middle" fontSize={CAD_FONT_SM} fill={CAD_COLORS.dim} style={{ fontFamily: "ui-monospace, monospace" }}>{i + 1}</text>
          ))}

          {/* Band letters (left) */}
          {bandLetters.map((l, i) => (
            <text key={`bl${i}`} x={ox - 1} y={bandYs[i]} textAnchor="middle" dominantBaseline="middle" fontSize={CAD_FONT_SM} fill={CAD_COLORS.outline} fontWeight={600} style={{ fontFamily: "ui-sans-serif, system-ui" }}>{l}</text>
          ))}

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

          {/* Left side dimensions per band */}
          <DimLine x1={ox - 2.5} y1={yEaveTop} x2={ox - 2.5} y2={yLowerToUpper} label="A" />
          <DimLine x1={ox - 2.5} y1={yLowerToUpper} x2={ox - 2.5} y2={yUpperToApex} label="B" />
          <DimLine x1={ox - 2.5} y1={yUpperToApex} x2={ox - 2.5} y2={yApexToUpper} label="C" />
          <DimLine x1={ox - 2.5} y1={yApexToUpper} x2={ox - 2.5} y2={yUpperToLower} label="D" />
          <DimLine x1={ox - 2.5} y1={yUpperToLower} x2={ox - 2.5} y2={yEaveBot} label="E" />
          {/* Total width */}
          <DimLine x1={ox - 4.5} y1={oy} x2={ox - 4.5} y2={oy + planH} label={`${fmt(width)}m`} />

          {/* Legend */}
          <Legend
            x={vbW - padR + 0.3}
            y={padT + 0.2}
            items={[
              { color: CAD_COLORS.fillApex, label: "Apex Ridge" },
              { color: CAD_COLORS.fillUpperRoof, label: "Upper Roof" },
              { color: CAD_COLORS.fillLowerRoof, label: "Lower Roof" },
              { color: CAD_COLORS.fillKeder, label: "Keder Track" },
            ]}
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
