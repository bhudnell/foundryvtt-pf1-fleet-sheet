export class ShipModel extends foundry.abstract.DataModel {
  static defineSchema() {
    const fields = foundry.data.fields;

    return {
      id: new fields.StringField({ required: true, nullable: false, blank: false }),
      name: new fields.StringField(),
      currentHits: new fields.NumberField({ integer: true, initial: 0 }),
    };
  }

  prepareDerivedData() {
    this.disabled = this.currentHits < 1;
  }
}
