import { CommanderModel } from "./commanderModel.mjs";
import { SignificantCharacterModel } from "./significantCharacterModel.mjs";
import { SquadronModel } from "./squadronModel.mjs";

export class FleetModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      xp: new fields.NumberField({ integer: true }),
      infamy: new fields.NumberField({ integer: true }),
      admiral: new fields.EmbeddedDataField(CommanderModel),
      flagship: new fields.StringField(),
      homePort: new fields.StringField(),
      significantCharacters: new fields.ArrayField(new fields.EmbeddedDataField(SignificantCharacterModel)),
      squadrons: new fields.ArrayField(new fields.EmbeddedDataField(SquadronModel)),
      loyaltyActive: new fields.BooleanField({ initial: false }),
      vengeanceActive: new fields.BooleanField({ initial: false }),

      notes: new fields.SchemaField({
        value: new fields.HTMLField({ required: false, blank: true }),
      }),

      settings: new fields.SchemaField({
        useInfamy: new fields.BooleanField(),
      }),
    };
  }

  prepareBaseData() {
    this.init = {
      total: 0,
    };
    this.maxSquadrons = {
      total: 3,
    };
  }

  prepareDerivedData() {
    this.squadrons.forEach((s) => s.prepareDerivedData());
  }

  get skills() {
    return {};
  }
}
