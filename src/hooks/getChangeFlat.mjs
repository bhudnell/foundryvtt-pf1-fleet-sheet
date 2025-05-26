export function getChangeFlat(result, target, modifierType, value, actor) {
  if (!target.startsWith(pf1fs.config.changePrefix)) {
    return result;
  }

  switch (target) {
    case `${pf1fs.config.changePrefix}_max_squadrons`:
      result.push("system.maxSquadrons.total");
      break;
    case `${pf1fs.config.changePrefix}_initiative`:
      result.push("system.init.total");
      break;
    // squadron combat modifiers are handled outside the normal change flow but need to be here
    case `${pf1fs.config.changePrefix}_dv`:
    case `${pf1fs.config.changePrefix}_av`:
    case `${pf1fs.config.changePrefix}_damage`:
    case `${pf1fs.config.changePrefix}_morale_check`:
    case `${pf1fs.config.changePrefix}_morale_score`:
    case `${pf1fs.config.changePrefix}_hits`:
      result.push("system.someFakeData");
      break;
  }

  return result;
}
