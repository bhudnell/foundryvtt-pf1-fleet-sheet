export class SignificantCharacterModel extends foundry.abstract.DataModel {
  static defineSchema() {
    const fields = foundry.data.fields;

    return {
      id: new fields.StringField({
        blank: false,
        initial: () => foundry.utils.randomID(),
        required: true,
        readonly: true,
      }),
      actor: new fields.ForeignDocumentField(pf1.documents.actor.ActorPF),
      location: new fields.StringField(),
      boon: new fields.SchemaField({
        key: new fields.StringField({ choices: Object.keys(pf1fs.config.boons) }),
        squadronId: new fields.StringField(),
      }),
    };
  }

  get actorId() {
    return this.actor?._id;
  }

  get name() {
    return this.actor?.name;
  }
}
