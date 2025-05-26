export const moduleId = "pf1-fleet-sheet";
export const changePrefix = "pf1fs";

export const fleetId = `${moduleId}.fleet`;

export const boonId = `${moduleId}.boon`;

export const combatAttributes = {
  dv: "PF1FS.DefenseValue",
  av: "PF1FS.AttackValue",
  damage: "PF1FS.Damage",
  morale: "PF1FS.Morale",
};

export const fleetConditions = {
  [`${changePrefix}-upper-hand`]: {
    id: `${changePrefix}-upper-hand`,
    name: "PF1FS.Condition.UpperHand",
    texture: `icons/svg/regen.svg`,
    mechanics: {
      changes: [
        {
          formula: 1,
          target: `${changePrefix}_av`,
          type: "untyped",
        },
      ],
    },
    journal: "TODO",
  },
};

export const boons = {
  at: {
    label: "PF1FS.Boons.AdvancedTactics",
    selectSquad: true,
    takeMultiple: false,
    mechanics: {
      changes: [
        {
          formula: 2,
          target: `${changePrefix}_av`,
          type: "untyped",
        },
      ],
      contextNotes: [
        {
          text: "Attacker chooses what ships to damage",
          target: `${changePrefix}_damage`,
        },
      ],
    },
  },
  dt: {
    label: "PF1FS.Boons.DefensiveTactics",
    selectSquad: true,
    takeMultiple: true,
    mechanics: {
      changes: [
        {
          formula: 2,
          target: `${changePrefix}_dv`,
          type: "untyped",
        },
      ],
    },
  },
  dp: {
    label: "PF1FS.Boons.DivineProtection",
    selectSquad: true,
    takeMultiple: true,
    mechanics: {
      contextNotes: [
        {
          text: "squadron takes -[[1]] damage when attacked",
          target: `${changePrefix}_dv`,
        },
      ],
    },
  },
  loy: {
    label: "PF1FS.Boons.Loyalty",
    selectSquad: false,
    takeMultiple: false,
    mechanics: {
      changes: [
        {
          formula: 2,
          target: `${changePrefix}_morale_check`,
          type: "untyped",
        },
      ],
    },
  },
  ma: {
    label: "PF1FS.Boons.MagicalArtillery",
    selectSquad: false,
    takeMultiple: false,
    mechanics: {
      changes: [
        {
          formula: 1,
          target: `${changePrefix}_damage`,
          type: "untyped",
        },
        {
          formula: 1,
          target: `${changePrefix}_morale_check`,
          type: "untyped",
        },
      ],
    },
  },
  ovw: {
    label: "PF1FS.Boons.Overwhelming",
    selectSquad: false,
    takeMultiple: true,
    mechanics: {
      changes: [
        {
          formula: 1,
          target: `${changePrefix}_max_squadrons`,
          type: "untyped",
        },
      ],
    },
  },
  rm: {
    label: "PF1FS.Boons.RecklessManeuver",
    selectSquad: true,
    takeMultiple: true,
    mechanics: {
      changes: [
        {
          formula: -2,
          target: `${changePrefix}_dv`,
          type: "untyped",
        },
        {
          formula: 4,
          target: `${changePrefix}_av`,
          type: "untyped",
        },
      ],
    },
  },
  ra: {
    label: "PF1FS.Boons.RemorselessAdvance",
    selectSquad: true,
    takeMultiple: false,
    mechanics: {
      changes: [
        {
          formula: 2,
          target: `${changePrefix}_av`,
          type: "untyped",
        },
        {
          formula: 2,
          target: `${changePrefix}_damage`,
          type: "untyped",
        },
      ],
      contextNotes: [
        {
          text: "+[[1]] at start of battle phase",
          target: `${changePrefix}_morale_score`,
        },
      ],
    },
  },
  sr: {
    label: "PF1FS.Boons.SwiftRepairs",
    selectSquad: false,
    takeMultiple: false,
    mechanics: {
      contextNotes: [
        {
          text: "remove [[1d6]] damage from a single squadron after battle phase",
          target: `${changePrefix}_hits`,
        },
      ],
    },
  },
  sb: {
    label: "PF1FS.Boons.SwiftBattle",
    selectSquad: false,
    takeMultiple: true,
    mechanics: {
      changes: [
        {
          formula: 4,
          target: `${changePrefix}_initiative`,
          type: "untyped",
        },
      ],
    },
  },
  ven: {
    label: "PF1FS.Boons.Vengeance",
    selectSquad: false,
    takeMultiple: false,
    mechanics: {
      changes: [
        {
          formula: 2,
          target: `${changePrefix}_av`,
          type: "untyped",
        },
        {
          formula: 2,
          target: `${changePrefix}_morale_check`,
          type: "untyped",
        },
      ],
    },
  },
};

export const shipTypes = {
  raft: "PF1FS.Ship.Raft",
  row: "PF1FS.Ship.Rowboat",
  boat: "PF1FS.Ship.ShipsBoat",
  keel: "PF1FS.Ship.Keelboat",
  junk: "PF1FS.Ship.Junk",
  long: "PF1FS.Ship.Longship",
  sail: "PF1FS.Ship.SailingShip",
  gal: "PF1FS.Ship.Galley",
  war: "PF1FS.Ship.Warship",
};

export const maxShipHits = {
  raft: 1,
  row: 1,
  boat: 1,
  keel: 2,
  junk: 3,
  long: 3,
  sail: 3,
  gal: 4,
  war: 4,
};

export const settings = {
  useInfamy: "PF1FS.Settings.UseInfamy",
};
