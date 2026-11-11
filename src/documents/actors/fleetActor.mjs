import { syncManager } from "../../util/syncManager.mjs";
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

      if (!boon || boon.forSquadron || !boon.mechanics.changes) {
        continue;
      }

      for (const change of boon.mechanics.changes) {
        changes.push(new pf1.components.ItemChange({ ...change, flavor: boon.label }));
      }
    }
  }

  _prepareConditionChanges(changes) {
    for (const [con, v] of Object.entries(this.system.conditions)) {
      const condition = pf1.registry.conditions.get(con);

      if (!v || !condition || condition.flags?.[pf1fs.config.moduleId].forSquadron || !condition.mechanics.changes) {
        continue;
      }

      for (const change of condition.mechanics.changes) {
        changes.push(new pf1.components.ItemChange({ ...change, flavor: condition.name }));
      }
    }
  }

  prepareConditions() {
    this.system.conditions = {};
    const conditions = this.system.conditions;

    for (const condition of pf1.registry.conditions.keys().filter((c) => c.startsWith(pf1fs.config.changePrefix))) {
      conditions[condition] = this.statuses.has(condition);
    }
  }

  get allNotes() {
    const allNotes = [];

    // add significant character notes
    for (const char of this.system.significantCharacters) {
      const boon = pf1fs.config.boons[char.boon.key];
      const squadId = char.boon.squadronId;

      if (!boon || boon.forSquadron || !boon.mechanics.contextNotes) {
        continue;
      }

      const sigCharNotes = [];
      for (const note of boon.mechanics.contextNotes) {
        const noteCopy = { ...note };
        if (boon.selectSquad) {
          noteCopy.target += `.${squadId}`;
        }
        sigCharNotes.push(new pf1.components.ContextNote(noteCopy, { parent: this }));
      }
      allNotes.push({ notes: sigCharNotes, item: null });
    }

    // add condition notes
    for (const [con, v] of Object.entries(this.system.conditions)) {
      const condition = pf1.registry.conditions.get(con);

      if (
        !v ||
        !condition ||
        condition.flags?.[pf1fs.config.moduleId].forSquadron ||
        !condition.mechanics.contextNotes
      ) {
        continue;
      }

      const conditionNotes = [];
      for (const note of condition.mechanics.contextNotes) {
        conditionNotes.push(new pf1.components.ContextNote(note, { parent: this }));
      }
      allNotes.push({ notes: conditionNotes, item: null });
    }

    return allNotes;
  }

  prepareData() {
    super.prepareData();

    if (!this.isToken && !syncManager.active) {
      syncManager.run(this, () => {
        this._syncSquadrons();
      });
    }
  }

  _syncSquadrons() {
    this.system.squadronProxies?.forEach((proxy) => {
      if (proxy.actor) {
        syncManager.prepare(proxy.actor);
      }
    });
  }
}
