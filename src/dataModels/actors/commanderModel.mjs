export class CommanderModel extends foundry.abstract.DataModel {
  static defineSchema() {
    const fields = foundry.data.fields;

    return {
      actor: new fields.ForeignDocumentField(pf1.documents.actor.ActorPF),
      isSignificant: new fields.BooleanField(),
    };
  }

  get actorId() {
    return this.actor?._id;
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

  get profSailor() {
    if (!this.actor) {
      return 0;
    }

    return this.actor.system.skills.pro.subSkills.sailor?.rank ?? 0;
  }
}
