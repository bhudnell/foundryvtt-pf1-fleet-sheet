// TODO make commander and sig character model extend this
export class ActorProxyModel extends foundry.abstract.DataModel {
  static defineSchema() {
    const fields = foundry.data.fields;

    return {
      id: new fields.StringField({ required: true, nullable: false, blank: false }),
      actor: new fields.ForeignDocumentField(pf1.documents.actor.ActorBasePF, { required: true }),
    };
  }
}
