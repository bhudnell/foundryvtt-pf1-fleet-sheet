export class BaseActor extends pf1.documents.actor.ActorBasePF {
  _configure(options = {}) {
    super._configure(options);

    /**
     * Stores all ItemChanges from carried items.
     *
     * @public
     * @type {Collection<ItemChange>}
     */
    this.changes ??= new Collection();

    /**
     * Cached roll data for this item.
     *
     * @internal
     * @type {object}
     */
    Object.defineProperties(this, {
      _rollData: {
        value: null,
        enumerable: false,
        writable: true,
      },
    });
  }

  /**
   * @internal
   * @param {SourceInfo} src - Source info
   */
  static _getSourceLabel(src) {
    return src.name;
  }

  get _skillTargets() {
    return [];
  }

  _prepareChanges() {
    const changes = [];

    this._prepareTypeChanges(changes);

    this._prepareConditionChanges(changes);

    for (const item of this.items) {
      if (item.type.startsWith(`${pf1fs.config.moduleId}.`) && item.isActive && item.hasChanges && item.changes.size) {
        changes.push(...item.changes);
      }
    }

    const c = new Collection();
    for (const change of changes) {
      // Avoid ID conflicts
      const parentId = change.parent?.id ?? "Actor";
      const uniqueId = `${parentId}-${change._id}`;
      c.set(uniqueId, change);
    }
    this.changes = c;
  }

  _prepareTypeChanges(changes) {}

  _prepareConditionChanges(changes) {}

  applyActiveEffects() {
    // Apply active effects. Required for status effects in v11 and onward, such as blind and invisible.
    super.applyActiveEffects();

    this.prepareConditions();

    this._prepareChanges();
    pf1.documents.actor.changes.applyChanges(this, { simple: true });
  }

  prepareBaseData() {
    super.prepareBaseData();

    /** @type {Record<string, SourceInfo>} */
    this.sourceInfo = {};
    this.changeFlags = {};
  }

  refreshDerivedData() {}

  prepareDerivedData() {
    super.prepareDerivedData();

    pf1.documents.actor.changes.applyChanges(this);

    this._rollData = null;
  }

  getSourceDetails(path) {
    const sources = [];

    // Add extra data
    const rollData = this.getRollData();
    const changeGrp = this.sourceInfo[path] ?? {};
    const sourceGroups = Object.values(changeGrp);

    for (const grp of sourceGroups) {
      for (const src of grp) {
        src.operator ||= "add";
        let srcValue =
          src.value != null
            ? src.value
            : pf1.dice.RollPF.safeRollSync(src.formula || "0", rollData, [path, src, this], {
                suppressError: !this.isOwner,
              }).total;
        if (src.operator === "set") {
          srcValue = game.i18n.format("PF1.SetTo", { value: srcValue });
        }

        // Add sources only if they actually add something else than zero
        if (!(src.operator === "add" && srcValue === 0) || src.ignoreNull === false) {
          const label = this.constructor._getSourceLabel(src);
          const info = { name: label.replace(/[[\]]/g, ""), value: srcValue, modifier: src.modifier || null };
          sources.push(info);
        }
      }
    }

    return sources;
  }

  async toggleCondition(conditionId, aeData) {
    let active = !this.statuses.has(conditionId);
    if (active && aeData) {
      active = aeData;
    }
    return this.setCondition(conditionId, active);
  }

  async setCondition(conditionId, enabled, context) {
    if (typeof enabled !== "boolean" && foundry.utils.getType(enabled) !== "Object") {
      throw new TypeError("Actor.setCondition() enabled state must be a boolean or plain object");
    }
    return this.setConditions({ [conditionId]: enabled }, context);
  }

  async setConditions(conditions = {}, context = {}) {
    conditions = foundry.utils.deepClone(conditions);

    // Create update data
    const toDelete = [],
      toCreate = [];

    for (const [conditionId, value] of Object.entries(conditions)) {
      const currentCondition = pf1fs.config.fleetConditions[conditionId];
      if (currentCondition === undefined) {
        console.error("Unrecognized condition:", conditionId);
        delete conditions[conditionId];
        continue;
      }

      const oldAe = this.statuses.has(conditionId) ? this.effects.find((ae) => ae.statuses.has(conditionId)) : null;

      // Create
      if (value) {
        if (!oldAe) {
          const aeData = {
            flags: {
              pf1: {
                autoDelete: true,
              },
            },
            statuses: [conditionId],
            name: currentCondition.name,
            img: currentCondition.texture,
          };

          // Special boolean for easy overlay
          if (value?.overlay) {
            delete value.overlay;
            foundry.utils.setProperty(aeData.flags, "core.overlay", true);
          }

          if (typeof value !== "boolean") {
            foundry.utils.mergeObject(aeData, value);
          }

          toCreate.push(aeData);
        } else {
          delete conditions[conditionId];
        }
      }
      // Delete
      else {
        if (oldAe) {
          toDelete.push(oldAe.id);
        } else {
          delete conditions[conditionId];
        }
      }
    }

    // Perform updates
    // Inform update handlers they don't need to do work
    if (toDelete.length) {
      const deleteContext = foundry.utils.deepClone(context);
      // Prevent double render
      if (context.trender && toCreate.length) {
        deleteContext.render = false;
      }
      // Without await the deletions may not happen at all, presumably due to race condition, if AEs are also created.
      await this.deleteEmbeddedDocuments("ActiveEffect", toDelete, deleteContext);
    }
    if (toCreate.length) {
      const createContext = foundry.utils.deepClone(context);
      await this.createEmbeddedDocuments("ActiveEffect", toCreate, createContext);
    }

    return conditions;
  }

  get allNotes() {
    const allNotes = this.items
      .filter(
        (item) =>
          item.type.startsWith(`${pf1fs.config.moduleId}.`) && item.isActive && item.system.contextNotes?.length > 0
      )
      .map((item) => ({ notes: item.system.contextNotes, item }));

    // add condition notes
    for (const [con, v] of Object.entries(this.system.conditions)) {
      if (!v) {
        continue;
      }
      const condition = pf1fs.config.fleetConditions[con];
      if (!condition) {
        continue;
      }

      const mechanic = condition.mechanics;
      if (!mechanic) {
        continue;
      }

      const conditionNotes = [];
      for (const note of mechanic.contextNotes ?? []) {
        conditionNotes.push(new pf1.components.ContextNote(note, { parent: this }));
      }
      allNotes.push({ notes: conditionNotes, item: null });
    }

    return allNotes;
  }

  getContextNotes(context, all = true) {
    const result = this.allNotes;

    for (const note of result) {
      note.notes = note.notes.filter((o) => o.target === context).map((o) => o.text);
    }

    return result.filter((n) => n.notes.length);
  }

  async getContextNotesParsed(context, { all, roll = true, rollData } = {}) {
    rollData ??= this.getRollData();

    const noteObjects = this.getContextNotes(context, all);
    await this.enrichContextNotes(noteObjects, rollData, { roll });

    return noteObjects.reduce((all, o) => {
      all.push(...o.enriched.map((text) => ({ text, source: o.item?.name })));
      return all;
    }, []);
  }

  async enrichContextNotes(notes, rollData, { roll = true } = {}) {
    rollData ??= this.getRollData();
    const notesPromises = notes.map(async (noteObj) => {
      rollData.item = {};
      if (noteObj.item) {
        rollData = noteObj.item.getRollData();
      }

      const enriched = [];
      for (const note of noteObj.notes) {
        enriched.push(
          ...note
            .split(/[\n\r]+/)
            .map((subnote) => pf1.utils.enrichHTMLUnrolled(subnote, { rollData, rolls: roll, relativeTo: this }))
        );
      }

      noteObj.enriched = await Promise.all(enriched);
    });

    await Promise.all(notesPromises);
  }

  /**
   * Retrieve data used to fill in roll variables.
   *
   * @example
   * await new Roll("1d20 + \@abilities.wis.mod[Wis]", actor.getRollData()).toMessage();
   *
   * @override
   * @param {object} [options] - Additional options
   * @returns {object}
   */
  getRollData(options = { refresh: false, cache: true }) {
    // Return cached data, if applicable
    const skipRefresh = !options.refresh && this._rollData && options.cache;

    const result = { ...(skipRefresh ? this._rollData : foundry.utils.deepClone(this.system)) };

    /* ----------------------------- */
    /* Always add the following data
    /* ----------------------------- */

    // Add combat round, if in combat
    if (game.combats?.viewed) {
      result.combat = {
        round: game.combat.round || 0,
      };
    }

    // Return cached data, if applicable
    if (skipRefresh) {
      return result;
    }

    /* ----------------------------- */
    /* Set the following data on a refresh
    /* ----------------------------- */

    if (options.cache) {
      this._rollData = result;
    }

    return result;
  }
}
