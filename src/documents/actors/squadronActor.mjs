import { syncManager } from "../../util/syncManager.mjs";
import { DefaultChange } from "../../util/utils.mjs";

import { BaseActor } from "./baseActor.mjs";

export class SquadronActor extends BaseActor {
  async rollAttribute(attribute, options = {}) {
    const {
      skipDialog = pf1.documents.settings.getSkipActionPrompt(),
      staticRoll = null,
      chatMessage = true,
      compendium,
      noSound = false,
      dice = pf1.dice.D20RollPF.standardRoll,
      subject,
      bonus = "",
      messageData = undefined,
    } = options;

    const parts = [];
    const props = [];

    const highestChanges = pf1.documents.actor.changes.getHighestChanges(
      this.changes.filter(
        (c) => c.value && c.operator !== "set" && c.target === `${pf1fs.config.changePrefix}.${attribute}`
      ),
      { ignoreTarget: true }
    );

    for (const c of highestChanges) {
      parts.push(`${c.value}[${c.flavor}]`);
    }

    // Add context notes
    const rollData = options.rollData || this.getRollData();

    const notes = await this.getContextNotesParsed(`${pf1fs.config.changePrefix}.${attribute}`, { rollData });

    if (notes.length > 0) {
      props.push({ header: game.i18n.localize("PF1.Notes"), value: notes });
    }

    const label = pf1fs.config.combatAttributes[attribute];
    const actor = options.actor ?? this;
    const token = options.token ?? this.token;

    let rollMode = options.rollMode;

    const formula = [dice, ...parts].join("+");
    const flavor = game.i18n.format("PF1FS.AttributeRoll", { check: label });
    const speaker = ChatMessage.getSpeaker({ actor, token, alias: token?.name });

    const roll = new pf1.dice.D20RollPF(formula, rollData, { flavor, staticRoll, bonus }, { speaker });
    if (!skipDialog) {
      const title = speaker?.alias ? `${speaker.alias}: ${flavor}` : flavor;
      const dialogResult = await roll.promptDialog({ title, rollMode, subject, speaker });
      if (dialogResult === null) {
        return;
      }

      // Move roll mode selection from roll data
      rollMode = roll.options.rollMode;
      delete roll.options.rollMode;
    }

    const chatTemplate = `modules/${pf1fs.config.moduleId}/templates/chat/attribute-roll.hbs`;
    const chatTemplateData = { properties: props, isAttack: attribute === "av", actorId: this._id };

    const mData = foundry.utils.mergeObject(
      {
        type: "check",
        style: CONST.CHAT_MESSAGE_STYLES.OTHER,
        rolls: [roll],
        flags: { [pf1fs.config.moduleId]: { attackCard: attribute === "av" } },
      },
      messageData
    );

    return roll.toMessage(
      { ...mData, speaker },
      { create: chatMessage, noSound, chatTemplate, chatTemplateData, compendium, subject, rollMode }
    );
  }

  async rollDamage(hit, options = {}) {
    const {
      staticRoll = null,
      chatMessage = true,
      compendium,
      noSound = false,
      subject,
      bonus = "",
      messageData = undefined,
    } = options;

    const parts = [];
    const props = [];

    if (hit) {
      const highestChanges = pf1.documents.actor.changes.getHighestChanges(
        this.changes.filter(
          (c) => c.value && c.operator !== "set" && c.target === `${pf1fs.config.changePrefix}.damageBonus`
        ),
        { ignoreTarget: true }
      );

      for (const c of highestChanges) {
        parts.push(`${c.value}[${c.flavor}]`);
      }
    } else {
      parts.push(`-1[${game.i18n.localize("PF1.Base")}]`);
    }

    // Add context notes
    const rollData = options.rollData || this.getRollData();

    const notes = await this.getContextNotesParsed(`${pf1fs.config.changePrefix}.damageBonus`, { rollData });

    if (notes.length > 0) {
      props.push({ header: game.i18n.localize("PF1.Notes"), value: notes });
    }

    const label = game.i18n.localize(hit ? "PF1FS.Hit" : "PF1FS.Miss");
    const actor = options.actor ?? this;
    const token = options.token ?? this.token;

    let rollMode = options.rollMode;

    const dice = hit ? "1d6" : "1d4";
    const formula = [dice, ...parts].join("+");
    const flavor = game.i18n.format("PF1FS.DamageRoll", { type: label });
    const speaker = ChatMessage.getSpeaker({ actor, token, alias: token?.name });

    const roll = new pf1.dice.D20RollPF(formula, rollData, { flavor, staticRoll, bonus }, { speaker });

    const chatTemplate = `modules/${pf1fs.config.moduleId}/templates/chat/damage-roll.hbs`;
    const chatTemplateData = { properties: props };

    const mData = foundry.utils.mergeObject(
      {
        type: "check",
        style: CONST.CHAT_MESSAGE_STYLES.OTHER,
        rolls: [roll],
      },
      messageData
    );

    return roll.toMessage(
      { ...mData, speaker },
      { create: chatMessage, noSound, chatTemplate, chatTemplateData, compendium, subject, rollMode }
    );
  }

  _prepareTypeChanges(changes) {
    const system = this.system;

    const sigCharBonus = system.commodore.isSignificant ? 2 : 0;
    const mercPenalty = system.isMercenary ? 2 : 0;
    const shipCount = system.ships.filter((s) => !s.disabled).length;

    // dv
    changes.push(new DefaultChange(system.commodore.profSailor, `${pf1fs.config.changePrefix}.dv`, "PF1FS.Commodore"));

    // av
    changes.push(
      new DefaultChange(system.commodore.profSailor, `${pf1fs.config.changePrefix}.av`, "PF1FS.Commodore"),
      new DefaultChange(sigCharBonus, `${pf1fs.config.changePrefix}.av`, "PF1FS.SigCharacter")
    );

    // damage bonus
    changes.push(
      new DefaultChange(shipCount, `${pf1fs.config.changePrefix}.damageBonus`, "PF1FS.TotalShips"),
      new DefaultChange(sigCharBonus, `${pf1fs.config.changePrefix}.damageBonus`, "PF1FS.SigCharacter")
    );

    // morale
    changes.push(
      new DefaultChange(system.commodore.chaMod, `${pf1fs.config.changePrefix}.morale`, "PF1FS.Commodore"),
      new DefaultChange(sigCharBonus, `${pf1fs.config.changePrefix}.morale`, "PF1FS.SigCharacter"),
      new DefaultChange(-system.lossCount, `${pf1fs.config.changePrefix}.morale`, "PF1FS.LossCount"),
      new DefaultChange(-mercPenalty, `${pf1fs.config.changePrefix}.morale`, "PF1FS.MercenarySquadron")
    );

    // max ships
    changes.push(
      new DefaultChange(system.commodore.chaMod, `${pf1fs.config.changePrefix}.max_ships`, "PF1FS.Commodore")
    );

    // significant character boons
    const fleet = this.system.fleet?.actor;
    if (fleet) {
      for (const char of fleet.system.significantCharacters) {
        const boon = pf1fs.config.boons[char.boon.key];
        const squadId = char.boon.squadronId;

        if (!boon || !boon.forSquadron || (boon.selectSquad && squadId !== this.id) || !boon.mechanics.changes) {
          continue;
        }

        for (const change of boon.mechanics.changes) {
          changes.push(new pf1.components.ItemChange({ ...change, flavor: boon.label }));
        }
      }
    }
  }

  getSourceDetails(path) {
    const sources = super.getSourceDetails(path);

    const baseLabel = game.i18n.localize("PF1.Base");

    if (path === "system.combat.dv.total") {
      sources.unshift({
        name: baseLabel,
        value: 10,
      });
    } else if (path === "system.config.maxShips") {
      sources.unshift({
        name: baseLabel,
        value: 3,
      });
    }

    return sources;
  }

  _prepareConditionChanges(changes) {
    const fleet = this.system.fleet?.actor;
    if (!fleet) {
      return;
    }

    for (const [con, v] of Object.entries(fleet.system.conditions)) {
      const condition = pf1fs.config.fleetConditions[con];

      if (!v || !condition || !condition.forSquadron || !condition.mechanics.changes) {
        continue;
      }

      for (const change of condition.mechanics.changes) {
        changes.push(new pf1.components.ItemChange({ ...change, flavor: condition.name }));
      }
    }
  }

  prepareConditions() {}

  get allNotes() {
    const allNotes = [];

    const fleet = this.system.fleet?.actor;
    if (!fleet) {
      return allNotes;
    }

    // add significant character notes
    for (const char of fleet.system.significantCharacters) {
      const boon = pf1fs.config.boons[char.boon.key];
      const squadId = char.boon.squadronId;

      if (!boon || !boon.forSquadron || (boon.selectSquad && squadId !== this.id) || !boon.mechanics.contextNotes) {
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
    for (const [con, v] of Object.entries(fleet.system.conditions)) {
      const condition = pf1fs.config.fleetConditions[con];

      if (!v || !condition || !condition.forSquadron || !condition.mechanics.contextNotes) {
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
        this._syncFleet();
      });
    }
  }

  _syncFleet() {
    const fleet = this.system.fleet?.actor;
    if (fleet) {
      syncManager.prepare(fleet);
    }
  }
}
