import { log, registerSetting } from "../util/utils.mjs";

import { MigrateV1 as v1 } from "./migrateV1.mjs";

class Settings {
  static get #migrationVersionKey() {
    return "migration-version";
  }

  static get worldMigrationVersion() {
    return game.settings.get(pf1fs.config.moduleId, this.#migrationVersionKey);
  }

  static set worldMigrationVersion(version) {
    game.settings.set(pf1fs.config.moduleId, this.#migrationVersionKey, version);
  }

  static {
    registerSetting({
      config: false,
      defaultValue: 0,
      key: this.#migrationVersionKey,
      scope: "world",
      settingType: Number,
    });
  }
}

const migrations = [
  { label: "squadron actor breakout", migrate: () => v1.migrateWorld() }, // v2.0
];

async function migrateWorld() {
  const currentMigrationVersion = migrations.length + 1; // should always be one more than the current number of migrations
  const worldMigrationVersion = Settings.worldMigrationVersion || 0;

  if (worldMigrationVersion !== currentMigrationVersion) {
    log("Starting world migration");

    for (let i = 1; i <= migrations.length; i++) {
      if (worldMigrationVersion <= i) {
        const { label, migrate } = migrations[i - 1];
        log(`Migrating ${label}`);
        // we want the migrations to run sequentially so this is correct
        // eslint-disable-next-line no-await-in-loop
        await migrate();
        Settings.worldMigrationVersion = i + 1;
      }
    }

    log("Finalized world migration");
  }

  Settings.worldMigrationVersion = currentMigrationVersion;
}

export async function migrate() {
  if (game.users.activeGM === game.user) {
    await migrateWorld();
  }
}
