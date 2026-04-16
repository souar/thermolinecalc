// Marquee lining geometry & quantity calculator.
// All units in metres unless noted.

export const LINING_TYPES = [
  { id: "MAL18 / Thermoline", panelW: 5, panelH: 5, weightPerM2: 0.18 },
  { id: "MAL22", panelW: 5, panelH: 5, weightPerM2: 0.22 },
  { id: "MAL30 / ThermoAcoustic", panelW: 3, panelH: 5, weightPerM2: 0.3 },
] as const;

export type LiningTypeId = (typeof LINING_TYPES)[number]["id"];

export interface CalcInput {
  length: number; // marquee length (along bays)
  width: number; // span across (eave to eave at floor)
  eaveHeight: number; // leg height
  pitchDeg: number; // roof pitch in degrees
  baySize: number; // 3 or 5
  liningType: LiningTypeId;
  roofOverhangEnabled: boolean; // 0.25m drop past eave to seal to wall
  wallFloorSealEnabled: boolean; // 0.25m skirt at base
  apexOverride?: number | null; // metres, optional manual apex width
  costPerM2?: number;
  weightPerM2?: number;
}

export interface CalcResult {
  // geometry
  slopeLength: number; // length of one roof side from eave to apex
  ridgeHeight: number; // additional height above eave
  // areas (m²)
  wallsM2: number;
  roofM2: number;
  gablesM2: number;
  totalM2: number;
  // panels
  bays: number;
  apexWidth: number; // computed apex piece width
  apexAuto: number; // auto-calculated apex (before override)
  wallsPanels: number;
  roofPanels: number; // includes apex pieces
  gablePanels: number;
  // costs
  totalWeightKg: number;
  totalCost: number;
  // breakdown
  perBay: {
    wallM2: number;
    roofM2: number;
    apexM2: number;
    gableTriM2: number;
  };
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
  const panelW = liningDef.panelW; // bay-direction panel width
  const panelH = liningDef.panelH; // along-slope panel height

  const pitchRad = (pitchDeg * Math.PI) / 180;
  const halfWidth = width / 2;
  const slopeLength = halfWidth / Math.cos(pitchRad);
  const ridgeHeight = halfWidth * Math.tan(pitchRad);

  // Bays
  const bays = Math.max(1, Math.round(length / baySize));

  // ---- Walls (long side eave walls, both sides) ----
  const wallHeight = eaveHeight + (wallFloorSealEnabled ? FLOOR_SEAL : 0);
  const wallsM2 = 2 * length * wallHeight;
  // panels: one per bay per side, height in panelH units
  const wallsPanels = bays * 2 * Math.ceil(wallHeight / panelH);

  // ---- Roof ----
  // each side slope length, with optional 0.25m drop past eave
  const effectiveSlope = slopeLength + (roofOverhangEnabled ? OVERHANG : 0);
  const roofM2 = 2 * length * effectiveSlope;

  // Apex piece (auto): leftover after whole panels along the slope
  const wholeAlongSlope = Math.floor(effectiveSlope / panelH);
  const apexAuto = Math.max(0, (effectiveSlope - wholeAlongSlope * panelH) * 2); // ridge piece spans both sides
  const apexWidth = apexOverride != null && apexOverride > 0 ? apexOverride : apexAuto;

  // panels per bay per side: along-slope full panels + 1 apex (shared at ridge counted once per bay)
  const roofPanelsPerSidePerBay = wholeAlongSlope; // 5x5 (or 3x5) along-slope sections
  const roofPanels = bays * (roofPanelsPerSidePerBay * 2) + bays; // + 1 apex per bay

  // ---- Gables (two end triangles + rectangular fill below eave on gable face) ----
  const gableTriArea = halfWidth * ridgeHeight; // 2 × (½ × width × h) for both gables = width × h
  // The wall area at the gable face below eave is already excluded from "walls" (walls were only the long sides).
  // Add the gable rectangular area below eave too:
  const gableRectArea = 2 * width * (eaveHeight + (wallFloorSealEnabled ? FLOOR_SEAL : 0));
  const gablesM2 = gableTriArea + gableRectArea;
  // panels: rough estimate — full panels to fill gable rectangles + triangular pieces
  const gableRectPanels = 2 * Math.ceil(width / panelW) * Math.ceil((eaveHeight + (wallFloorSealEnabled ? FLOOR_SEAL : 0)) / panelH);
  const gableTriPanels = 2 * Math.ceil(width / panelW); // mirrored triangle pieces per gable
  const gablePanels = gableRectPanels + gableTriPanels;

  const totalM2 = wallsM2 + roofM2 + gablesM2;
  const totalWeightKg = totalM2 * (weightPerM2 || liningDef.weightPerM2);
  const totalCost = totalM2 * costPerM2;

  return {
    slopeLength,
    ridgeHeight,
    wallsM2,
    roofM2,
    gablesM2,
    totalM2,
    bays,
    apexWidth,
    apexAuto,
    wallsPanels,
    roofPanels,
    gablePanels,
    totalWeightKg,
    totalCost,
    perBay: {
      wallM2: (wallsM2 / bays),
      roofM2: roofM2 / bays,
      apexM2: apexWidth * baySize,
      gableTriM2: bays > 0 ? gableTriArea / 2 : 0,
    },
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
