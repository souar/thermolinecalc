// Marquee lining geometry & quantity calculator.
// All units in metres unless noted.
// Billing model: m² = panel count × actual panel size (no trim discount).

export const LINING_TYPES = [
  { id: "MAL18 / Thermoline", panelW: 5, panelH: 5, weightPerM2: 0.18 },
  { id: "MAL22", panelW: 5, panelH: 5, weightPerM2: 0.22 },
  { id: "MAL30 / ThermoAcoustic", panelW: 3, panelH: 5, weightPerM2: 0.3 },
] as const;

export type LiningTypeId = (typeof LINING_TYPES)[number]["id"];

export interface CalcInput {
  length: number;
  width: number;
  eaveHeight: number;
  pitchDeg: number;
  baySize: number;
  liningType: LiningTypeId;
  roofOverhangEnabled: boolean;
  wallFloorSealEnabled: boolean;
  apexOverride?: number | null;
  costPerM2?: number;
  weightPerM2?: number;
}

export interface CustomInfill {
  height: number;
  panelsCount: number;
  m2: number;
}

export interface CalcResult {
  // geometry
  slopeLength: number;
  ridgeHeight: number;
  bays: number;

  // walls (long sides)
  wallsM2: number;
  wallsPanels: number;
  wallStacks: number;
  customWallInfill: CustomInfill | null;

  // roof (full panels only)
  roofM2: number;
  roofPanels: number;

  // apex (custom strip)
  apexWidth: number;
  apexAuto: number; // geometric leftover (before override / overlap absorption)
  apexM2: number;
  apexPieces: number; // one per bay

  // gable walls (rectangular fill below eave on each end)
  gableWallsM2: number;
  gableWallsPanels: number;

  // gable triangles (custom)
  gableTriM2: number;
  gableTriCount: number;

  // totals
  totalM2: number;
  totalPanels: number;
  totalWeightKg: number;
  totalCost: number;

  warnings: string[];
}

const OVERHANG = 0.25;
const FLOOR_SEAL = 0.25;

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

  const liningDef = LINING_TYPES.find((l) => l.id === input.liningType) ?? LINING_TYPES[0];
  const panelW = liningDef.panelW;
  const panelH = liningDef.panelH;
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

  // Geometric apex = leftover slope after stacking whole roof panels, doubled across ridge
  const wholeAlongSlope = Math.floor(effectiveSlope / panelH);
  const geometricApex = Math.max(0, (effectiveSlope - wholeAlongSlope * panelH) * 2);

  // If wall + roof overlap exceeds a single panel height, grow apex by the excess
  // (×2 because pulling the roof up on both sides adds to the ridge strip)
  const wallWithOverlap = eaveHeight + roofOverlap;
  const overlapExcess = Math.max(0, wallWithOverlap - panelH);
  const apexAuto = geometricApex + 2 * overlapExcess;
  const apexWidth = apexOverride != null && apexOverride > 0 ? apexOverride : apexAuto;
  if (overlapExcess > 0) {
    warnings.push(
      `Wall + roof overlap (${(wallWithOverlap).toFixed(2)}m) exceeds panel height ${panelH}m — apex grown by ${(2 * overlapExcess).toFixed(2)}m to absorb it.`,
    );
  }

  const roofPanels = wholeAlongSlope * 2 * bays;
  const roofM2 = roofPanels * panelArea;

  const apexPieces = bays;
  const apexM2 = apexWidth * baySize * bays;

  // ---- Walls (long sides) ----
  // Wall height after apex absorption: apex pulled the roof up by `overlapExcess` on each side,
  // so the eave effectively drops by overlapExcess (wall doesn't have to reach as high).
  // For panel stacking we use the actual wall height + floor seal, ignoring overlap (handled by apex).
  const wallHeight = eaveHeight + (wallFloorSealEnabled ? FLOOR_SEAL : 0);
  const fullStacks = Math.floor(wallHeight / panelH);
  const leftover = wallHeight - fullStacks * panelH;

  const wallStacks = fullStacks;
  const wallsPanels = bays * 2 * fullStacks;
  const wallsM2 = wallsPanels * panelArea;

  let customWallInfill: CustomInfill | null = null;
  if (leftover > 1e-6) {
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

  // ---- Gable walls (rectangle below eave on each end) ----
  const gableWallsPanelsPerEnd = Math.ceil(width / panelW) * Math.max(1, fullStacks);
  const gableWallsPanels = gableWallsPanelsPerEnd * 2;
  const gableWallsM2 = gableWallsPanels * panelArea;

  // ---- Gable triangles (custom, max width = baySize, count forced even) ----
  let slicesPerEnd = Math.ceil(width / baySize);
  if (slicesPerEnd % 2 === 1) slicesPerEnd += 1; // split centre triangle in half
  const gableTriCount = slicesPerEnd * 2;
  // Actual triangular area: 2 × (½ × width × ridgeHeight)
  const gableTriM2 = width * ridgeHeight;

  // ---- Totals ----
  const customM2 = customWallInfill?.m2 ?? 0;
  const totalM2 = wallsM2 + customM2 + roofM2 + apexM2 + gableWallsM2 + gableTriM2;
  const totalPanels =
    wallsPanels +
    (customWallInfill?.panelsCount ?? 0) +
    roofPanels +
    apexPieces +
    gableWallsPanels +
    gableTriCount;

  const totalWeightKg = totalM2 * (weightPerM2 || liningDef.weightPerM2);
  const totalCost = totalM2 * costPerM2;

  return {
    slopeLength,
    ridgeHeight,
    bays,
    wallsM2,
    wallsPanels,
    wallStacks,
    customWallInfill,
    roofM2,
    roofPanels,
    apexWidth,
    apexAuto,
    apexM2,
    apexPieces,
    gableWallsM2,
    gableWallsPanels,
    gableTriM2,
    gableTriCount,
    totalM2,
    totalPanels,
    totalWeightKg,
    totalCost,
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
};

export function fmt(n: number, dp = 2): string {
  if (!isFinite(n)) return "—";
  return n.toLocaleString(undefined, { minimumFractionDigits: dp, maximumFractionDigits: dp });
}
