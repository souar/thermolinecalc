// Marquee lining geometry & quantity calculator.
// All units in metres unless noted.
// Billing model: m² = panel count × actual panel size (no trim discount).

export const SECTION_KEYS = [
  { key: 'roof', label: 'Roof' },
  { key: 'walls', label: 'Walls' },
  { key: 'gable_walls', label: 'Gable walls' },
  { key: 'gable_triangles', label: 'Gable triangles' },
  { key: 'apex', label: 'Apex' },
  { key: 'eave', label: 'Eave' },
  { key: 'wall_infill', label: 'Wall infill' },
  { key: 'roof_rafters', label: 'Roof rafters' },
  { key: 'leg_rafters', label: 'Leg rafters' },
] as const;
export type SectionKey = (typeof SECTION_KEYS)[number]['key'];

export interface CalcInput {
  length: number;
  width: number;
  eaveHeight: number;
  pitchDeg: number;
  baySize: number;
  /** Variant id from lining_variants. May be empty when none selected. */
  liningType: string;
  roofOverhangEnabled: boolean;
  wallFloorSealEnabled: boolean;
  apexOverride?: number | null;
  roofRaftersEnabled?: boolean;
  legRaftersEnabled?: boolean;
  rafterFlapWidth?: number;
  roofRafterLength?: number;
  costPerM2?: number;
  weightPerM2?: number;
  /** Override panel width from pricing row. Falls back to LINING_TYPES default. */
  panelW?: number;
  /** Override panel height from pricing row. Falls back to LINING_TYPES default. */
  panelH?: number;
  // Section selection — which parts of the marquee are being lined
  lineRoof?: boolean;
  lineWalls?: boolean;
  lineGableWalls?: boolean;
  lineGableTriangles?: boolean;
  lineApex?: boolean;
}

export interface CustomInfill {
  height: number;
  panelsCount: number;
  m2: number;
}

export type GablePiece =
  | { kind: "triangle"; base: number; height: number; m2: number; weight: number }
  | { kind: "infill"; base: number; height: number; m2: number; weight: number };

export interface CalcResult {
  // geometry
  slopeLength: number;
  ridgeHeight: number; // apex rise above eave (internal use)
  ridgeHeightTotal: number; // total ground-to-peak
  bays: number;

  // walls (long sides)
  wallsM2: number;
  wallsPanels: number;
  wallStacks: number;
  customWallInfill: CustomInfill | null;

  // roof (full panels only)
  roofM2: number;
  roofPanels: number;
  roofPanelsPerSide: number;
  roofPanelHeight: number;
  wallPanelHeight: number;
  customRoofEave: CustomInfill | null;

  // apex (custom strip)
  apexWidth: number;
  apexAuto: number; // geometric leftover (before override / overlap absorption)
  apexM2: number;
  apexPieces: number; // one per bay

  // gable walls (rectangular fill below eave on each end)
  gableWallsM2: number;
  gableWallsPanels: number;

  // gable triangles (custom) — pieces per bay-slice
  gableTriM2: number;
  gableTriCount: number; // triangle pieces total (both ends)
  gableInfillCount: number; // custom infill pieces total (both ends)
  gableInfillM2: number;
  gableTriSlices: Array<{
    base: number;
    hInner: number;
    hOuter: number;
    pieces: GablePiece[];
  }>;

  // totals
  totalM2: number;
  totalPanels: number;
  totalWeightKg: number;
  totalCost: number;

  // rafter covers
  roofRafterCovers: {
    countRafters: number;
    flapsPerRafter: number;
    flapLength: number;
    customLastFlap: number | null;
    fullPanels: number;
    customPanels: number;
    m2: number;
    panels: number;
  } | null;
  legRafterCovers: {
    count: number;
    legLength: number;
    m2: number;
    panels: number;
  } | null;

  warnings: string[];
}

const OVERHANG = 0.25;
const FLOOR_SEAL = 0.25;
const RAFTER_FLAP_DEFAULT = 0.4;
const RAFTER_LENGTH_DEFAULT = 10;
const RAFTER_OVERLAP = 0.15;

export function calculate(input: CalcInput): CalcResult {
  const {
    length,
    width,
    eaveHeight,
    pitchDeg,
    baySize,
    roofOverhangEnabled,
    wallFloorSealEnabled,
    apexOverride,
    costPerM2 = 0,
    weightPerM2 = 0,
  } = input;

  const lineRoof = input.lineRoof !== false;
  const lineWalls = input.lineWalls !== false;
  const lineGableWalls = input.lineGableWalls !== false;
  const lineGableTriangles = input.lineGableTriangles !== false;
  const lineApex = input.lineApex !== false;

  const panelW = input.panelW && input.panelW > 0 ? input.panelW : 5;
  const panelH = input.panelH && input.panelH > 0 ? input.panelH : 5;
  const panelArea = panelW * panelH;

  const warnings: string[] = [];

  // ---- Geometry ----
  const pitchRad = (pitchDeg * Math.PI) / 180;
  const halfWidth = width / 2;
  const slopeLength = halfWidth / Math.cos(pitchRad);
  const ridgeHeight = halfWidth * Math.tan(pitchRad);
  const bays = Math.max(1, Math.round(length / baySize));

  // ---- Roof + Apex ----
  // Roof drop past eave is absorbed into apex (keeps wall panels full size).
  const roofOverlap = roofOverhangEnabled ? OVERHANG : 0;
  const effectiveSlope = slopeLength + roofOverlap;

  const apexMax = Math.max(panelW, panelH);
  let apexAuto: number;
  let roofPanelsPerSide: number;
  let roofM2PerPanel: number;
  let roofPanelHeight = panelH;
  let customRoofEave: CustomInfill | null = null;

  if (effectiveSlope <= panelH + 1e-6) {
    // Slope fits within a single panel — one cut panel per side per bay
    roofPanelsPerSide = 1;
    roofPanelHeight = effectiveSlope;
    roofM2PerPanel = panelW * effectiveSlope;
    apexAuto = 0;
  } else {
    const fullRows = Math.floor(effectiveSlope / panelH);
    const remainingPerSide = effectiveSlope - fullRows * panelH;
    const naturalApex = remainingPerSide * 2;

    roofPanelsPerSide = fullRows;
    roofM2PerPanel = panelArea;

    if (naturalApex <= apexMax + 1e-6) {
      apexAuto = naturalApex;
    } else {
      // Apex would exceed panel max — narrow apex to panelMax and absorb the
      // excess per side into a custom-cut eave panel.
      apexAuto = apexMax;
      const eaveCutHeight = remainingPerSide - apexMax / 2;
      if (eaveCutHeight > 1e-6) {
        const eaveCount = bays * 2;
        customRoofEave = {
          height: eaveCutHeight,
          panelsCount: eaveCount,
          m2: eaveCount * panelW * eaveCutHeight,
        };
      }
    }
  }

  const apexWidth = apexOverride != null && apexOverride > 0 ? apexOverride : apexAuto;
  if (apexOverride != null && apexOverride > apexMax) {
    warnings.push(
      `Apex override ${apexOverride}m exceeds max panel size ${apexMax}m — apex pieces are custom-cut from a single panel.`,
    );
  }

  let roofPanels = roofPanelsPerSide * 2 * bays;
  let roofM2 = roofPanels * roofM2PerPanel;

  let apexPieces = apexWidth > 1e-6 ? bays : 0;
  let apexM2 = apexWidth * baySize * bays;

  if (!lineRoof) {
    roofPanels = 0;
    roofM2 = 0;
    customRoofEave = null;
    apexPieces = 0;
    apexM2 = 0;
  } else if (!lineApex) {
    apexPieces = 0;
    apexM2 = 0;
  }

  // ---- Walls (long sides) ----
  const wallHeight = eaveHeight + (wallFloorSealEnabled ? FLOOR_SEAL : 0);
  let wallStacks: number;
  let wallsPanels: number;
  let wallsM2: number;
  let customWallInfill: CustomInfill | null = null;
  let fullStacks = 0;
  let wallPanelHeight = panelH;

  if (wallHeight <= panelH + 1e-6) {
    // Wall fits within a single panel — one cut panel per bay-side
    wallStacks = 1;
    wallsPanels = bays * 2;
    wallPanelHeight = wallHeight;
    wallsM2 = wallsPanels * panelW * wallHeight;
  } else {
    fullStacks = Math.floor(wallHeight / panelH);
    const leftover = wallHeight - fullStacks * panelH;
    wallStacks = fullStacks;
    wallsPanels = bays * 2 * fullStacks;
    wallsM2 = wallsPanels * panelArea;

    if (leftover > 1e-6) {
      if (leftover <= OVERHANG && roofOverhangEnabled) {
        warnings.push(
          `Wall has ${(leftover * 1000).toFixed(0)}mm excess above ${fullStacks} × ${panelH}m — absorbed by 250mm roof overhang.`,
        );
      } else {
        const infillCount = bays * 2;
        customWallInfill = {
          height: leftover,
          panelsCount: infillCount,
          m2: infillCount * panelW * leftover,
        };
        warnings.push(
          `Wall height ${wallHeight.toFixed(2)}m exceeds ${fullStacks} × ${panelH}m — added ${infillCount} custom infill panels at ${leftover.toFixed(2)}m tall.`,
        );
      }
    }
  }

  // Gate walls
  if (!lineWalls) {
    wallsPanels = 0;
    wallsM2 = 0;
    customWallInfill = null;
  }

  // ---- Gable walls (rectangle below eave on each end) ----
  const gableStacks = wallHeight <= panelH + 1e-6 ? 1 : Math.max(1, fullStacks);
  const gablePerPanelArea = panelW * Math.min(panelH, wallHeight / gableStacks);
  const gableWallsPanelsPerEnd = Math.ceil(width / panelW) * gableStacks;
  let gableWallsPanels = gableWallsPanelsPerEnd * 2;
  let gableWallsM2 = gableWallsPanels * gablePerPanelArea;
  if (!lineGableWalls) {
    gableWallsPanels = 0;
    gableWallsM2 = 0;
  }

  // ---- Gable triangles: right-angle slices, base aligned to bay; split by panel size + weight ----
  const halfW = width / 2;
  const slopePerM = halfW > 0 ? ridgeHeight / halfW : 0;
  const slicesPerHalf = Math.max(1, Math.ceil(halfW / baySize));
  const wpm2 = weightPerM2 || 0;
  const maxPieceWeight = wpm2 > 0 ? panelW * panelH * wpm2 : Infinity;

  const gableTriSlices: Array<{ base: number; hInner: number; hOuter: number; pieces: GablePiece[] }> = [];
  let xCursor = 0;
  for (let i = 0; i < slicesPerHalf; i++) {
    const base = Math.min(baySize, halfW - xCursor);
    if (base <= 1e-6) break;
    const hOuter = xCursor * slopePerM;
    const hInner = (xCursor + base) * slopePerM;
    const triH = hInner - hOuter; // = base * slopePerM

    const pieces: GablePiece[] = [];

    if (base > panelW + 1e-6) {
      warnings.push(`Gable slice base ${base.toFixed(2)}m exceeds panel width ${panelW}m.`);
    }

    // Triangle: right-angle, hypotenuse on roof beam, vertical leg = triH on inner edge
    const triArea = (base * triH) / 2;
    const triWeight = triArea * wpm2;
    if (triWeight > maxPieceWeight + 1e-6) {
      warnings.push(
        `Gable triangle (${fmt(base)}×${fmt(triH)}m) weight ${triWeight.toFixed(1)}kg exceeds panel cap ${maxPieceWeight.toFixed(1)}kg — cannot split while keeping hypotenuse on roof slope.`,
      );
    }
    pieces.push({
      kind: "triangle",
      base,
      height: triH,
      m2: triArea,
      weight: triWeight,
    });

    // Infill rectangle below triangle, full base × hOuter, down to eave
    if (hOuter > 1e-6) {
      const totalInfillArea = base * hOuter;
      const totalInfillWeight = totalInfillArea * wpm2;
      const splits = wpm2 > 0 && maxPieceWeight > 0
        ? Math.max(1, Math.ceil(totalInfillWeight / maxPieceWeight))
        : 1;
      const sliceH = hOuter / splits;
      for (let s = 0; s < splits; s++) {
        const m2 = base * sliceH;
        pieces.push({
          kind: "infill",
          base,
          height: sliceH,
          m2,
          weight: m2 * wpm2,
        });
      }
    }

    gableTriSlices.push({ base, hInner, hOuter, pieces });
    xCursor += base;
  }

  // Aggregate per end, then ×2 ends
  let triPerEnd = 0;
  let infillPerEnd = 0;
  let triM2PerEnd = 0;
  let infillM2PerEnd = 0;
  for (const slice of gableTriSlices) {
    for (const p of slice.pieces) {
      if (p.kind === "triangle") {
        triPerEnd += 2; // mirror to other half
        triM2PerEnd += p.m2 * 2;
      } else {
        infillPerEnd += 2;
        infillM2PerEnd += p.m2 * 2;
      }
    }
  }
  let gableTriCount = triPerEnd * 2;
  let gableInfillCount = infillPerEnd * 2;
  const gableTriM2Total = triM2PerEnd * 2;
  let gableInfillM2 = infillM2PerEnd * 2;
  let gableTriM2 = gableTriM2Total + gableInfillM2;
  let gableTriSlicesOut = gableTriSlices;
  if (!lineGableTriangles) {
    gableTriCount = 0;
    gableInfillCount = 0;
    gableInfillM2 = 0;
    gableTriM2 = 0;
    gableTriSlicesOut = [];
  }

  // ---- Rafter covers ----
  const flapWidth = input.rafterFlapWidth && input.rafterFlapWidth > 0 ? input.rafterFlapWidth : RAFTER_FLAP_DEFAULT;
  const rafterLen = input.roofRafterLength && input.roofRafterLength > 0 ? input.roofRafterLength : RAFTER_LENGTH_DEFAULT;
  const raftersPerSide = bays + 1;

  let roofRafterCovers: CalcResult["roofRafterCovers"] = null;
  if (input.roofRaftersEnabled) {
    const countRafters = raftersPerSide * 2;
    const coverLength = slopeLength + RAFTER_OVERLAP;
    const usable = Math.max(0.001, rafterLen - RAFTER_OVERLAP);
    const flapsPerRafter = Math.max(1, Math.ceil((coverLength - RAFTER_OVERLAP) / usable));
    const fullFlapsCovered = (flapsPerRafter - 1) * usable + RAFTER_OVERLAP;
    const lastRaw = coverLength - fullFlapsCovered + RAFTER_OVERLAP;
    const customLastFlap = lastRaw > 0 && lastRaw < rafterLen - 1e-3 ? lastRaw : null;
    const fullFlapsPerRafter = customLastFlap != null ? flapsPerRafter - 1 : flapsPerRafter;
    const fullPanels = fullFlapsPerRafter * countRafters;
    const customPanels = customLastFlap != null ? countRafters : 0;
    const m2 = fullPanels * rafterLen * flapWidth + customPanels * (customLastFlap ?? 0) * flapWidth;
    roofRafterCovers = {
      countRafters,
      flapsPerRafter,
      flapLength: rafterLen,
      customLastFlap,
      fullPanels,
      customPanels,
      m2,
      panels: fullPanels + customPanels,
    };
  }

  let legRafterCovers: CalcResult["legRafterCovers"] = null;
  if (input.legRaftersEnabled) {
    const count = raftersPerSide * 2;
    const legLength = eaveHeight + RAFTER_OVERLAP;
    legRafterCovers = {
      count,
      legLength,
      m2: count * legLength * flapWidth,
      panels: count,
    };
  }

  // ---- Totals ----
  const customM2 = customWallInfill?.m2 ?? 0;
  const eaveM2 = customRoofEave?.m2 ?? 0;
  const rafterM2 = (roofRafterCovers?.m2 ?? 0) + (legRafterCovers?.m2 ?? 0);
  const rafterPanels = (roofRafterCovers?.panels ?? 0) + (legRafterCovers?.panels ?? 0);
  const totalM2 = wallsM2 + customM2 + roofM2 + eaveM2 + apexM2 + gableWallsM2 + gableTriM2 + rafterM2;
  const totalPanels =
    wallsPanels +
    (customWallInfill?.panelsCount ?? 0) +
    roofPanels +
    (customRoofEave?.panelsCount ?? 0) +
    apexPieces +
    gableWallsPanels +
    gableTriCount +
    gableInfillCount +
    rafterPanels;

  // totalWeightKg & totalCost no longer computed here — caller composes via calculateJobCosts.
  const totalWeightKg = 0;
  const totalCost = 0;

  return {
    slopeLength,
    ridgeHeight,
    ridgeHeightTotal: eaveHeight + ridgeHeight,
    bays,
    wallsM2,
    wallsPanels,
    wallStacks,
    customWallInfill,
    roofM2,
    roofPanels,
    roofPanelsPerSide,
    roofPanelHeight,
    wallPanelHeight,
    customRoofEave,
    apexWidth,
    apexAuto,
    apexM2,
    apexPieces,
    gableWallsM2,
    gableWallsPanels,
    gableTriM2,
    gableTriCount,
    gableInfillCount,
    gableInfillM2,
    gableTriSlices: gableTriSlicesOut,
    totalM2,
    totalPanels,
    totalWeightKg,
    totalCost,
    roofRafterCovers,
    legRafterCovers,
    warnings,
  };
}

export const DEFAULT_INPUT: CalcInput = {
  length: 50,
  width: 30,
  eaveHeight: 3,
  pitchDeg: 18,
  baySize: 5,
  liningType: "MAL18 / Thermoline",
  roofOverhangEnabled: true,
  wallFloorSealEnabled: true,
  apexOverride: null,
  roofRaftersEnabled: false,
  legRaftersEnabled: false,
  rafterFlapWidth: 0.4,
  roofRafterLength: 10,
  lineRoof: true,
  lineWalls: true,
  lineGableWalls: true,
  lineGableTriangles: true,
  lineApex: true,
};

export function fmt(n: number, dp = 2): string {
  if (!isFinite(n)) return "—";
  return n.toLocaleString(undefined, { minimumFractionDigits: dp, maximumFractionDigits: dp });
}

// ============================================================================
// Install time
// ============================================================================

export type InstallSectionKey =
  | "roof"
  | "walls"
  | "gable_walls"
  | "gable_tri"
  | "apex"
  | "eave"
  | "wall_infill"
  | "rafters";

export const INSTALL_SECTIONS: { key: InstallSectionKey; label: string; defaultMin: number }[] = [
  { key: "roof",        label: "Roof panels",                defaultMin: 60 },
  { key: "walls",       label: "Wall panels",                defaultMin: 45 },
  { key: "gable_walls", label: "Gable wall panels",          defaultMin: 45 },
  { key: "gable_tri",   label: "Gable triangles & infills",  defaultMin: 60 },
  { key: "apex",        label: "Apex infill",                defaultMin: 45 },
  { key: "eave",        label: "Eave infill",                defaultMin: 45 },
  { key: "wall_infill", label: "Custom wall infill",         defaultMin: 45 },
  { key: "rafters",     label: "Rafter covers",              defaultMin: 20 },
];

export interface InstallInput {
  teams: number;
  peoplePerTeam: number;
  hoursPerDay: number;
  /** When false, sections are summed but cannot be parallelised across teams beyond a single section at a time. */
  parallelSections: boolean;
  /** Minutes per panel for each section. Falls back to defaults. */
  minutesPerPanel: Partial<Record<InstallSectionKey, number>>;
}

export interface InstallSectionResult {
  key: InstallSectionKey;
  label: string;
  panels: number;
  minutesPerPanel: number;
  hours: number;
  days: number;
}

export interface InstallResult {
  sections: InstallSectionResult[];
  totalPanels: number;
  totalHours: number;
  totalDays: number;
  personHours: number;
  panelsPerDayPerTeam: number;
}

export const MIN_PEOPLE_PER_TEAM = 6;

export const DEFAULT_INSTALL_INPUT: InstallInput = {
  teams: 1,
  peoplePerTeam: MIN_PEOPLE_PER_TEAM,
  hoursPerDay: 8,
  parallelSections: true,
  minutesPerPanel: {},
};

/** Map a CalcResult into panel counts per install section. */
export function panelsBySection(result: CalcResult): Record<InstallSectionKey, number> {
  const rafterPanels =
    (result.roofRafterCovers?.panels ?? 0) + (result.legRafterCovers?.panels ?? 0);
  return {
    roof:        result.roofPanels,
    walls:       result.wallsPanels,
    gable_walls: result.gableWallsPanels,
    gable_tri:   result.gableTriCount + result.gableInfillCount,
    apex:        result.apexPieces,
    eave:        result.customRoofEave?.panelsCount ?? 0,
    wall_infill: result.customWallInfill?.panelsCount ?? 0,
    rafters:     rafterPanels,
  };
}

export function calculateInstall(result: CalcResult, input: InstallInput): InstallResult {
  const teams = Math.max(1, Math.floor(input.teams || 1));
  const people = Math.max(MIN_PEOPLE_PER_TEAM, Math.floor(input.peoplePerTeam || MIN_PEOPLE_PER_TEAM));
  const hpd = Math.max(0.1, input.hoursPerDay || 8);
  const counts = panelsBySection(result);

  // Time per panel is calibrated for a baseline team of MIN_PEOPLE_PER_TEAM.
  // Adding people to a team scales install time down proportionally.
  const teamScale = MIN_PEOPLE_PER_TEAM / people;

  const sections: InstallSectionResult[] = INSTALL_SECTIONS.map((s) => {
    const mpp = input.minutesPerPanel[s.key] ?? s.defaultMin;
    const panels = counts[s.key];
    const hours = ((panels * mpp) / 60) * teamScale;
    // Both modes currently divide by (hpd * teams); toggle is informational.
    const days = hours / (hpd * teams);
    return { key: s.key, label: s.label, panels, minutesPerPanel: mpp, hours, days };
  });

  const totalPanels = sections.reduce((a, s) => a + s.panels, 0);
  const totalHours = sections.reduce((a, s) => a + s.hours, 0);
  const totalDays = totalHours / (hpd * teams);
  const personHours = totalHours * people * teams;
  const panelsPerDayPerTeam = totalDays > 0 ? totalPanels / totalDays / teams : 0;

  return {
    sections,
    totalPanels,
    totalHours,
    totalDays,
    personHours,
    panelsPerDayPerTeam,
  };
}
