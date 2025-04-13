import { FleetSheet } from "./applications/actors/fleetSheet.mjs";
import { BoonSheet } from "./applications/items/boonSheet.mjs";
import * as Config from "./config/_module.mjs";
import { BoonBrowser } from "./config/compendiumBrowser/boonBrowser.mjs";
import * as PF1FS from "./config/config.mjs";
import { FleetModel } from "./dataModels/actors/fleetModel.mjs";
import { BoonModel } from "./dataModels/items/boonModel.mjs";
import { FleetActor } from "./documents/actors/fleetActor.mjs";
import { BaseItem } from "./documents/items/baseItem.mjs";
import { getChangeFlat } from "./hooks/getChangeFlat.mjs";
import { moduleToObject } from "./util/utils.mjs";

export { PF1FS as config };
globalThis.pf1fs = moduleToObject({
  config: PF1FS,
});

Hooks.on("preCreateItem", (item, data, context, user) => {
  if (!item.actor) {
    return;
  }

  // non module actors
  if (item.actor.type !== PF1FS.fleetId && item.type === PF1FS.boonId) {
    ui.notifications.error("PF1FS.NoFleetItemsOnActor", { localize: true });
    return false;
  }

  // fleet actors
  if (item.actor.type === PF1FS.fleetId && item.type !== PF1FS.boonId) {
    ui.notifications.error("PF1FS.OnlyFleetItemsOnActor", { localize: true });
    return false;
  }
});

Hooks.once("libWrapper.Ready", () => {
  console.log(`${PF1FS.moduleId} | Registering LibWrapper Hooks`);

  // changes token HUD conditions for module actors
  libWrapper.register(
    PF1FS.moduleId,
    "TokenHUD.prototype._getStatusEffectChoices",
    function (wrapper) {
      const fleet = {};
      const core = {};

      Object.entries(wrapper()).forEach(([key, value]) => {
        if (value.id.startsWith(PF1FS.changePrefix)) {
          fleet[key] = value;
        } else {
          core[key] = value;
        }
      });

      if (this.object.actor.type === PF1FS.fleetId) {
        return fleet;
      }
      return core;
    },
    libWrapper.MIXED
  );

  // adds subtypes for improvement and event item creation
  libWrapper.register(
    PF1FS.moduleId,
    "pf1.applications.item.CreateDialog.prototype.getSubtypes",
    function (wrapper, type) {
      switch (type) {
        case PF1FS.boonId:
          return null;

        default:
          return wrapper(type);
      }
    },
    libWrapper.MIXED
  );
});

Hooks.on("pf1GetChangeFlat", getChangeFlat);

Hooks.once("init", () => {
  CONFIG.Actor.documentClasses[PF1FS.fleetId] = FleetActor;
  CONFIG.Item.documentClasses[PF1FS.boonId] = BaseItem;

  pf1.documents.actor.FleetActor = FleetActor;
  pf1.documents.item.BoonItem = BaseItem;

  CONFIG.Actor.dataModels[PF1FS.fleetId] = FleetModel;
  CONFIG.Item.dataModels[PF1FS.boonId] = BoonModel;

  pf1.applications.actor.FleetSheet = FleetSheet;
  pf1.applications.item.BoonSheet = BoonSheet;

  Actors.registerSheet(PF1FS.moduleId, FleetSheet, {
    label: game.i18n.localize("PF1FS.Sheet.Fleet"),
    types: [PF1FS.fleetId],
    makeDefault: true,
  });
  Items.registerSheet(PF1FS.moduleId, BoonSheet, {
    label: game.i18n.localize("PF1FS.Sheet.Boon"),
    types: [PF1FS.boonId],
    makeDefault: true,
  });

  // remove module buff targets from non module items
  for (const prop of ["buffTargetCategories", "contextNoteCategories"]) {
    for (const categoryKey in pf1.config[prop]) {
      const category = pf1.config[prop][categoryKey];
      category.filters ??= {};
      category.filters.item ??= {};
      category.filters.item.exclude ??= [];
      category.filters.item.exclude.push(PF1FS.boonId);
      pf1.config[prop][categoryKey] = category;
    }
  }

  foundry.utils.mergeObject(pf1.config, Object.assign({}, Config));
  CONFIG.statusEffects.push(
    ...Object.values(PF1FS.fleetConditions).map((c) => ({
      id: c.id,
      name: c.name,
      icon: c.texture,
      get label() {
        return this.name;
      },
      set label(name) {
        this.name = name;
      },
    }))
  );
});

Hooks.once("setup", () => {
  // re-prepare fleets once all their dependencies are prepared
  game.actors.filter((a) => a.type === PF1FS.fleetId).forEach((a) => a.prepareData());
});

Hooks.once("ready", () => {
  if (!game.modules.get("lib-wrapper")?.active && game.user.isGM) {
    ui.notifications.error("PF1FS.LibWrapperError");
  }

  loadTemplates({
    "fleet-sheet-summary": `modules/${PF1FS.moduleId}/templates/actors/fleet/parts/summary.hbs`,
    "fleet-sheet-features": `modules/${PF1FS.moduleId}/templates/actors/fleet/parts/features.hbs`,
    "fleet-sheet-commander": `modules/${PF1FS.moduleId}/templates/actors/fleet/parts/commander.hbs`,
    "fleet-sheet-conditions": `modules/${PF1FS.moduleId}/templates/actors/fleet/parts/conditions.hbs`,

    "item-sheet-boon": `modules/${PF1FS.moduleId}/templates/items/parts/boon-details.hbs`,

    "item-sheet-changes": `modules/${PF1FS.moduleId}/templates/items/parts/changes.hbs`,
  });

  pf1.applications.compendiums.boon = new BoonBrowser();

  pf1.applications.compendiumBrowser.boon = BoonBrowser;

  game.model.Item[PF1FS.boonId] = {};
});

Hooks.once("i18nInit", () => {
  const toLocalize = [
    // "settings"
  ];

  const doLocalize = (obj, cat) => {
    // Create tuples of (key, localized object/string)
    const localized = Object.entries(obj).reduce((arr, [key, value]) => {
      if (typeof value === "string") {
        arr.push([key, game.i18n.localize(value)]);
      } else if (typeof value === "object") {
        arr.push([key, doLocalize(value, `${cat}.${key}`)]);
      }
      return arr;
    }, []);

    // Get the localized and sorted object out of tuple
    return localized.reduce((obj, [key, value]) => {
      obj[key] = value;
      return obj;
    }, {});
  };

  const doLocalizeKeys = (obj, keys = []) => {
    for (const path of Object.keys(foundry.utils.flattenObject(obj))) {
      const key = path.split(".").at(-1);
      if (keys.includes(key)) {
        const value = foundry.utils.getProperty(obj, path);
        if (value) {
          foundry.utils.setProperty(obj, path, game.i18n.localize(value));
        }
      }
    }
  };

  for (let o of toLocalize) {
    pf1fs.config[o] = doLocalize(pf1fs.config[o], o);
  }

  doLocalizeKeys(pf1fs.config.fleetConditions, ["name"]);
});
