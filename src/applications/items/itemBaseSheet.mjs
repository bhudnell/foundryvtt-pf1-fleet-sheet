export class ItemBaseSheet extends pf1.applications.item.ItemSheetPF {
  static get defaultOptions() {
    const options = super.defaultOptions;
    return {
      ...options,
      classes: [...options.classes, "pf1", "item", "fleet"],
    };
  }

  get template() {
    return `modules/${pf1fs.config.moduleId}/templates/items/item-sheet.hbs`;
  }

  async getData(options = {}) {
    const context = await super.getData(options);

    const item = this.item;
    context.isBoon = item.type === pf1fs.config.boonId;

    return context;
  }

  async _updateObject(event, formData) {
    return ItemSheet.prototype._updateObject.call(this, event, formData);
  }
}
