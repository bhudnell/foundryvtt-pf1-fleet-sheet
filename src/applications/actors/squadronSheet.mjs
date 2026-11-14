import { keepUpdateArray } from "../../util/utils.mjs";

export class SquadronSheet extends pf1.applications.actor.ActorSheetPF {
  static get defaultOptions() {
    const options = super.defaultOptions;
    return {
      ...options,
      classes: [...options.classes, "pf1fs", "squadron"],
      tabs: [
        {
          navSelector: "nav.tabs[data-group='primary']",
          contentSelector: "section.primary-body",
          initial: "summary",
          group: "primary",
        },
      ],
      height: 730,
      width: 670,
    };
  }

  get template() {
    return `modules/${pf1fs.config.moduleId}/templates/actors/squadron/${this.isEditable ? "edit" : "view"}.hbs`;
  }

  async getData() {
    const actor = this.actor;
    const actorData = actor.system;
    const isOwner = actor.isOwner;

    const data = {
      ...this.actor,
      owner: isOwner,
      enrichedNotes: await TextEditor.enrichHTML(actorData.notes.value ?? "", {
        rolldata: actor.getRollData(),
        async: true,
        secrets: this.object.isOwner,
        relativeTo: this.actor,
      }),
      editable: this.isEditable,
      cssClass: isOwner ? "editable" : "locked",
    };

    // selectors
    data.shipTypeOptions = foundry.utils.duplicate(pf1fs.config.shipTypes);
    data.shipTypeOptions.custom = game.i18n.localize("PF1.Custom");

    data.actorOptions = { "": "" };
    game.actors
      .filter((actor) => actor.permission > 0 && (actor.type === "character" || actor.type === "npc"))
      .forEach((actor) => (data.actorOptions[actor.id] = actor.name));

    // commodore
    if (actorData.commodore.actor) {
      data.commodore = {
        ...actorData.commodore.actor,
        chaMod: actorData.commodore.chaMod,
        profSailor: actorData.commodore.profSailor,
        isSignificant: actorData.commodore.isSignificant,
      };
    }

    // ships
    data.shipCount = this.actor.getShipCount();

    return data;
  }

  activateListeners(html) {
    super.activateListeners(html);

    html.find(".attribute .rollable").on("click", (e) => this._onRollAttribute(e));

    html.find(".commodore-select").on("click", (e) => this._onCommodoreSelect(e));
    html.find(".commodore-edit").on("click", (e) => this._onCommodoreEdit(e));
    html.find(".commodore-delete").on("click", (e) => this._onCommodoreDelete(e));

    html.find(".ship-create").on("click", (e) => this._onShipCreate(e));
    html.find(".ship-delete").on("click", (e) => this._onShipDelete(e));
  }

  async _onRollAttribute(event) {
    event.preventDefault();
    const attribute = event.currentTarget.closest(".attribute").dataset.attribute;
    this.actor.rollAttribute(attribute, { actor: this.actor });
  }

  async _onCommodoreSelect(event) {
    const targetActorId = await pf1.utils.dialog.getActor({
      actors: game.actors.filter(
        (a) =>
          pf1fs.config.validOfficerActorTypes.includes(a.type) &&
          a.testUserPermission(game.user, CONST.DOCUMENT_OWNERSHIP_LEVELS.LIMITED)
      ),
    });

    const targetActor = game.actors.get(targetActorId);
    if (!targetActor) {
      return;
    }

    this.actor.update({ "system.commodore.actor": targetActor._id });
  }

  async _onCommodoreEdit(event) {
    event.preventDefault();

    this.actor.system.commodore.actor.sheet.render(true, { focus: true });
  }

  async _onCommodoreDelete(event) {
    event.preventDefault();

    this.actor.update({ "system.commodore.actor": null });
  }

  async _onShipCreate(event) {
    event.preventDefault();

    const maxHits = this.actor.system.config.maxShipHits;

    const ships = foundry.utils.duplicate(this.actor.system.ships ?? []);
    const newIdx = ships.length;

    ships.push({
      name: game.i18n.format("PF1FS.NewShipLabel", { number: newIdx + 1 }),
      id: foundry.utils.randomID(),
      currentHits: maxHits,
    });

    this.actor.update({ "system.ships": ships });
  }

  async _onShipDelete(event) {
    event.preventDefault();

    const shipId = event.currentTarget.closest(".ship").dataset.id;
    const ships = foundry.utils.duplicate(this.actor.system.ships ?? []);

    const deletedShip = ships.findSplice((ship) => ship.id === shipId);

    await this._onDelete({
      button: event.currentTarget,
      title: game.i18n.format("PF1FS.DeleteShipTitle", { name: deletedShip.name }),
      content: `<p>${game.i18n.localize("PF1FS.DeleteShipConfirmation")}</p>`,
      onDelete: () => this.actor.update({ "system.ships": ships }),
    });
  }

  async _onDelete({ button, title, content, onDelete }) {
    if (button.disabled) {
      return;
    }
    button.disabled = true;

    const confirm = await foundry.applications.api.DialogV2.confirm({
      window: { title, icon: "fa-solid fa-trash" },
      classes: ["pf1-v2", "delete-item", "pf1fs"],
      content,
      rejectClose: false,
      modal: true, // Require dialog to be resolved
    });

    if (confirm) {
      onDelete();
    }

    button.disabled = false;
  }

  // overrides
  async _updateObject(event, formData) {
    const changed = foundry.utils.expandObject(formData);

    if (changed.system) {
      const keepPaths = ["system.ships"];

      const itemData = this.actor.toObject();
      for (const path of keepPaths) {
        keepUpdateArray(itemData, changed, path);
      }
    }

    return super._updateObject(event, changed);
  }

  async _getTooltipContext(fullId, context) {
    const actor = this.actor;
    const actorData = actor.system;

    // Lazy roll data
    const lazy = {
      get rollData() {
        this._cache ??= actor.getRollData();
        return this._cache;
      },
    };

    const getNotes = async (context) =>
      (await actor.getContextNotesParsed(context, undefined, { rollData: lazy.rollData, roll: false })).map(
        (n) => n.text
      );

    let header, subHeader;
    const details = [];
    const paths = [];
    const sources = [];
    let notes;

    const re = /^(?<id>[\w-]+)(?:\.(?<detail>.*))?$/.exec(fullId);
    const { id, detail } = re?.groups ?? {};

    switch (id) {
      case "dv":
      case "av":
      case "damageBonus":
      case "morale":
        paths.push({
          path: `@combat.${id}.total`,
          value: actorData.combat[id].total,
        });
        sources.push({
          sources: actor.getSourceDetails(`system.combat.${id}.total`),
          untyped: true,
        });
        notes = await getNotes(`${pf1fs.config.changePrefix}.${id}`);
        break;
      case "chaMod":
      case "profSailor":
        paths.push({
          path: `@commodore.${id}`,
          value: actorData.commodore[id],
        });
        break;
      case "moraleScore":
        paths.push({
          path: "@moraleScore",
          value: actorData.moraleScore,
        });
        notes = await getNotes(`${pf1fs.config.changePrefix}.morale_score`);
        break;
      case "lossCount":
        paths.push({
          path: "@lossCount",
          value: actorData.lossCount,
        });
        break;
      case "hits":
        paths.push(
          {
            path: "@totalHits.current",
            value: actorData.totalHits.current,
          },
          {
            path: "@totalHits.max",
            value: actorData.totalHits.max,
          }
        );
        notes = await getNotes(`${pf1fs.config.changePrefix}.hits`);
        break;
      case "ships":
        paths.push(
          {
            path: "@config.currentShips",
            value: actorData.config.currentShips,
          },
          {
            path: "@config.maxShips",
            value: actorData.config.maxShips,
          }
        );
        sources.push({
          sources: actor.getSourceDetails("system.config.maxShips"),
          untyped: true,
        });
        break;

      default:
        throw new Error(`Invalid extended tooltip identifier "${fullId}"`);
    }

    context.header = header;
    context.subHeader = subHeader;
    context.details = details;
    context.paths = paths;
    context.sources = sources;
    context.notes = notes ?? [];
  }
}
