import { changePrefix } from "./config.mjs";

export const buffTargets = {
  // [`${changePrefix}_consumption`]: {
  //   category: `${changePrefix}_misc`,
  //   label: "PF1FS.Consumption",
  //   filters: { item: { include: armyItemTypes } },
  // },
  // ...Object.entries(armyAttributes).reduce((acc, [key, label]) => {
  //   acc[`${changePrefix}_${key}`] = { category: `${changePrefix}_army_attributes`, label };
  //   return acc;
  // }, {}),
};

export const buffTargetCategories = {
  // [`${changePrefix}_kingdom_stats`]: {
  //   label: "PF1FS.KingdomStat",
  //   filters: { item: { include: kingdomItemTypes } },
  // },
  // [`${changePrefix}_settlement_modifiers`]: {
  //   label: "PF1FS.SettlementModifiers",
  //   filters: { item: { include: kingdomItemTypes } },
  // },
  // [`${changePrefix}_magic_items`]: {
  //   label: "PF1FS.MagicItems",
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
