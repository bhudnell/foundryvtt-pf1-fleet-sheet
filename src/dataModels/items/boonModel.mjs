import { ItemBaseModel } from "./itemBaseModel.mjs";

export class BoonModel extends ItemBaseModel {
  static defineSchema() {
    const fields = foundry.data.fields;

    const schema = {};
    this.addDefaultSchemaFields(schema);

    return schema;
  }

  prepareDerivedData() {}
}
