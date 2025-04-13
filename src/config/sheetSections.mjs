import { fleetId, boonId } from "./config.mjs";

export const sheetSections = {
  fleetCommander: {
    boon: {
      create: { type: boonId },
      filters: [{ type: boonId }],
      interface: {},
      label: `PF1.Subtypes.Item.${boonId}.Plural`,
      browseLabel: "PF1FS.Browse.Boons",
    },
  },
};
