export function getChangeFlat(result, target, modifierType, value, actor) {
  if (!target.startsWith(pf1fs.config.changePrefix)) {
    return result;
  }

  switch (target) {
    case `${pf1fs.config.changePrefix}_consumption`:
      result.push("system.consumption.total");
      break;
  }

  return result;
}
