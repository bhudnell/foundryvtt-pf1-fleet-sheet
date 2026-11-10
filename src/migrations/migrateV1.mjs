import { log } from "../util/utils.mjs";

import { BaseMigrate } from "./baseMigrate.mjs";

export class MigrateV1 extends BaseMigrate {
  static async migrateActor(actor) {
    if (actor.type !== pf1fs.config.fleetId) {
      return;
    }

    log(`migrating actor '${actor?.name}'`);

    // create squadron actors
    const squadrons = actor.system.squadrons;

    log(`creating ${squadrons.length} new squadron actors`);
    const squadronActors = await Actor.implementation.createDocuments(
      squadrons.map((s) => {
        const { name, id, ...system } = s.toObject();
        return {
          name,
          type: pf1fs.config.squadronId,
          ownership: actor.ownership,
          system: {
            ...system,
            fleet: { id: foundry.utils.randomID(), actor: actor.id },
          },
        };
      })
    );
    log(`...finished creating ${squadronActors.length} new squadron actors`);

    // create map of fleet squadron id -> squadron actor id
    const squadronActorIdByName = new Map(squadronActors.map((sa) => [sa.name, sa.id]));
    const fleetSquadronIdByName = new Map(squadrons.map((sa) => [sa.name, sa.id]));

    // create squadron proxy items on fleet
    const squadronProxies = squadrons.map((s) => ({
      id: foundry.utils.randomID(),
      actor: squadronActorIdByName.get(s.name),
    }));

    // unset fleet squadron array and set the new squadron proxies
    log(`updating actor '${actor?.name}'`);
    await actor.update({ "system.squadrons": [], "system.squadronProxies": squadronProxies });
    log(`...finished updating actor '${actor?.name}'`);

    log("...finished migrating actor");
  }

  static getItemUpdateData(item) {}
}
