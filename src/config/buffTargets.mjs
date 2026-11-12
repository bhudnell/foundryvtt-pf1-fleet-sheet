import { changePrefix, combatAttributes } from "./config.mjs";

export const buffTargets = {
  [`${changePrefix}_max_squadrons`]: {
    category: `${changePrefix}_module`,
    label: "PF1FS.MaxSquadrons",
  },
  [`${changePrefix}_initiative`]: {
    category: `${changePrefix}_module`,
    label: "PF1.Initiative",
  },
  ...Object.entries(combatAttributes).reduce((acc, [key, label]) => {
    acc[`${changePrefix}_${key}`] = { category: `${changePrefix}_module`, label };
    return acc;
  }, {}),
};

export const buffTargetCategories = {
  [`${changePrefix}_module`]: {
    label: "PF1FS.FleetManagement",
  },
};
