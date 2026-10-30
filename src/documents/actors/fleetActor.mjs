import { DefaultChange } from "../../util/utils.mjs";

import { BaseActor } from "./baseActor.mjs";

export class FleetActor extends BaseActor {
  _prepareTypeChanges(changes) {
    const system = this.system;

    // init
    changes.push(
      new DefaultChange(system.admiral.profSailor, `${pf1fs.config.changePrefix}.initiative`, "PF1FS.Admiral")
    );

    // max squadrons
    if (system.settings.useInfamy) {
      changes.push(
        new DefaultChange(Math.floor(system.infamy / 10), `${pf1fs.config.changePrefix}.max_squadrons`, "PF1FS.Infamy"),
        new DefaultChange(system.admiral.chaMod, `${pf1fs.config.changePrefix}.max_squadrons`, "PF1FS.Admiral")
      );
    } else {
      changes.push(
        new DefaultChange(3, `${pf1fs.config.changePrefix}.max_squadrons`, "PF1.Base"),
        new DefaultChange(system.admiral.chaMod, `${pf1fs.config.changePrefix}.max_squadrons`, "PF1FS.Admiral")
      );
    }

    // significant character boons
    for (const char of system.significantCharacters) {
      const boon = pf1fs.config.boons[char.boon.key];
      const squadId = char.boon.squadronId;

      if (!boon || (boon.selectSquad && !squadId) || !boon.mechanics.changes) {
        continue;
      }

      // special case for loyalty/vengeance boons
      if ((char.boon.key === "loy" && !system.loyaltyActive) || (char.boon.key === "ven" && !system.vengeanceActive)) {
        continue;
      }

      for (const change of boon.mechanics.changes) {
        const changeData = { ...change, flavor: boon.label };
        if (boon.selectSquad) {
          changeData.target += `.${squadId}`;
        }
        changes.push(new pf1.components.ItemChange(changeData));
      }
    }
  }

  _prepareConditionChanges(changes) {
    for (const [con, v] of Object.entries(this.system.conditions)) {
      const condition = pf1fs.config.fleetConditions[con];

      if (!v || !condition || !condition.mechanics.changes) {
        continue;
      }

      for (const change of condition.mechanics.changes) {
        const changeData = { ...change, flavor: condition.name };
        const changeObj = new pf1.components.ItemChange(changeData);
        changes.push(changeObj);
      }
    }
  }

  prepareConditions() {
    this.system.conditions = {};
    const conditions = this.system.conditions;

    for (const condition of Object.keys(pf1fs.config.fleetConditions)) {
      conditions[condition] = this.statuses.has(condition);
    }
  }
}
