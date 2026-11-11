/* eslint-disable no-await-in-loop */
import { log } from "../util/utils.mjs";

const truthiness = (x) => (typeof x === "string" ? !!x?.trim() : !!x);

export class BaseMigrate {
  static getActorUpdateData(actor) {
    throw new Error("must be overridden");
  }

  static getItemUpdateData(item) {
    throw new Error("must be overridden");
  }

  static getItemCreateData(item) {
    throw new Error("must be overridden");
  }

  static getItemDeleteData(item) {
    throw new Error("must be overridden");
  }

  static async migrateChatMessage(message) {
    throw new Error("must be overridden");
  }

  static async preMigration() {}

  static async postMigration() {}

  static async migrateActor(actor) {
    if (![pf1fs.config.fleetId, pf1fs.config.squadronId].includes(actor.type)) {
      return;
    }

    log(`migrating items for actor '${actor?.name}'`);

    await actor.update(this.getActorUpdateData(actor));

    if (actor?.items?.size) {
      const deletes = actor.items.map(this.getItemDeleteData).filter(truthiness);
      if (deletes.length) {
        await actor.deleteEmbeddedDocuments("Item", deletes);
      }
      const creates = actor.items.map(this.getItemCreateData).filter(truthiness);
      if (creates.length) {
        await actor.createEmbeddedDocuments("Item", creates.flat());
      }
      const updates = actor.items.map(this.getItemUpdateData).filter(truthiness);
      if (updates.length) {
        await actor.updateEmbeddedDocuments("Item", updates);
      }
    }

    log("...finished migrating actor");
  }

  static async migrateWorldItems() {
    log("migrating game items");

    await game.items?.updateAll((item) => this.getItemUpdateData(item) || {});

    log("...finished migrating game items");
  }

  static async migratePacks() {
    log("migrating unlocked packs");

    for (const pack of game.packs.filter((x) => x.documentName === "Item" && !x.locked)) {
      await pack.updateAll((item) => this.getItemUpdateData(item) || {});
    }

    for (const pack of game.packs.filter((x) => x.documentName === "Actor" && !x.locked)) {
      const actors = await pack.getDocuments();
      for (const actor of actors) {
        await this.migrateActor(actor);
      }
    }

    log("...finished migrating unlocked packs");
  }

  static async migrateWorldActors() {
    log("migrating world actors");

    for (const actor of game.actors) {
      await this.migrateActor(actor);
    }

    log("...finished migrating world actors");
  }

  static async migrateSyntheticActors() {
    log("migrating synthetic actors");

    const synthetics = [...game.scenes].flatMap((s) =>
      [...s.tokens].filter((t) => !t.isLinked && t.actor?.items?.size)
    );
    for (const synthetic of synthetics) {
      if (synthetic.actor) {
        await this.migrateActor(synthetic.actor);
      }
    }

    log("...finished migrating synthetic actors");
  }

  static async migrateChatMessages() {
    log("migrating chat messages");

    for (const message of game.messages) {
      await this.migrateChatMessage(message);
    }

    log("...finished migrating chat messages");
  }

  static async migrateWorld() {
    await this.preMigration();
    await this.migrateWorldItems();
    await this.migratePacks();
    await this.migrateWorldActors();
    await this.migrateSyntheticActors();
    await this.migrateChatMessages();
    await this.postMigration();
  }
}
