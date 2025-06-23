export function getChangeFlat(result, target, modifierType, value, actor) {
  if (!target.startsWith(pf1fs.config.changePrefix)) {
    return result;
  }

  switch (target) {
    case `${pf1fs.config.changePrefix}.max_squadrons`:
      result.push("system.maxSquadrons.total");
      break;
    case `${pf1fs.config.changePrefix}.initiative`:
      result.push("system.init.total");
      break;
  }

  // squadron stuff
  const squadrons = actor.system.squadrons;
  const squadronRegExp = new RegExp(`${pf1fs.config.changePrefix}\\.(?<bonus>[\\w]+)(?:\\.(?<id>\\w+))?$`);
  const squadronRes = squadronRegExp.exec(target);
  if (squadronRes) {
    const { bonus, id } = squadronRes.groups;
    const indexes = id ? [squadrons.findIndex((squad) => squad.id === id)] : squadrons.keys();

    // combat modifiers
    if (Object.keys(pf1fs.config.combatAttributes).includes(bonus)) {
      for (const idx of indexes) {
        result.push(`system.squadrons.${idx}.combat.${bonus}.total`);
      }
    }

    // morale score
    if (bonus === "morale_score") {
      for (const idx of indexes) {
        result.push(`system.squadrons.${idx}.moraleScore`);
      }
    }

    // hits
    if (bonus === "hits") {
      for (const idx of indexes) {
        result.push(`system.squadrons.${idx}.totalHits.current`); // TODO this might be bad
      }
    }

    // max ships
    if (bonus === "max_ships") {
      for (const idx of indexes) {
        result.push(`system.squadrons.${idx}.config.maxShips`);
      }
    }
  }

  return result;
}
