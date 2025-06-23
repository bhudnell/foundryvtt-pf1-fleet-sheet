import { DefaultChange } from "../../util/utils.mjs";

import { BaseActor } from "./baseActor.mjs";

export class FleetActor extends BaseActor {
  async rollAttribute(attribute, squadId, options = {}) {
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
        (c) =>
          c.value &&
          c.operator !== "set" &&
          [
            `${pf1fs.config.changePrefix}.${attribute}`,
            `${pf1fs.config.changePrefix}.${attribute}.${squadId}`,
          ].includes(c.target)
      ),
      { ignoreTarget: true }
    );

    for (const c of highestChanges) {
      parts.push(`${c.value}[${c.flavor}]`);
    }

    // Add context notes
    const rollData = options.rollData || this.getRollData();

    const notes = await this.getContextNotesParsed(
      [`${pf1fs.config.changePrefix}.${attribute}`, `${pf1fs.config.changePrefix}.${attribute}.${squadId}`],
      { rollData }
    );

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
    const chatTemplateData = { properties: props, isAttack: attribute === "av", actorId: this._id, squadId };

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

  async rollDamage(hit, squadId, options = {}) {
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
          (c) =>
            c.value &&
            c.operator !== "set" &&
            [
              `${pf1fs.config.changePrefix}.damageBonus`,
              `${pf1fs.config.changePrefix}.damageBonus.${squadId}`,
            ].includes(c.target)
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

    const notes = await this.getContextNotesParsed(
      [`${pf1fs.config.changePrefix}.damageBonus`, `${pf1fs.config.changePrefix}.damageBonus.${squadId}`],
      { rollData }
    );

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

    // squadron stuff
    for (const squad of system.squadrons) {
      const sigCharBonus = squad.commodore.isSignificant ? 2 : 0;
      const mercPenalty = squad.isMercenary ? 2 : 0;
      const shipCount = squad.ships.filter((s) => !s.disabled).length;
      // dv
      changes.push(
        new DefaultChange(squad.commodore.profSailor, `${pf1fs.config.changePrefix}.dv.${squad.id}`, "PF1FS.Commodore")
      );
      // av
      changes.push(
        new DefaultChange(squad.commodore.profSailor, `${pf1fs.config.changePrefix}.av.${squad.id}`, "PF1FS.Commodore"),
        new DefaultChange(sigCharBonus, `${pf1fs.config.changePrefix}.av.${squad.id}`, "PF1FS.SigCharacter")
      );
      // damage bonus
      changes.push(
        new DefaultChange(shipCount, `${pf1fs.config.changePrefix}.damageBonus.${squad.id}`, "PF1FS.TotalShips"),
        new DefaultChange(sigCharBonus, `${pf1fs.config.changePrefix}.damageBonus.${squad.id}`, "PF1FS.SigCharacter")
      );
      // morale
      changes.push(
        new DefaultChange(squad.commodore.chaMod, `${pf1fs.config.changePrefix}.morale.${squad.id}`, "PF1FS.Commodore"),
        new DefaultChange(sigCharBonus, `${pf1fs.config.changePrefix}.morale.${squad.id}`, "PF1FS.SigCharacter"),
        new DefaultChange(-squad.lossCount, `${pf1fs.config.changePrefix}.morale.${squad.id}`, "PF1FS.LossCount"),
        new DefaultChange(-mercPenalty, `${pf1fs.config.changePrefix}.morale.${squad.id}`, "PF1FS.MercenarySquadron")
      );
      // max ships
      changes.push(
        new DefaultChange(
          squad.commodore.chaMod,
          `${pf1fs.config.changePrefix}.max_ships.${squad.id}`,
          "PF1FS.Commodore"
        )
      );
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

  getSourceDetails(path) {
    const sources = super.getSourceDetails(path);

    const baseLabel = game.i18n.localize("PF1.Base");

    if (/^system\.squadrons\.\w+\.combat\.dv\.total$/.test(path)) {
      sources.unshift({
        name: baseLabel,
        value: 10,
      });
    }
    if (/^system\.squadrons\.\w+\.config\.maxShips$/.test(path)) {
      sources.unshift({
        name: baseLabel,
        value: 3,
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
