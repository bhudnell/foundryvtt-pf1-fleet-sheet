import { boonId, changePrefix, combatAttributes } from "./config.mjs";

export const buffTargets = {
  [`${changePrefix}_max_squadrons`]: {
    category: `${changePrefix}_misc`,
    label: "PF1FS.MaxFleets",
  },
  [`${changePrefix}_initiative`]: {
    category: `${changePrefix}_misc`,
    label: "PF1FS.Initiative",
  },
  ...Object.entries(combatAttributes).reduce((acc, [key, label]) => {
    acc[`${changePrefix}_${key}`] = { category: `${changePrefix}_combat_attributes`, label };
    return acc;
  }, {}),
};

export const buffTargetCategories = {
  [`${changePrefix}_misc`]: {
    label: "PF1.Misc",
    filters: { item: { include: [boonId] } },
  },
  [`${changePrefix}_combat_attributes`]: {
    label: "PF1FS.CombatAttributes",
    filters: { item: { include: [boonId] } },
  },
};
