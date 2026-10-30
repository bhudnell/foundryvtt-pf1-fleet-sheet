import { FleetSheet } from "./applications/actors/fleetSheet.mjs";
import * as Config from "./config/_module.mjs";
import * as PF1FS from "./config/config.mjs";
import { FleetModel } from "./dataModels/actors/fleetModel.mjs";
import { FleetActor } from "./documents/actors/fleetActor.mjs";
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

  // module actors
  if ([PF1FS.fleetId, PF1FS.squadronId].includes(item.actor.type)) {
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
});

Hooks.on("pf1GetChangeFlat", getChangeFlat);

Hooks.on("renderChatMessage", (message, jq) => {
  if (message.flags?.[PF1FS.moduleId]?.attackCard) {
    const card = jq.find(".pf1fs.attack-card")[0];
    const actorId = card.dataset.actorId;
    const actor = fromUuidSync(`Actor.${actorId}`);
    const squadId = card.dataset.squadId;
    jq.find("button.roll-hit").on("click", (e) => {
      e.preventDefault();
      actor.rollDamage(true, squadId);
    });
    jq.find("button.roll-miss").on("click", (e) => {
      e.preventDefault();
      actor.rollDamage(false, squadId);
    });
  }
});

Hooks.once("init", () => {
  CONFIG.Actor.documentClasses[PF1FS.fleetId] = FleetActor;

  pf1.documents.actor.FleetActor = FleetActor;

  CONFIG.Actor.dataModels[PF1FS.fleetId] = FleetModel;

  pf1.applications.actor.FleetSheet = FleetSheet;

  Actors.registerSheet(PF1FS.moduleId, FleetSheet, {
    label: game.i18n.localize("PF1FS.Sheet.Fleet"),
    types: [PF1FS.fleetId],
    makeDefault: true,
  });

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
    "fleet-sheet-squadrons": `modules/${PF1FS.moduleId}/templates/actors/fleet/parts/squadrons.hbs`,
    "fleet-sheet-settings": `modules/${PF1FS.moduleId}/templates/actors/fleet/parts/settings.hbs`,
  });
});

Hooks.once("i18nInit", () => {
  const toLocalize = ["combatAttributes", "shipTypes", "settings"];

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

  doLocalizeKeys(pf1fs.config.boons, ["label"]);
  doLocalizeKeys(pf1fs.config.fleetConditions, ["name"]);
});
