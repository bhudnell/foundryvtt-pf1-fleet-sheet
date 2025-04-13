import { DefaultChange } from "../../util/utils.mjs";

import { BaseActor } from "./baseActor.mjs";

export class FleetActor extends BaseActor {
  _prepareTypeChanges(changes) {
    const system = this.system;

    // strategy
    // changes.push(
    //   new DefaultChange((system.strategy - 2) * -2, `${pf1fs.config.changePrefix}_dv`, "PF1FS.Army.StrategyLabel"),
    //   new DefaultChange((system.strategy - 2) * 2, `${pf1fs.config.changePrefix}_om`, "PF1FS.Army.StrategyLabel"),
    //   new DefaultChange((system.strategy - 2) * 3, `${pf1fs.config.changePrefix}_damage`, "PF1FS.Army.StrategyLabel")
    // );
  }

  _prepareConditionChanges(changes) {
    for (const [con, v] of Object.entries(this.system.conditions)) {
      if (!v) {
        continue;
      }
      const condition = pf1fs.config.fleetConditions[con];
      if (!condition) {
        continue;
      }

      const mechanic = condition.mechanics;
      if (!mechanic) {
        continue;
      }

      for (const change of mechanic.changes ?? []) {
        const changeData = { ...change, flavor: condition.name };
        const changeObj = new pf1.components.ItemChange(changeData);
        changes.push(changeObj);
      }
    }
  }

  getSourceDetails(path) {
    const sources = super.getSourceDetails(path);

    const baseLabel = game.i18n.localize("PF1.Base");

    if (path === "system.tactics.max.total") {
      sources.push({
        name: baseLabel,
        value: this.system.tactics.max.base,
      });
    }

    return sources;
  }

  prepareConditions() {
    this.system.conditions = {};
    const conditions = this.system.conditions;

    for (const condition of Object.keys(pf1fs.config.fleetConditions)) {
      conditions[condition] = this.statuses.has(condition);
    }
  }
}
