import { changePrefix } from "./config.mjs";

export const contextNoteTargets = {
  // [`${changePrefix}_bonusBP`]: {
  //   category: `${changePrefix}_misc`,
  //   label: "PF1FS.BonusBP",
  //   filters: { item: { include: kingdomItemTypes } },
  // },
  // ...Object.entries(kingdomStats).reduce((acc, [key, label]) => {
  //   acc[`${changePrefix}_${key}`] = { category: `${changePrefix}_kingdom_stats`, label };
  //   return acc;
  // }, {}),
};

export const contextNoteCategories = {
  // [`${changePrefix}_kingdom_stats`]: {
  //   label: "PF1FS.KingdomStat",
  //   filters: { item: { include: kingdomItemTypes } },
  // },
  // [`${changePrefix}_settlement_modifiers`]: {
  //   label: "PF1FS.SettlementModifiers",
  //   filters: { item: { include: kingdomItemTypes } },
  // },
  // [`${changePrefix}_misc`]: {
  //   label: "PF1.Misc",
  //   filters: { item: { include: [...kingdomItemTypes, ...armyItemTypes] } },
  // },
  // [`${changePrefix}_army_attributes`]: {
  //   label: "PF1FS.ArmyAttributes",
  //   filters: { item: { include: armyItemTypes } },
  // },
};
