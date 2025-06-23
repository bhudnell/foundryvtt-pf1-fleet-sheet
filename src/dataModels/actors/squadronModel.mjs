import { CommanderModel } from "./commanderModel.mjs";
import { ShipModel } from "./shipModel.mjs";

export class SquadronModel extends foundry.abstract.DataModel {
  static defineSchema() {
    const fields = foundry.data.fields;

    return {
      id: new fields.StringField({ required: true, nullable: false, blank: false }),
      name: new fields.StringField(),
      moraleScore: new fields.NumberField({ integer: true, min: 0, max: 10 }),
      config: new fields.SchemaField({
        shipType: new fields.StringField({ blank: true, choices: [...Object.keys(pf1fs.config.shipTypes), "custom"] }),
        maxShipHits: new fields.NumberField({ integer: true, min: 1 }),
      }),
      lossCount: new fields.NumberField({ integer: true, min: 0, initial: 0, nullable: false }),
      ships: new fields.ArrayField(new fields.EmbeddedDataField(ShipModel)),
      commodore: new fields.EmbeddedDataField(CommanderModel),
      isMercenary: new fields.BooleanField(),
    };
  }

  prepareDerivedData() {
    if (Object.keys(pf1fs.config.shipTypes).includes(this.config.shipType)) {
      this.config.maxShipHits = pf1fs.config.maxShipHits[this.config.shipType];
    }
    this.config.maxShips = 3;

    this.ships.forEach((ship) => ship.prepareDerivedData());

    this.combat = {
      dv: { total: 10 },
      av: { total: 0 },
      damageBonus: { total: 0 },
      morale: { total: 0 },
    };
  }

  get totalHits() {
    const ships = this.ships.filter((s) => !s.disabled);

    return {
      current: ships.reduce((accum, curr) => accum + curr.currentHits, 0),
      max: ships.length * this.config.maxShipHits,
    };
  }
}
