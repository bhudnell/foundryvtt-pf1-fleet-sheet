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
    };
  }

  prepareDerivedData() {
    if (Object.keys(pf1fs.config.shipTypes).includes(this.config.shipType)) {
      this.config.maxShipHits = pf1fs.config.maxShipHits[this.config.shipType];
    }
    this.config.maxShips = 3 + this.commodore.chaMod;

    this.ships.forEach((ship) => ship.prepareDerivedData());

    const shipCount = this.ships.filter((s) => !s.disabled).length;
    const sigCharacterBonus = this.commodore.isSignificant ? 2 : 0;

    this.combat = {
      dv: { base: 10, commodore: this.commodore.profSailor },
      av: { commodore: this.commodore.profSailor, sigCharacter: sigCharacterBonus },
      damageBonus: {totalShips: shipCount, sigCharacter: sigCharacterBonus }, // TODO make this damageBonus and it'll just get added to the 1d6 on a hit (a miss is always 1d4-1)
      morale: { commodore: this.commodore.chaMod, sigCharacter: sigCharacterBonus, losses: this.lossCount },
    };

    this.combat.dv.total = this.combat.dv.base + this.combat.dv.commodore;
    this.combat.av.total = this.combat.av.commodore + this.combat.av.sigCharacter;
    this.combat.damageBonus.total = this.combat.damageBonus.totalShips + this.combat.damageBonus.sigCharacter;
    this.combat.morale.total =
      this.combat.morale.commodore + this.combat.morale.sigCharacter - this.combat.morale.losses;
  }

  get totalHits() {
    const ships = this.ships.filter((s) => !s.disabled);

    return {
      current: ships.reduce((accum, curr) => accum + curr.currentHits, 0),
      max: ships.length * this.config.maxShipHits,
    };
  }
}
