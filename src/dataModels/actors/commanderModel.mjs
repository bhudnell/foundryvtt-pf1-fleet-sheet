export class CommanderModel extends foundry.abstract.DataModel {
  static defineSchema() {
    const fields = foundry.data.fields;

    return {
      actor: new fields.ForeignDocumentField(pf1.documents.actor.ActorPF),
      kingdomLeader: new fields.BooleanField({ initial: false }),
    };
  }

  get name() {
    return this.actor?.name;
  }

  get chaMod() {
    if (!this.actor) {
      return 0;
    }

    return this.actor.system.abilities.cha.mod;
  }

  get profSoldier() {
    if (!this.actor) {
      return 0;
    }

    return this.actor.system.skills.pro.subSkills.soldier?.rank ?? 0;
  }

  get hd() {
    if (!this.actor) {
      return 0;
    }

    return this.actor.system.attributes.hd?.total ?? 0;
  }

  get moraleBonus() {
    if (!this.actor) {
      return 0;
    }

    const soldierBonus = Math.floor(this.profSoldier / 5);
    const hdBonus = Math.floor(this.hd / 6);

    return this.chaMod + Math.max(soldierBonus, this.kingdomLeader ? hdBonus : 0);
  }

  get leadership() {
    if (!this.actor) {
      return 0;
    }
    const leadershipBonus = this.actor.itemTypes.feat.some(
      (i) => i.name === "Leadership" && i.system.subType === "feat"
    )
      ? 3
      : 0;

    return this.hd + this.chaMod + leadershipBonus;
  }

  get currBoons() {
    return this.parent.parent.itemTypes[pf1fs.config.boonId].length;
  }

  get maxBoons() {
    if (!this.actor) {
      return 0;
    }

    const soldierBonus = Math.floor(this.profSoldier / 5);
    const hdBonus = Math.floor(this.hd / 6);

    return 1 + Math.max(soldierBonus, this.kingdomLeader ? hdBonus : 0);
  }
}
