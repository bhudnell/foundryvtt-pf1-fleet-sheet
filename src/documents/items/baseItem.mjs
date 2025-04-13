import { keepUpdateArray } from "../../util/utils.mjs";

export class BaseItem extends pf1.documents.item.ItemPF {
  static get hasChanges() {
    return this.system.hasChanges;
  }

  static system = Object.freeze({
    hasChanges: true,
    links: [],
  });

  get hasChanges() {
    return this.constructor.hasChanges;
  }

  get isActive() {
    return !this.system.disabled;
  }

  static getDefaultArtwork(itemData) {
    const result = super.getDefaultArtwork(itemData);
    const image = pf1.config.defaultIcons.items[itemData?.type];
    if (image) {
      result.img = image;
    }
    return result;
  }

  async _preCreate(data, context, user) {
    await super._preCreate(data, context, user);

    // Ensure unique Change IDs
    const actor = this.actor;
    if (actor && data?.system?.changes?.length > 0) {
      const changes = data.system.changes;

      let ids = new Set();
      while (ids.size < changes.length) {
        ids.add(foundry.utils.randomID(8));
      }
      ids = Array.from(ids);
      for (const c of changes) {
        c._id = ids.pop();
      }
      this.updateSource({ "system.changes": changes });
    }

    const updates = this.preCreateData(data, context, user);

    if (Object.keys(updates).length) {
      this.updateSource(updates);
    }
  }

  preCreateData(data, options, user) {
    return {};
  }

  prepareDerivedData() {
    super.prepareDerivedData();
    this.flags ??= {};
  }

  async update(data, context = {}) {
    const changed = foundry.utils.expandObject(data);

    if (changed.system) {
      const keepPaths = ["system.contextNotes"];

      const itemData = this.toObject();
      for (const path of keepPaths) {
        keepUpdateArray(itemData, changed, path);
      }
    }

    super.update(foundry.utils.flattenObject(changed), context);
  }

  getLabels({ actionId, rollData } = {}) {
    return {};
  }

  get defaultAction() {
    return this.actions?.get(this.system.actions?.[0]?._id);
  }
}
