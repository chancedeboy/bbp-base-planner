import type { Category, PartDef, SnapAnchor } from './types'

// All recipe data sourced from PLAN.md §6, originally extracted from the
// Fandom BBP wiki via the Cartel Island mirror. Verify before locking.
const SOURCE = 'cartel-mirror' as const
const VERSION = '2.0'

// Compatibility groups — reused across anchor definitions.
const ACCEPTS_WALL_LIKE: Category[] = ['wall', 'door', 'window', 'gate']
const ACCEPTS_ON_FLOOR: Category[] = ['wall', 'door', 'window', 'gate', 'pillar', 'stair']
const ACCEPTS_ON_WALL_TOP: Category[] = ['wall', 'floor', 'roof']
// Foundations are flat slabs — same pieces that stand on a floor edge stand on
// a foundation edge. Plus 'floor' for second-story stacks and 'foundation' for
// vertical stacking via the top center.
const ACCEPTS_FOUNDATION_TOP: Category[] = [
  'wall', 'door', 'window', 'gate', 'pillar', 'stair', 'floor', 'foundation',
]
// Foundation edges: anything that stands on the perimeter. Excludes 'foundation'
// (side-by-side foundations use the separate side anchors below, not the edge).
const ACCEPTS_FOUNDATION_EDGE: Category[] = [
  'wall', 'door', 'window', 'gate', 'pillar', 'stair', 'floor',
]

// Anchor sets for common piece shapes. Inputs are dimensions; outputs are
// SnapAnchor arrays in local space (piece center is origin).
function wallAnchors(w: number, h: number): SnapAnchor[] {
  return [
    { id: 'left', position: [-w / 2, 0, 0], normal: [-1, 0, 0], surface: 'side', accepts: ACCEPTS_WALL_LIKE },
    { id: 'right', position: [w / 2, 0, 0], normal: [1, 0, 0], surface: 'side', accepts: ACCEPTS_WALL_LIKE },
    {
      id: 'top',
      position: [0, h / 2, 0],
      normal: [0, 1, 0],
      surface: 'top',
      accepts: ACCEPTS_ON_WALL_TOP,
      // Slide along wall thickness — lets a roof scroll between centered-on-wall
      // and shifted to either side (so it spans the box interior).
      slideAxis: [0, 0, 1],
    },
    { id: 'bottom', position: [0, -h / 2, 0], normal: [0, -1, 0], surface: 'bottom', accepts: ['wall'] },
  ]
}

// Floor-like piece (flat slab). Edges are placement points for walls;
// top accepts pillars and walls; bottom is for downward stairs.
// Side anchors at center height allow floor-to-floor side-by-side placement
// (same fix pattern as foundations — without these the floor would snap to
// its neighbor's top edge and float lifted).
function floorAnchors(w: number, h: number, d: number): SnapAnchor[] {
  return [
    { id: 'edge-px', position: [w / 2, h / 2, 0], normal: [1, 0, 0], surface: 'edge', accepts: ACCEPTS_ON_FLOOR },
    { id: 'edge-nx', position: [-w / 2, h / 2, 0], normal: [-1, 0, 0], surface: 'edge', accepts: ACCEPTS_ON_FLOOR },
    { id: 'edge-pz', position: [0, h / 2, d / 2], normal: [0, 0, 1], surface: 'edge', accepts: ACCEPTS_ON_FLOOR },
    { id: 'edge-nz', position: [0, h / 2, -d / 2], normal: [0, 0, -1], surface: 'edge', accepts: ACCEPTS_ON_FLOOR },
    { id: 'top', position: [0, h / 2, 0], normal: [0, 1, 0], surface: 'top', accepts: ACCEPTS_ON_FLOOR },
    { id: 'bottom', position: [0, -h / 2, 0], normal: [0, -1, 0], surface: 'bottom', accepts: ['stair'] },
    { id: 'side-px', position: [w / 2, 0, 0], normal: [1, 0, 0], surface: 'side', accepts: ['floor'] },
    { id: 'side-nx', position: [-w / 2, 0, 0], normal: [-1, 0, 0], surface: 'side', accepts: ['floor'] },
    { id: 'side-pz', position: [0, 0, d / 2], normal: [0, 0, 1], surface: 'side', accepts: ['floor'] },
    { id: 'side-nz', position: [0, 0, -d / 2], normal: [0, 0, -1], surface: 'side', accepts: ['floor'] },
  ]
}

function foundationAnchors(w: number, h: number, d: number): SnapAnchor[] {
  return [
    { id: 'top', position: [0, h / 2, 0], normal: [0, 1, 0], surface: 'top', accepts: ACCEPTS_FOUNDATION_TOP },
    // Top edges — for walls/pillars that stand on the perimeter of the foundation.
    { id: 'edge-px', position: [w / 2, h / 2, 0], normal: [1, 0, 0], surface: 'edge', accepts: ACCEPTS_FOUNDATION_EDGE },
    { id: 'edge-nx', position: [-w / 2, h / 2, 0], normal: [-1, 0, 0], surface: 'edge', accepts: ACCEPTS_FOUNDATION_EDGE },
    { id: 'edge-pz', position: [0, h / 2, d / 2], normal: [0, 0, 1], surface: 'edge', accepts: ACCEPTS_FOUNDATION_EDGE },
    { id: 'edge-nz', position: [0, h / 2, -d / 2], normal: [0, 0, -1], surface: 'edge', accepts: ACCEPTS_FOUNDATION_EDGE },
    // Side faces at center height — for placing adjacent foundations flush and level.
    { id: 'side-px', position: [w / 2, 0, 0], normal: [1, 0, 0], surface: 'side', accepts: ['foundation'] },
    { id: 'side-nx', position: [-w / 2, 0, 0], normal: [-1, 0, 0], surface: 'side', accepts: ['foundation'] },
    { id: 'side-pz', position: [0, 0, d / 2], normal: [0, 0, 1], surface: 'side', accepts: ['foundation'] },
    { id: 'side-nz', position: [0, 0, -d / 2], normal: [0, 0, -1], surface: 'side', accepts: ['foundation'] },
  ]
}

// Stylized dimensions in meters. Approximations sufficient for v1 placement;
// snap geometry tightens in Sprint 2.
export const PARTS: PartDef[] = [
  // ─── Utility & Kits ──────────────────────────────────────────────
  {
    id: 'workbench',
    name: 'Workbench',
    category: 'utility',
    dimensions: { w: 1.5, h: 1, d: 1 },
    snapAnchors: [],
    recipes: {
      frame: { resources: { planks: 5, bbpBook: 1 }, notes: 'BBP Book returned after build' },
    },
    maxTier: 'frame',
    verifiedAgainstBBPVersion: VERSION,
    verifiedSource: SOURCE,
  },
  {
    id: 'step-ladder-kit',
    name: 'Step Ladder Kit',
    category: 'utility',
    dimensions: { w: 0.5, h: 3, d: 0.2 },
    snapAnchors: [],
    recipes: { frame: { resources: { planks: 10, nails: 10 } } },
    maxTier: 'frame',
    verifiedAgainstBBPVersion: VERSION,
    verifiedSource: SOURCE,
  },
  {
    id: 'basic-kit',
    name: 'Basic Kit',
    category: 'utility',
    dimensions: { w: 0.5, h: 0.3, d: 0.5 },
    snapAnchors: [],
    recipes: { frame: { resources: { planks: 3, nails: 3 }, notes: 'Built in Workbench UI' } },
    maxTier: 'frame',
    verifiedAgainstBBPVersion: VERSION,
    verifiedSource: SOURCE,
  },
  {
    id: 'large-stair',
    name: 'Large Stair',
    category: 'stair',
    dimensions: { w: 2, h: 1.5, d: 1 },
    snapAnchors: [],
    recipes: { frame: { resources: { planks: 5, nails: 10 } } },
    maxTier: 'frame',
    verifiedAgainstBBPVersion: VERSION,
    verifiedSource: SOURCE,
  },
  {
    id: 'small-stair',
    name: 'Small Stair',
    category: 'stair',
    dimensions: { w: 1, h: 1.5, d: 1 },
    snapAnchors: [],
    recipes: { frame: { resources: { planks: 5, nails: 5 } } },
    maxTier: 'frame',
    verifiedAgainstBBPVersion: VERSION,
    verifiedSource: SOURCE,
  },
  {
    id: 'large-ramp',
    name: 'Large Ramp',
    category: 'stair',
    dimensions: { w: 4, h: 1, d: 1 },
    snapAnchors: [],
    recipes: { frame: { resources: { planks: 8, nails: 15 } } },
    maxTier: 'frame',
    verifiedAgainstBBPVersion: VERSION,
    verifiedSource: SOURCE,
  },
  {
    id: 'tall-pillar-wood',
    name: 'Tall Pillar (Wood)',
    category: 'pillar',
    dimensions: { w: 0.3, h: 3, d: 0.3 },
    snapAnchors: [],
    recipes: { frame: { resources: { planks: 2, nails: 5 } } },
    maxTier: 'frame',
    verifiedAgainstBBPVersion: VERSION,
    verifiedSource: SOURCE,
  },
  {
    id: 'short-pillar-wood',
    name: 'Short Pillar (Wood)',
    category: 'pillar',
    dimensions: { w: 0.3, h: 1.5, d: 0.3 },
    snapAnchors: [],
    recipes: { frame: { resources: { planks: 1, nails: 5 } } },
    maxTier: 'frame',
    verifiedAgainstBBPVersion: VERSION,
    verifiedSource: SOURCE,
  },
  {
    id: 'tall-pillar-concrete',
    name: 'Tall Pillar (Concrete)',
    category: 'pillar',
    dimensions: { w: 0.3, h: 3, d: 0.3 },
    snapAnchors: [],
    recipes: { frame: { resources: { concreteBricks: 1 } } },
    maxTier: 'frame',
    verifiedAgainstBBPVersion: VERSION,
    verifiedSource: SOURCE,
  },
  {
    id: 'short-pillar-concrete',
    name: 'Short Pillar (Concrete)',
    category: 'pillar',
    dimensions: { w: 0.3, h: 1.5, d: 0.3 },
    snapAnchors: [],
    recipes: { frame: { resources: { concreteBricks: 1 } } },
    maxTier: 'frame',
    verifiedAgainstBBPVersion: VERSION,
    verifiedSource: SOURCE,
  },

  // ─── Walls & Foundations ─────────────────────────────────────────
  {
    id: 'large-wall',
    name: 'Large Wall',
    category: 'wall',
    dimensions: { w: 4, h: 3, d: 0.2 },
    snapAnchors: wallAnchors(4, 3),
    recipes: {
      frame: { resources: { nails: 10, planks: 5 } },
      t1: { resources: { nails: 10, logs: 2 }, cumulative: true, notes: 'or 6 planks' },
      t2: { resources: { sheetMetal: 4, nails: 10 }, cumulative: true },
      t3: { resources: { concreteBricks: 3, mortarMix: 1 }, cumulative: true },
    },
    maxTier: 't3',
    verifiedAgainstBBPVersion: VERSION,
    verifiedSource: SOURCE,
  },
  {
    id: 'small-wall',
    name: 'Small Wall',
    category: 'wall',
    dimensions: { w: 2, h: 3, d: 0.2 },
    snapAnchors: wallAnchors(2, 3),
    recipes: {
      frame: { resources: { nails: 10, planks: 3 } },
      t1: { resources: { nails: 10, logs: 1 }, cumulative: true, notes: 'or 3 planks' },
      t2: { resources: { sheetMetal: 2, nails: 10 }, cumulative: true },
      t3: { resources: { concreteBricks: 2, mortarMix: 1 }, cumulative: true },
    },
    maxTier: 't3',
    verifiedAgainstBBPVersion: VERSION,
    verifiedSource: SOURCE,
  },
  {
    id: 'large-half-wall',
    name: 'Large Half-Wall',
    category: 'wall',
    dimensions: { w: 4, h: 1.5, d: 0.2 },
    snapAnchors: wallAnchors(4, 1.5),
    recipes: {
      frame: { resources: { nails: 10, planks: 3 } },
      t1: { resources: { nails: 10, logs: 1 }, cumulative: true, notes: 'or 3 planks' },
      t2: { resources: { sheetMetal: 2, nails: 10 }, cumulative: true },
      t3: { resources: { concreteBricks: 2, mortarMix: 1 }, cumulative: true },
    },
    maxTier: 't3',
    verifiedAgainstBBPVersion: VERSION,
    verifiedSource: SOURCE,
  },
  {
    id: 'small-half-wall',
    name: 'Small Half-Wall',
    category: 'wall',
    dimensions: { w: 2, h: 1.5, d: 0.2 },
    snapAnchors: wallAnchors(2, 1.5),
    recipes: {
      frame: { resources: { nails: 5, planks: 2 } },
      t1: { resources: { nails: 10, logs: 1 }, cumulative: true, notes: 'or 2 planks' },
      t2: { resources: { sheetMetal: 1, nails: 5 }, cumulative: true },
      t3: { resources: { concreteBricks: 1 }, cumulative: true },
    },
    maxTier: 't3',
    verifiedAgainstBBPVersion: VERSION,
    verifiedSource: SOURCE,
  },
  {
    id: 'foundation-triangle',
    name: 'Foundation / Triangle',
    category: 'foundation',
    dimensions: { w: 4, h: 0.3, d: 4 },
    snapAnchors: foundationAnchors(4, 0.3, 4),
    recipes: {
      frame: { resources: { nails: 10, logs: 2 } },
      t1: { resources: { nails: 10, planks: 8 }, cumulative: true },
      t2: { resources: { sheetMetal: 3, nails: 10 }, cumulative: true },
      t3: { resources: { concreteBricks: 2, mortarMix: 1 }, cumulative: true },
    },
    maxTier: 't3',
    verifiedAgainstBBPVersion: VERSION,
    verifiedSource: SOURCE,
  },

  // ─── Doors ───────────────────────────────────────────────────────
  {
    id: 'large-door',
    name: 'Large Door',
    category: 'door',
    dimensions: { w: 4, h: 3, d: 0.2 },
    snapAnchors: wallAnchors(4, 3),
    recipes: {
      frame: { resources: { nails: 10, planks: 5 } },
      t1: { resources: { nails: 10, planks: 5 }, cumulative: true },
      t2: { resources: { nails: 15, sheetMetal: 5 }, cumulative: true },
      t3: {
        resources: { nails: 15, sheetMetal: 5, planks: 5 },
        cumulative: false,
        notes: 'Separate build — cannot upgrade from T1/T2',
      },
    },
    maxTier: 't3',
    verifiedAgainstBBPVersion: VERSION,
    verifiedSource: SOURCE,
  },
  {
    id: 'small-door',
    name: 'Small Door',
    category: 'door',
    dimensions: { w: 2, h: 3, d: 0.2 },
    snapAnchors: wallAnchors(2, 3),
    recipes: {
      frame: { resources: { nails: 10, planks: 3 } },
      t1: { resources: { nails: 10, planks: 5 }, cumulative: true },
      t2: { resources: { nails: 15, sheetMetal: 5 }, cumulative: true },
      t3: {
        resources: { nails: 15, sheetMetal: 5, planks: 5 },
        cumulative: false,
        notes: 'Separate build',
      },
    },
    maxTier: 't3',
    verifiedAgainstBBPVersion: VERSION,
    verifiedSource: SOURCE,
  },

  // ─── Gates & Garage Doors ────────────────────────────────────────
  {
    id: 'large-gate',
    name: 'Large Gate (R/L)',
    category: 'gate',
    dimensions: { w: 4, h: 3, d: 0.2 },
    snapAnchors: wallAnchors(4, 3),
    recipes: {
      frame: { resources: { nails: 10, planks: 4 } },
      t1: { resources: { nails: 24, planks: 16 }, cumulative: true },
      t2: { resources: { sheetMetal: 4, nails: 20 }, cumulative: true },
      t3: { resources: { concreteBricks: 3, mortarMix: 1 }, cumulative: true },
    },
    maxTier: 't3',
    verifiedAgainstBBPVersion: VERSION,
    verifiedSource: SOURCE,
  },
  {
    id: 'single-garage-door',
    name: 'Single Garage Door',
    category: 'gate',
    dimensions: { w: 4, h: 3, d: 0.2 },
    snapAnchors: wallAnchors(4, 3),
    recipes: {
      frame: { resources: { nails: 10, planks: 4 } },
      t1: { resources: { nails: 24, planks: 16 }, cumulative: true },
      t2: { resources: { sheetMetal: 4, nails: 20 }, cumulative: true },
      t3: { resources: { concreteBricks: 3, mortarMix: 1 }, cumulative: true },
    },
    maxTier: 't3',
    verifiedAgainstBBPVersion: VERSION,
    verifiedSource: SOURCE,
  },
  {
    id: 'double-garage-door',
    name: 'Double Garage Door',
    category: 'gate',
    dimensions: { w: 8, h: 3, d: 0.2 },
    snapAnchors: wallAnchors(8, 3),
    recipes: {
      frame: { resources: { nails: 10, planks: 4 } },
      t1: { resources: { nails: 24, planks: 16 }, cumulative: true, notes: '×2 doors total' },
      t2: { resources: { nails: 20, sheetMetal: 4 }, cumulative: true, notes: '×2 doors total' },
      t3: { resources: { concreteBricks: 2, mortarMix: 2 }, cumulative: true, notes: '×2 doors total' },
    },
    maxTier: 't3',
    verifiedAgainstBBPVersion: VERSION,
    verifiedSource: SOURCE,
  },

  // ─── Floors & Roofs ──────────────────────────────────────────────
  {
    id: 'large-floor',
    name: 'Large Floor',
    category: 'floor',
    dimensions: { w: 4, h: 0.2, d: 4 },
    snapAnchors: floorAnchors(4, 0.2, 4),
    recipes: {
      frame: { resources: { nails: 10, planks: 5 } },
      t1: { resources: { nails: 10, planks: 8 }, cumulative: true },
      t2: { resources: { sheetMetal: 3, nails: 10 }, cumulative: true },
      t3: { resources: { concreteBricks: 2, mortarMix: 1 }, cumulative: true },
    },
    maxTier: 't3',
    verifiedAgainstBBPVersion: VERSION,
    verifiedSource: SOURCE,
  },
  {
    id: 'small-floor',
    name: 'Small Floor',
    category: 'floor',
    dimensions: { w: 2, h: 0.2, d: 4 },
    snapAnchors: floorAnchors(2, 0.2, 4),
    recipes: {
      frame: { resources: { nails: 5, planks: 3 } },
      t1: { resources: { nails: 5, planks: 3 }, cumulative: true },
      t2: { resources: { sheetMetal: 1, nails: 5 }, cumulative: true },
      t3: { resources: { concreteBricks: 1 }, cumulative: true },
    },
    maxTier: 't3',
    verifiedAgainstBBPVersion: VERSION,
    verifiedSource: SOURCE,
  },
  {
    id: 'large-triangle-floor',
    name: 'Large Triangle Floor',
    category: 'floor',
    dimensions: { w: 4, h: 0.2, d: 4 },
    snapAnchors: [],
    recipes: {
      frame: { resources: { nails: 10, planks: 3 } },
      t1: { resources: { nails: 10, planks: 5 }, cumulative: true },
      t2: { resources: { sheetMetal: 2, nails: 10 }, cumulative: true },
      t3: { resources: { concreteBricks: 1, mortarMix: 1 }, cumulative: true },
    },
    maxTier: 't3',
    verifiedAgainstBBPVersion: VERSION,
    verifiedSource: SOURCE,
  },
  {
    id: 'large-slope-roof',
    name: 'Large Slope Roof',
    category: 'roof',
    dimensions: { w: 4, h: 1.5, d: 4 },
    snapAnchors: floorAnchors(4, 1.5, 4),
    recipes: {
      frame: { resources: { nails: 10, planks: 5 } },
      t1: { resources: { nails: 10, planks: 8 }, cumulative: true },
      t2: { resources: { sheetMetal: 3, nails: 10 }, cumulative: true },
      t3: { resources: { concreteBricks: 2, mortarMix: 1 }, cumulative: true },
    },
    maxTier: 't3',
    verifiedAgainstBBPVersion: VERSION,
    verifiedSource: SOURCE,
  },
  {
    id: 'large-hanger-roof',
    name: 'Large Hanger Roof (R/L)',
    category: 'roof',
    dimensions: { w: 4, h: 1, d: 4 },
    snapAnchors: [],
    recipes: {
      frame: { resources: { nails: 10, planks: 5 } },
      t1: { resources: { nails: 24, planks: 16 }, cumulative: true },
      t2: { resources: { sheetMetal: 4, nails: 20 }, cumulative: true },
      t3: { resources: { concreteBricks: 3, mortarMix: 1 }, cumulative: true },
    },
    maxTier: 't3',
    verifiedAgainstBBPVersion: VERSION,
    verifiedSource: SOURCE,
  },

  // ─── Windows & Hatches ───────────────────────────────────────────
  {
    id: 'large-floor-roof-hatch',
    name: 'Large Floor/Roof Hatch',
    category: 'hatch',
    dimensions: { w: 1, h: 0.1, d: 1 },
    snapAnchors: [],
    recipes: {
      frame: { resources: { nails: 10, planks: 5 } },
      t1: { resources: { nails: 10, planks: 6 }, cumulative: true },
      t2: { resources: { sheetMetal: 3, nails: 10 }, cumulative: true },
      t3: { resources: { concreteBricks: 2, mortarMix: 1 }, cumulative: true },
    },
    maxTier: 't3',
    verifiedAgainstBBPVersion: VERSION,
    verifiedSource: SOURCE,
  },
  {
    id: 'large-window',
    name: 'Large Window',
    category: 'window',
    dimensions: { w: 4, h: 3, d: 0.2 },
    snapAnchors: wallAnchors(4, 3),
    recipes: {
      frame: { resources: { nails: 10, planks: 5 } },
      t1: { resources: { nails: 10, logs: 2 }, cumulative: true, notes: 'or 8 planks' },
      t2: { resources: { sheetMetal: 4, nails: 10 }, cumulative: true },
      t3: { resources: { concreteBricks: 3, mortarMix: 1 }, cumulative: true },
    },
    maxTier: 't3',
    verifiedAgainstBBPVersion: VERSION,
    verifiedSource: SOURCE,
  },
  {
    id: 'small-window',
    name: 'Small Window',
    category: 'window',
    dimensions: { w: 2, h: 3, d: 0.2 },
    snapAnchors: wallAnchors(2, 3),
    recipes: {
      frame: { resources: { nails: 10, planks: 3 } },
      t1: { resources: { nails: 10, logs: 1 }, cumulative: true, notes: 'or 3 planks' },
      t2: { resources: { sheetMetal: 2, nails: 10 }, cumulative: true },
      t3: { resources: { concreteBricks: 1, mortarMix: 1 }, cumulative: true },
    },
    maxTier: 't3',
    verifiedAgainstBBPVersion: VERSION,
    verifiedSource: SOURCE,
  },
  {
    id: 'large-hatch-cover',
    name: 'Large Hatch (cover)',
    category: 'hatch',
    dimensions: { w: 1, h: 0.2, d: 1 },
    snapAnchors: [],
    recipes: {
      frame: { resources: { nails: 10, planks: 5 } },
      t1: { resources: { nails: 10, planks: 5 }, cumulative: true },
      t2: { resources: { nails: 10, sheetMetal: 4 }, cumulative: true },
      t3: {
        resources: { planks: 5, sheetMetal: 4, nails: 20 },
        cumulative: false,
        notes: 'Reinforced standalone build',
      },
    },
    maxTier: 't3',
    verifiedAgainstBBPVersion: VERSION,
    verifiedSource: SOURCE,
  },
  {
    id: 'large-window-hatch',
    name: 'Large Window Hatch',
    category: 'hatch',
    dimensions: { w: 4, h: 0.5, d: 0.1 },
    snapAnchors: [],
    recipes: {
      frame: { resources: { nails: 10, planks: 5 } },
      t1: { resources: { nails: 5, planks: 2 }, cumulative: true },
      t2: { resources: { nails: 5, sheetMetal: 2 }, cumulative: true },
      t3: {
        resources: { planks: 5, sheetMetal: 3, nails: 10 },
        cumulative: false,
      },
    },
    maxTier: 't3',
    verifiedAgainstBBPVersion: VERSION,
    verifiedSource: SOURCE,
  },
  {
    id: 'small-window-hatch',
    name: 'Small Window Hatch',
    category: 'hatch',
    dimensions: { w: 2, h: 0.5, d: 0.1 },
    snapAnchors: [],
    recipes: {
      frame: { resources: { nails: 10, planks: 3 } },
      t1: { resources: { nails: 5, planks: 2 }, cumulative: true },
      t2: { resources: { nails: 5, sheetMetal: 2 }, cumulative: true },
      t3: {
        resources: { planks: 5, sheetMetal: 2, nails: 5 },
        cumulative: false,
      },
    },
    maxTier: 't3',
    verifiedAgainstBBPVersion: VERSION,
    verifiedSource: SOURCE,
  },

  // ─── Misc Metal ──────────────────────────────────────────────────
  {
    id: 'barbwire-barrier',
    name: 'Barbwire Barrier',
    category: 'metal',
    dimensions: { w: 2, h: 0.5, d: 0.2 },
    snapAnchors: [],
    recipes: {
      frame: { resources: { nails: 10, logs: 2 } },
      t1: { resources: { nails: 10, barbwire: 1 }, cumulative: true },
    },
    maxTier: 't1',
    verifiedAgainstBBPVersion: VERSION,
    verifiedSource: SOURCE,
  },
  {
    id: 'chain-link-fence',
    name: 'Chain Link Fence',
    category: 'metal',
    dimensions: { w: 2, h: 2, d: 0.1 },
    snapAnchors: [],
    recipes: {
      frame: { resources: { nails: 10, sheetMetal: 2 } },
      t1: { resources: { nails: 10, sheetMetal: 2 }, cumulative: true },
      t2: {
        resources: { nails: 10, barbwire: 1 },
        cumulative: true,
        notes: 'Barbwire add-on',
      },
    },
    maxTier: 't2',
    verifiedAgainstBBPVersion: VERSION,
    verifiedSource: SOURCE,
  },
  {
    id: 'chain-link-gate',
    name: 'Chain Link Gate',
    category: 'gate',
    dimensions: { w: 2, h: 2, d: 0.1 },
    snapAnchors: [],
    recipes: {
      frame: { resources: { nails: 10, sheetMetal: 2 } },
      t1: { resources: { nails: 10, sheetMetal: 1 }, cumulative: true, notes: '×2 doors' },
      t2: {
        resources: { nails: 10, barbwire: 1 },
        cumulative: true,
        notes: 'Barbwire add-on',
      },
    },
    maxTier: 't2',
    verifiedAgainstBBPVersion: VERSION,
    verifiedSource: SOURCE,
  },
  {
    id: 'metal-floor-mesh',
    name: 'Metal Floor Mesh',
    category: 'floor',
    dimensions: { w: 2, h: 0.05, d: 2 },
    snapAnchors: [],
    recipes: {
      frame: { resources: { nails: 10, sheetMetal: 1 } },
      t1: { resources: { nails: 10, sheetMetal: 2 }, cumulative: true },
    },
    maxTier: 't1',
    verifiedAgainstBBPVersion: VERSION,
    verifiedSource: SOURCE,
  },
  {
    id: 'metal-stairs',
    name: 'Metal Stairs',
    category: 'stair',
    dimensions: { w: 2, h: 1.5, d: 1 },
    snapAnchors: [],
    recipes: {
      frame: { resources: { nails: 10, sheetMetal: 1 } },
      t1: {
        resources: { nails: 6, sheetMetal: 2 },
        cumulative: true,
        notes: 'Railings ×2',
      },
    },
    maxTier: 't1',
    verifiedAgainstBBPVersion: VERSION,
    verifiedSource: SOURCE,
  },
]

export const PARTS_BY_ID: Record<string, PartDef> = Object.fromEntries(
  PARTS.map((p) => [p.id, p])
)

export function getPart(id: string): PartDef | undefined {
  return PARTS_BY_ID[id]
}

// Display order — used by the palette to group/sort
export const CATEGORY_ORDER: PartDef['category'][] = [
  'foundation',
  'wall',
  'door',
  'gate',
  'window',
  'floor',
  'roof',
  'hatch',
  'pillar',
  'stair',
  'metal',
  'utility',
]

export const CATEGORY_LABELS: Record<PartDef['category'], string> = {
  foundation: 'Foundations',
  wall: 'Walls',
  door: 'Doors',
  gate: 'Gates & Garage',
  window: 'Windows',
  floor: 'Floors',
  roof: 'Roofs',
  hatch: 'Hatches',
  pillar: 'Pillars',
  stair: 'Stairs & Ramps',
  metal: 'Metal',
  utility: 'Utility & Kits',
}

export const CATEGORY_COLORS: Record<PartDef['category'], string> = {
  foundation: '#6b7280',
  wall: '#92400e',
  door: '#2563eb',
  gate: '#4f46e5',
  window: '#06b6d4',
  floor: '#ca8a04',
  roof: '#dc2626',
  hatch: '#ea580c',
  pillar: '#b45309',
  stair: '#16a34a',
  metal: '#475569',
  utility: '#7c3aed',
}

// Tier colors override category colors on placed pieces so users can read
// build progress at a glance: raw wood → tan → metal grey → concrete grey.
// Category info still appears in the palette + Inspector.
import type { Tier } from './types'
export const TIER_COLORS: Record<Tier, string> = {
  frame: '#c0a987',  // pale wood frame
  t1: '#d2b48c',     // tan (wood)
  t2: '#9ca3af',     // grey (metal)
  t3: '#4b5563',     // dark grey (concrete)
}
