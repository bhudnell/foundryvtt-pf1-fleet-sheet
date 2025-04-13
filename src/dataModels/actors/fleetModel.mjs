import { CommanderModel } from "./commanderModel.mjs";

export class FleetModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      commander: new fields.EmbeddedDataField(CommanderModel),

      notes: new fields.SchemaField({
        value: new fields.HTMLField({ required: false, blank: true }),
      }),
    };
  }

  prepareBaseData() {}

  prepareDerivedData() {}

  get skills() {
    return {};
  }
}
