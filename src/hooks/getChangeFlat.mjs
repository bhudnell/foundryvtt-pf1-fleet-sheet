export function getChangeFlat(result, target, modifierType, value, actor) {
  if (!target.startsWith(pf1fs.config.changePrefix)) {
    return result;
  }

  const realTarget = target.slice(pf1fs.config.changePrefix.length + 1);

  switch (realTarget) {
    case "max_squadrons":
      result.push("system.maxSquadrons.total");
      break;
    case "initiative":
      result.push("system.init.total");
      break;

    case "dv":
    case "av":
    case "damageBonus":
    case "morale":
      result.push(`system.combat.${realTarget}.total`);
      break;
    case "morale_score":
      result.push("system.moraleScore");
      break;
    case "hits":
      result.push("system.totalHits.current");
      break;
    case "max_ships":
      result.push("system.config.maxShips");
      break;
  }

  return result;
}
