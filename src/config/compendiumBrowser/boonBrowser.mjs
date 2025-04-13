import { boonId } from "../config.mjs";

const commonFilters = pf1.applications.compendiumBrowser.filters.common;

class BoonFilter extends pf1.applications.compendiumBrowser.filters.BaseFilter {
  static label = "PF1FS.BoonStuff";
  static type = boonId;
}

export class BoonBrowser extends pf1.applications.compendiumBrowser.CompendiumBrowser {
  static documentName = "Item";
  static typeName = "PF1FS.Army.Boons";
  static filterClasses = [commonFilters.PackFilter, commonFilters.TagFilter, BoonFilter];
}
