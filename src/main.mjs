import { FleetSheet } from "./applications/actors/fleetSheet.mjs";
import { SquadronSheet } from "./applications/actors/squadronSheet.mjs";
import * as Config from "./config/_module.mjs";
import * as PF1FS from "./config/config.mjs";
import { FleetModel } from "./dataModels/actors/fleetModel.mjs";
import { SquadronModel } from "./dataModels/actors/squadronModel.mjs";
import { FleetActor } from "./documents/actors/fleetActor.mjs";
import { SquadronActor } from "./documents/actors/squadronActor.mjs";
import { getChangeFlat } from "./hooks/getChangeFlat.mjs";
import { migrate as moduleDataMigration } from "./migrations/index.mjs";
import { moduleToObject } from "./util/utils.mjs";

export { PF1FS as config };
globalThis.pf1fs = moduleToObject({
  config: PF1FS,
});

// keeps module items/actors separate from non-module items/actors
Hooks.on("preCreateItem", (item, data, context, user) => {
  if (!item.actor) {
    return;
  }

  // module actors
  if ([PF1FS.fleetId, PF1FS.squadronId].includes(item.actor.type)) {
    ui.notifications.error("PF1FS.OnlyModuleItemsOnActor", { localize: true });
    return false;
  }
});

// register libwrapper stuff
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

      if (this.object.actor.type === PF1FS.squadronId) {
        return {};
      }
      if (this.object.actor.type === PF1FS.fleetId) {
        return fleet;
      }
      return core;
    },
    libWrapper.MIXED
  );
});

// assign change targets to data paths to update
Hooks.on("pf1GetChangeFlat", getChangeFlat);

// TODO need to migrate chat messages to move squad id to actor id and delete old actor id
// TODO also make sure this cant be simplified
// roll squadron damage from chat card
Hooks.on("renderChatMessageHTML", (message, html) => {
  if (message.getFlag(PF1FS.moduleId, "attackCard")) {
    const card = html.querySelector(".pf1fs.attack-card");
    const actorId = card.dataset.actorId;
    const actor = fromUuidSync(`Actor.${actorId}`);

    html.querySelector("button.roll-hit").addEventListener("click", (e) => {
      e.preventDefault();
      actor.rollDamage(true);
    });

    html.querySelector("button.roll-miss").addEventListener("click", (e) => {
      e.preventDefault();
      actor.rollDamage(false);
    });
  }
});

// module actor registration
Hooks.once("pf1PostInit", () => {
  CONFIG.Actor.documentClasses[PF1FS.fleetId] = FleetActor;
  CONFIG.Actor.documentClasses[PF1FS.squadronId] = SquadronActor;

  pf1.documents.actor.FleetActor = FleetActor;
  pf1.documents.actor.SquadronActor = SquadronActor;

  CONFIG.Actor.dataModels[PF1FS.fleetId] = FleetModel;
  CONFIG.Actor.dataModels[PF1FS.squadronId] = SquadronModel;

  pf1.applications.actor.FleetSheet = FleetSheet;
  pf1.applications.actor.SquadronSheet = SquadronSheet;

  Actors.registerSheet(PF1FS.moduleId, FleetSheet, {
    label: game.i18n.localize("PF1FS.Sheet.Fleet"),
    types: [PF1FS.fleetId],
    makeDefault: true,
  });
  Actors.registerSheet(PF1FS.moduleId, SquadronSheet, {
    label: game.i18n.localize("PF1FS.Sheet.Squadron"),
    types: [PF1FS.squadronId],
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

  loadTemplates({
    "fleet-sheet-summary": `modules/${PF1FS.moduleId}/templates/actors/fleet/parts/summary.hbs`,
    "fleet-sheet-squadrons": `modules/${PF1FS.moduleId}/templates/actors/fleet/parts/squadrons.hbs`,
    "fleet-sheet-settings": `modules/${PF1FS.moduleId}/templates/actors/fleet/parts/settings.hbs`,

    "squadron-sheet-summary": `modules/${PF1FS.moduleId}/templates/actors/squadron/parts/summary.hbs`,
  });
});

// module migrations
Hooks.once("pf1PostReady", () => {
  moduleDataMigration();

  if (!game.modules.get("lib-wrapper")?.active && game.user.isGM) {
    ui.notifications.error("PF1FS.LibWrapperError");
  }
});

// localize config strings
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

// cleaning up links on fleet/squadron deletion
Hooks.on("deleteActor", async (actor, options, userId) => {
  if (userId !== game.users.activeGM?.id) {
    return;
  }

  // if deleting a squadron, delete the linked fleet's proxy if it exists
  if (actor.type === pf1fs.config.squadronId && actor.system.fleet) {
    const fleetActor = game.actors.get(actor.system.fleet.actor.id);
    const proxyPath = "squadronProxies";

    const squadrons = foundry.utils.duplicate(fleetActor.system.squadronProxies ?? []);
    squadrons.findSplice((squadron) => squadron.actor === actor.id);

    await fleetActor.update({ "system.squadronProxies": squadrons });
  }

  // if deleting a fleet, unset the fleet fields in all linked squadrons
  if (actor.type === pf1fs.config.fleetId && actor.system.squadronProxies.length) {
    const updates = actor.system.squadronProxies.map((squadron) => ({
      _id: squadron.actor._id,
      "system.-=fleet": null,
    }));

    const updated = await Actor.implementation.updateDocuments(updates);
  }
});

// remove squadron links on duplicated fleets
Hooks.on("preCreateActor", async (actor, data, options, userId) => {
  // only for cloning
  if (!actor._stats.duplicateSource) {
    return;
  }

  // if fleet, clear squadron proxies and warn that it happened
  if (actor.type === PF1FS.fleetId) {
    if (actor.system.squadronProxies.length) {
      actor.updateSource({ "system.squadronProxies": [] });
      ui.notifications.warn("PF1FS.ClearedSquadronLinks", { localize: true });
    }
  }
});

// ask to also link duplicated squadron to fleet
Hooks.on("createActor", async (actor, options, userId) => {
  // only for cloning
  if (!actor._stats.duplicateSource) {
    return;
  }

  // if squadron, add proxy to fleet
  if (actor.type !== PF1FS.squadronId) {
    return;
  }

  const linkedFleet = await fromUuid(actor.system.fleet?.actor.uuid);
  if (!linkedFleet) {
    return;
  }

  const confirm = await foundry.applications.api.DialogV2.confirm({
    window: { title: "PF1FS.MaintainFleetLink", icon: "fa-solid fa-link" },
    classes: ["pf1-v2", "pf1fs"],
    content: `<p>${game.i18n.localize("PF1FS.MaintainFleetLinkConfirmation")}</p>`,
    rejectClose: false,
    modal: true, // Require dialog to be resolved
  });

  if (confirm) {
    const proxies = foundry.utils.duplicate(linkedFleet.system.squadronProxies ?? []);
    proxies.push({
      id: foundry.utils.randomID(),
      actor: actor.id,
    });

    await linkedFleet.update({ "system.squadronProxies": proxies });
  } else {
    await actor.update({ "system.-=fleet": null });
  }
});
