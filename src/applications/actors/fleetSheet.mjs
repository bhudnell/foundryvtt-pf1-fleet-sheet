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
    data.squadronOptions = { "": "" };
    actorData.squadronProxies.forEach((squadron) => (data.squadronOptions[squadron.actor.id] = squadron.actor.name));

    data.actorOptions = { "": "" };
    game.actors
      .filter((actor) => actor.permission > 0 && (actor.type === "character" || actor.type === "npc"))
      .forEach((actor) => (data.actorOptions[actor.id] = actor.name));

    // summary
    data.showInfamy = actorData.settings.useInfamy;

    // conditions
    data.conditions = pf1.registry.conditions
      .values()
      .filter((c) => c.id.startsWith(pf1fs.config.changePrefix))
      .map((cond) => ({
        id: cond.id,
        img: cond.texture,
        active: actorData.conditions[cond.id] ?? false,
        label: cond.name,
        compendium: cond.journal,
      }));

    // significant characters
    data.sigChars = actorData.significantCharacters.map((character) => {
      const boon = pf1fs.config.boons[character.boon.key];

      // TODO maybe this is only on when "strict mode" or something is checked
      const existingBoons = actorData.significantCharacters.map((char) => char.boon.key);
      const boonOptions = { "": "" };
      Object.entries(pf1fs.config.boons).forEach(([key, value]) => {
        if (!existingBoons.includes(key) || pf1fs.config.boons[key].takeMultiple || key === character.boon.key) {
          boonOptions[key] = value.label;
        }
      });

      return {
        ...character,
        id: character.id,
        actorId: character.actorId,
        boonOptions,
        showSquadron: boon?.selectSquad ?? false,
      };
    });

    // squadrons
    data.canAddSquadron = actorData.squadronProxies.length < actorData.maxSquadrons.total;
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

    html.find(".sig-char-create").on("click", (e) => this._onSigCharCreate(e));
    html.find(".sig-char-delete").on("click", (e) => this._onSigCharDelete(e));

    html.find(".squadron-create").on("click", (e) => this._onSquadronCreate(e));
    html.find(".squadron-edit").on("click", (e) => this._onSquadronEdit(e));
    html.find(".squadron-delete").on("click", (e) => this._onSquadronDelete(e));
  }

  _prepareSquadrons() {
    return this.actor.system.squadronProxies.map(({ id, actor }) => ({
      id,
      img: actor.img,
      name: actor.name,
      system: {
        ...actor.system,
      },
    }));
  }

  async _onSigCharCreate(event) {
    event.preventDefault();

    const sigChars = foundry.utils.duplicate(this.actor.system.significantCharacters ?? []);
    sigChars.push({});

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

    const newSquadron = await Actor.create({
      name: game.i18n.localize("PF1FS.NewSquadron"),
      type: pf1fs.config.squadronId,
      "prototypeToken.actorLink": true,
    });

    return this._createSquadron(newSquadron._id);
  }

  async _createSquadron(actorId) {
    const squadrons = foundry.utils.duplicate(this.actor.system.squadronProxies ?? []);
    squadrons.push({
      id: foundry.utils.randomID(),
      actor: actorId,
    });

    // add the fleet link to the squadron
    const squadron = await fromUuid(`Actor.${actorId}`);
    await squadron.update({
      "system.fleet": {
        id: foundry.utils.randomID(),
        actor: this.actor._id,
      },
      "system.moraleScore": this.actor.system.settings.useInfamy ? Math.floor(this.actor.system.infamy / 10) : 3,
    });

    await this._onSubmit(event, {
      updateData: { "system.squadronProxies": squadrons },
    });
  }

  async _onSquadronEdit(event) {
    event.preventDefault();
    const squadronId = event.currentTarget.closest(".item").dataset.id;
    const squadron = this.actor.system.squadronProxies.find((squadron) => squadron.id === squadronId);

    squadron.actor.sheet.render(true, { focus: true });
  }

  async _onSquadronDelete(event) {
    event.preventDefault();

    const squadronId = event.currentTarget.closest(".item").dataset.id;
    const squadrons = foundry.utils.duplicate(this.actor.system.squadronProxies ?? []);
    const deletedSquadron = squadrons.findSplice((squadron) => squadron.id === squadronId);
    const deletedSquadronActor = this.actor.system.squadronProxies.find(
      (squadron) => squadron.id === deletedSquadron.id
    ).actor;

    await this._onDelete({
      button: event.currentTarget,
      title: game.i18n.format("PF1KS.DeleteSquadronTitle", { name: deletedSquadronActor?.name }),
      content: `<p>${game.i18n.localize("PF1KS.DeleteSquadronConfirmation")}</p>`,
      onDelete: async () => {
        await this._onSubmit(event, {
          updateData: { "system.squadronProxies": squadrons },
        });

        await deletedSquadronActor.update({
          "system.-=fleet": null,
        });
      },
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
      const keepPaths = ["system.significantCharacters"];

      const itemData = this.actor.toObject();
      for (const path of keepPaths) {
        keepUpdateArray(itemData, changed, path);
      }
    }

    return super._updateObject(event, changed);
  }

  // allows dropping squadrons onto fleets
  async _onDropActor(event, data) {
    event.preventDefault();

    const actorData = await Actor.fromDropData(data);

    if (actorData.type !== pf1fs.config.squadronId) {
      return false;
    }

    // squadron is already linked
    if (actorData.system.fleet) {
      ui.notifications.warn("PF1KS.SquadronAlreadyLinked", { localize: true });
      return false;
    }

    const source = actorData._stats.compendiumSource.split(".")[0];

    let squadron;
    if (source === "Actor") {
      squadron = await fromUuid(data.uuid);
    } else {
      squadron = await Actor.create(actorData.toObject());
    }

    const created = await this._createSquadron(squadron._id);
    this.activateTab("squadrons", { group: "primary" });
    return created;
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
      case "xp":
        paths.push({
          path: "@xp",
          value: actorData.xp,
        });
        break;
      case "infamy":
        paths.push({
          path: "@infamy",
          value: actorData.infamy,
        });
        break;
      case "chaMod":
        paths.push({
          path: "@admiral.chaMod",
          value: actorData.admiral.chaMod,
        });
        break;
      case "profSailor":
        paths.push({
          path: "@admiral.profSailor",
          value: actorData.admiral.profSailor,
        });
        break;
      case "init":
        paths.push({
          path: "@attributes.init.total",
          value: actorData.attributes.init.total,
        });
        sources.push({
          sources: actor.getSourceDetails("system.attributes.init.total"),
          untyped: true,
        });
        notes = await getNotes([`${pf1fs.config.changePrefix}.initiative`]);
        break;
      case "maxSquadrons":
        paths.push({
          path: "@maxSquadrons.total",
          value: actorData.maxSquadrons.total,
        });
        sources.push({
          sources: actor.getSourceDetails("system.maxSquadrons.total"),
          untyped: true,
        });
        notes = await getNotes([`${pf1fs.config.changePrefix}.max_squadrons`]);
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
