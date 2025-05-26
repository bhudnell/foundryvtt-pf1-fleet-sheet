import { keepUpdateArray } from "../../util/utils.mjs";

export class FleetSheet extends pf1.applications.actor.ActorSheetPF {
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
        {
          navSelector: "nav.tabs[data-group='squadrons']",
          contentSelector: "section.squadrons-body",
          initial: "0",
          group: "squadrons",
        },
      ],
    };
  }

  get template() {
    return `modules/${pf1fs.config.moduleId}/templates/actors/fleet/${this.isEditable ? "edit" : "view"}.hbs`;
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
    data.boonOptions = { "": "" };
    Object.entries(pf1fs.config.boons).forEach(([key, value]) => (data.boonOptions[key] = value.label));

    data.squadronOptions = { "": "" };
    actorData.squadrons.forEach((squadron) => (data.squadronOptions[squadron.id] = squadron.name));

    data.shipTypeOptions = foundry.utils.duplicate(pf1fs.config.shipTypes);
    data.shipTypeOptions.custom = game.i18n.localize("PF1.Custom");

    data.actorOptions = { "": "" };
    game.actors
      .filter((actor) => actor.permission > 0 && (actor.type === "character" || actor.type === "npc"))
      .forEach((actor) => (data.actorOptions[actor.id] = actor.name));

    // summary
    data.showInfamy = actorData.settings.useInfamy;

    // conditions
    data.conditions = Object.values(pf1fs.config.fleetConditions).map((cond) => ({
      id: cond.id,
      img: cond.texture,
      active: actorData.conditions[cond.id] ?? false,
      label: cond.name,
      compendium: cond.journal,
    }));

    // significant characters
    data.sigChars = actorData.significantCharacters.map((character) => {
      const boon = pf1fs.config.boons[character.boon.key];

      return {
        id: character.id,
        actorId: character.actorId,
        location: character.location,
        boonKey: character.boon.key,
        showSquadron: boon?.selectSquad ?? false,
        squadronId: character.boon.squadronId,
      };
    });

    // squadrons
    data.canAddSquadron = actorData.squadrons.length < actorData.maxSquadrons.total;
    data.squadrons = this._prepareSquadrons();

    // settings
    data.settings = Object.entries(this.actor.system.settings)
      .filter(([_, value]) => typeof value === "boolean")
      .map(([key, value]) => ({
        name: key,
        value,
        label: pf1fs.config.settings[key],
      }));

    return data;
  }

  activateListeners(html) {
    super.activateListeners(html);

    html.find(".item-toggle-data").on("click", (e) => this._itemToggleData(e));

    html.find(".attribute .rollable").on("click", (e) => this._onRollAttribute(e));

    html.find(".sig-char-create").on("click", (e) => this._onSigCharCreate(e));
    html.find(".sig-char-delete").on("click", (e) => this._onSigCharDelete(e));

    html.find(".squadron-create").on("click", (e) => this._onSquadronCreate(e));
    html.find(".squadron-delete").on("click", (e) => this._onSquadronDelete(e));

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
    this.actor.rollAttribute(attribute, { actor: this.actor });
  }

  async _onSigCharCreate(event) {
    event.preventDefault();

    const sigChars = foundry.utils.duplicate(this.actor.system.significantCharacters ?? []);
    sigChars.push({
      isSignificant: true,
    });

    await this._onSubmit(event, {
      updateData: { "system.significantCharacters": sigChars },
    });
  }

  async _onSigCharDelete(event) {
    event.preventDefault();

    const sigCharId = event.currentTarget.closest(".item").dataset.itemId;
    const sigChars = foundry.utils.duplicate(this.actor.system.significantCharacters ?? []);
    sigChars.findSplice((sigChar) => sigChar.id === sigCharId);

    await this._onDelete({
      button: event.currentTarget,
      title: game.i18n.localize("PF1FS.DeleteSigChar"),
      content: `<p>${game.i18n.localize("PF1FS.DeleteSigCharConfirmation")}</p>`,
      onDelete: () =>
        this._onSubmit(event, {
          updateData: { "system.significantCharacters": sigChars },
        }),
    });
  }

  async _onSquadronCreate(event) {
    event.preventDefault();

    const newIdx = this.actor.system.squadrons.length;
    const squadrons = foundry.utils.duplicate(this.actor.system.squadrons ?? []);
    squadrons.push({
      name: game.i18n.format("PF1FS.NewSquadronLabel", { number: newIdx + 1 }),
      id: foundry.utils.randomID(),
      moraleScore: this.actor.system.settings.useInfamy
        ? Math.clamp(Math.floor(this.actor.system.infamy / 10), 1, 10)
        : 3,
    });

    await this._onSubmit(event, {
      updateData: { "system.squadrons": squadrons },
    });

    this.activateTab(`${newIdx}`, { group: "squadrons" });
  }

  async _onSquadronDelete(event) {
    event.preventDefault();

    const squadronId = event.currentTarget.closest(".squadron").dataset.id;
    const squadrons = foundry.utils.duplicate(this.actor.system.squadrons ?? []);
    const deletedSquadron = squadrons.findSplice((squadron) => squadron.id === squadronId);

    await this._onDelete({
      button: event.currentTarget,
      title: game.i18n.format("PF1FS.DeleteSquadronTitle", { name: deletedSquadron.name }),
      content: `<p>${game.i18n.localize("PF1FS.DeleteSquadronConfirmation")}</p>`,
      onDelete: () =>
        this._onSubmit(event, {
          updateData: { "system.squadrons": squadrons },
        }),
    });
  }

  async _onShipCreate(event) {
    event.preventDefault();

    const squadronId = event.currentTarget.closest(".squadron").dataset.id;
    const squadrons = foundry.utils.duplicate(this.actor.system.squadrons ?? []);
    const squadron = squadrons.find((squadron) => squadron.id === squadronId);

    const maxHits = (this.actor.system.squadrons ?? []).find((squadron) => squadron.id === squadronId).config
      .maxShipHits;

    const newIdx = squadron.ships.length;
    squadron.ships.push({
      name: game.i18n.format("PF1FS.NewShipLabel", { number: newIdx + 1 }),
      id: foundry.utils.randomID(),
      currentHits: maxHits,
    });

    await this._onSubmit(event, {
      updateData: { "system.squadrons": squadrons },
    });
  }

  async _onShipDelete(event) {
    event.preventDefault();

    const { squadronId, id: shipId } = event.currentTarget.closest(".ship").dataset;
    const squadrons = foundry.utils.duplicate(this.actor.system.squadrons ?? []);
    const squadron = squadrons.find((squadron) => squadron.id === squadronId);

    const deletedShip = squadron.ships.findSplice((ship) => ship.id === shipId);

    await this._onDelete({
      button: event.currentTarget,
      title: game.i18n.format("PF1FS.DeleteShipTitle", { name: deletedShip.name }),
      content: `<p>${game.i18n.localize("PF1FS.DeleteShipConfirmation")}</p>`,
      onDelete: () =>
        this._onSubmit(event, {
          updateData: { "system.squadrons": squadrons },
        }),
    });
  }

  async _onDelete({ button, title, content, onDelete }) {
    if (button.disabled) {
      return;
    }
    button.disabled = true;

    try {
      await Dialog.confirm({
        title,
        content,
        yes: () => {
          onDelete();
          button.disabled = false;
        },
        no: () => (button.disabled = false),
        rejectClose: true,
      });
    } catch (e) {
      button.disabled = false;
    }
  }

  // overrides
  async _updateObject(event, formData) {
    const changed = foundry.utils.expandObject(formData);

    if (changed.system) {
      const keepPaths = ["system.squadrons"];

      const itemData = this.actor.toObject();
      for (const path of keepPaths) {
        keepUpdateArray(itemData, changed, path);
      }
    }

    return super._updateObject(event, changed);
  }

  _focusTabByItem(item) {
    let tabId;
    switch (item.type) {
      case pf1fs.config.boonId:
        tabId = "commander";
        break;
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
    const { id } = re?.groups ?? {};

    switch (id) {
      case "damageBonus":
        paths.push({
          path: "@damageBonus.total",
          value: actorData.damageBonus.total,
        });
        sources.push({
          sources: actor.getSourceDetails("system.damageBonus.total"),
          untyped: true,
        });
        notes = await getNotes(`${pf1fs.config.changePrefix}_damage`);
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
