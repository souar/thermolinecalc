import { ReactNode } from "react";

// Shared CAD-style SVG primitives. All sizes are in the parent SVG's user units
// (typically metres). Stroke widths and font sizes are intentionally tiny so
// they read as fine line-work when the SVG is scaled up.

export const CAD_STROKE = 0.025;
export const CAD_STROKE_THIN = 0.015;
export const CAD_STROKE_THICK = 0.05;
export const CAD_FONT = 0.22;
export const CAD_FONT_SM = 0.16;
export const CAD_FONT_XS = 0.13;

export const CAD_COLORS = {
  outline: "#1a1a1a",
  beam: "#222",
  panelEdgeGreen: "#2e9b4f",
  panelEdgeBlue: "#2563c4",
  panelEdgePink: "#d4467a",
  fillGable: "#bfe3c4",
  fillApex: "#f6c6d4",
  fillUpperRoof: "#cfe1f4",
  fillLowerRoof: "#d8efe7",
  fillKeder: "#e9c9a3",
  tick: "#d22",
  dim: "#444",
  arrow: "#1a1a1a",
};

interface DimLineProps {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label: string;
  offset?: number; // perpendicular offset for label
  fontSize?: number;
}

/** Dimension line with arrowheads at both ends and a centred label. */
export function DimLine({ x1, y1, x2, y2, label, offset = 0.18, fontSize = CAD_FONT_SM }: DimLineProps) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len; // perpendicular
  const ny = dx / len;
  const ah = 0.12; // arrow length
  const aw = 0.06; // arrow width
  // unit along
  const ux = dx / len;
  const uy = dy / len;
  // label position (offset perpendicular)
  const lx = (x1 + x2) / 2 + nx * offset;
  const ly = (y1 + y2) / 2 + ny * offset;
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  const arrow1 = `${x1},${y1} ${x1 + ux * ah - nx * aw},${y1 + uy * ah - ny * aw} ${x1 + ux * ah + nx * aw},${y1 + uy * ah + ny * aw}`;
  const arrow2 = `${x2},${y2} ${x2 - ux * ah - nx * aw},${y2 - uy * ah - ny * aw} ${x2 - ux * ah + nx * aw},${y2 - uy * ah + ny * aw}`;
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={CAD_COLORS.dim} strokeWidth={CAD_STROKE_THIN} />
      <polygon points={arrow1} fill={CAD_COLORS.dim} />
      <polygon points={arrow2} fill={CAD_COLORS.dim} />
      <text
        x={lx}
        y={ly}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={fontSize}
        fill={CAD_COLORS.dim}
        transform={`rotate(${angle} ${lx} ${ly})`}
        style={{ fontFamily: "ui-monospace, monospace" }}
      >
        {label}
      </text>
    </g>
  );
}

/** Short red diagonal tick mark indicating a panel join. */
export function TickMark({ x, y, angle = 45, size = 0.18 }: { x: number; y: number; angle?: number; size?: number }) {
  const rad = (angle * Math.PI) / 180;
  const dx = (Math.cos(rad) * size) / 2;
  const dy = (Math.sin(rad) * size) / 2;
  return <line x1={x - dx} y1={y - dy} x2={x + dx} y2={y + dy} stroke={CAD_COLORS.tick} strokeWidth={CAD_STROKE_THICK} />;
}

interface PartLabelProps {
  x: number;
  y: number;
  label: string;
  code?: string;
  rotate?: number;
  fontSize?: number;
  anchor?: "start" | "middle" | "end";
}

/** Italic two-line part label (description + part code). */
export function PartLabel({ x, y, label, code, rotate = 0, fontSize = CAD_FONT_XS, anchor = "middle" }: PartLabelProps) {
  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      dominantBaseline="middle"
      fontSize={fontSize}
      fontStyle="italic"
      fill={CAD_COLORS.outline}
      transform={rotate ? `rotate(${rotate} ${x} ${y})` : undefined}
      style={{ fontFamily: "ui-serif, Georgia, serif" }}
    >
      <tspan x={x} dy="0">{label}</tspan>
      {code && <tspan x={x} dy="1.15em" fontStyle="normal" fontSize={fontSize * 0.9} fill={CAD_COLORS.dim}>{code}</tspan>}
    </text>
  );
}

interface LegendItem {
  color: string;
  label: string;
}

/** Top-right colored line legend. */
export function Legend({ x, y, items, width = 3.5, fontSize = CAD_FONT_XS }: { x: number; y: number; items: LegendItem[]; width?: number; fontSize?: number }) {
  const pad = 0.2;
  const lh = 0.32;
  const h = pad * 2 + items.length * lh;
  return (
    <g>
      <rect x={x} y={y} width={width} height={h} fill="#fff" stroke={CAD_COLORS.outline} strokeWidth={CAD_STROKE_THIN} />
      {items.map((it, i) => {
        const cy = y + pad + i * lh + lh / 2;
        return (
          <g key={i}>
            <line x1={x + pad} y1={cy} x2={x + pad + 0.55} y2={cy} stroke={it.color} strokeWidth={CAD_STROKE_THICK} />
            <text x={x + pad + 0.7} y={cy} dominantBaseline="middle" fontSize={fontSize} fill={CAD_COLORS.outline} style={{ fontFamily: "ui-sans-serif, system-ui" }}>
              {it.label}
            </text>
          </g>
        );
      })}
    </g>
  );
}

interface TitleBlockProps {
  x: number;
  y: number;
  width?: number;
  project: string;
  dims: string;
  date?: string;
  fontSize?: number;
}

/** Bottom-right project info block. */
export function TitleBlock({ x, y, width = 4.5, project, dims, date, fontSize = CAD_FONT_XS }: TitleBlockProps) {
  const lh = 0.32;
  const lines = [
    { k: "PROJECT", v: project },
    { k: "SIZE", v: dims },
    { k: "DATE", v: date ?? new Date().toISOString().slice(0, 10) },
  ];
  const h = lines.length * lh + 0.2;
  return (
    <g>
      <rect x={x} y={y} width={width} height={h} fill="#fff" stroke={CAD_COLORS.outline} strokeWidth={CAD_STROKE_THIN} />
      {lines.map((ln, i) => {
        const cy = y + 0.1 + i * lh + lh / 2;
        return (
          <g key={i}>
            <text x={x + 0.15} y={cy} dominantBaseline="middle" fontSize={fontSize} fill={CAD_COLORS.dim} style={{ fontFamily: "ui-sans-serif, system-ui" }}>{ln.k}</text>
            <text x={x + width - 0.15} y={cy} textAnchor="end" dominantBaseline="middle" fontSize={fontSize} fill={CAD_COLORS.outline} fontWeight={600} style={{ fontFamily: "ui-sans-serif, system-ui" }}>{ln.v}</text>
            {i < lines.length - 1 && <line x1={x} y1={y + 0.1 + (i + 1) * lh} x2={x + width} y2={y + 0.1 + (i + 1) * lh} stroke={CAD_COLORS.outline} strokeWidth={CAD_STROKE_THIN} opacity={0.3} />}
          </g>
        );
      })}
    </g>
  );
}

/** White CAD canvas wrapper — provides white background & frame. */
export function CadFrame({ children, vbW, vbH }: { children: ReactNode; vbW: number; vbH: number }) {
  return (
    <div className="rounded-lg border border-border bg-white p-4">
      <svg viewBox={`0 0 ${vbW} ${vbH}`} className="mx-auto h-auto w-full max-h-[70vh]" preserveAspectRatio="xMidYMid meet">
        <rect x={0} y={0} width={vbW} height={vbH} fill="#fff" />
        {children}
      </svg>
    </div>
  );
}
