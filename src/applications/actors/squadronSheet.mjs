import { keepUpdateArray } from "../../util/utils.mjs";

export class SquadronSheet extends pf1.applications.actor.ActorSheetPF {
  static get defaultOptions() {
    const options = super.defaultOptions;
    return {
      ...options,
      classes: [...options.classes, "fleet"],
      tabs: [
        {
          navSelector: "nav.tabs[data-group='primary']",
          contentSelector: "section.primary-body",
          initial: "summary",
          group: "primary",
        },
      ],
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

    return data;
  }

  activateListeners(html) {
    super.activateListeners(html);

    html.find(".attribute .rollable").on("click", (e) => this._onRollAttribute(e));

    html.find(".ship-create").on("click", (e) => this._onShipCreate(e));
    html.find(".ship-delete").on("click", (e) => this._onShipDelete(e));
  }

  _prepareSquadrons() {
    return this.actor.system.squadrons.map((squadron) => ({
      ...squadron,
      totalHits: squadron.totalHits,
      editShipHits: !Object.keys(pf1fs.config.shipTypes).includes(squadron.config.shipType),
      canAddShip: squadron.ships.length < squadron.config.maxShips,
    }));
  }

  async _onRollAttribute(event) {
    event.preventDefault();
    const attribute = event.currentTarget.closest(".attribute").dataset.attribute;
    const squadId = event.currentTarget.closest(".squadron").dataset.id;
    this.actor.rollAttribute(attribute, squadId, { actor: this.actor });
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

    await this._onSubmit(event, {
      updateData: { "system.ships": ships },
    });
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
      onDelete: () =>
        this._onSubmit(event, {
          updateData: { "system.ships": ships },
        }),
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

  // todo needed?
  _focusTabByItem(item) {
    let tabId;
    switch (item.type) {
      default:
        tabId = "summary";
    }

    if (tabId) {
      this.activateTab(tabId, "primary");
    }
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
      case "squad-dv":
      case "squad-av":
      case "squad-damageBonus":
      case "squad-morale":
      case "squad-chaMod":
      case "squad-profSailor":
      case "squad-moraleScore":
      case "squad-lossCount":
      case "squad-hits":
      case "squad-maxShips": {
        const [, attribute] = id.split("-");
        const squad = actorData.squadrons[detail];

        // combat
        if (Object.keys(pf1fs.config.combatAttributes).includes(attribute)) {
          paths.push({
            path: `@squadrons.${detail}.combat.${attribute}.total`,
            value: squad.combat[attribute].total,
          });
          sources.push({
            sources: actor.getSourceDetails(`system.squadrons.${detail}.combat.${attribute}.total`),
            untyped: true,
          });
          notes = await getNotes([
            `${pf1fs.config.changePrefix}.${attribute}`,
            `${pf1fs.config.changePrefix}.${attribute}.${squad.id}`,
          ]);
        }
        // commodore
        else if (["chaMod", "profSailor"].includes(attribute)) {
          paths.push({
            path: `@squadrons.${detail}.commodore.${attribute}`,
            value: squad.commodore[attribute],
          });
        }
        // morale score
        else if (attribute === "moraleScore") {
          paths.push({
            path: `@squadrons.${detail}.moraleScore`,
            value: squad.moraleScore,
          });
          notes = await getNotes([
            `${pf1fs.config.changePrefix}.morale_score`,
            `${pf1fs.config.changePrefix}.morale_score.${squad.id}`,
          ]);
        }
        // loss count
        else if (attribute === "lossCount") {
          paths.push({
            path: `@squadrons.${detail}.lossCount`,
            value: squad.lossCount,
          });
        }
        // hits
        else if (attribute === "hits") {
          paths.push(
            {
              path: `@squadrons.${detail}.totalHits.current`,
              value: squad.totalHits.current,
            },
            {
              path: `@squadrons.${detail}.totalHits.max`,
              value: squad.totalHits.max,
            }
          );
          notes = await getNotes([
            `${pf1fs.config.changePrefix}.hits`,
            `${pf1fs.config.changePrefix}.hits.${squad.id}`,
          ]);
        }
        // max ships
        else if (attribute === "maxShips") {
          paths.push({
            path: `@squadrons.${detail}.config.maxShips`,
            value: squad.config.maxShips,
          });
          sources.push({
            sources: actor.getSourceDetails(`system.squadrons.${detail}.config.maxShips`),
            untyped: true,
          });
        }
        break;
      }

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
