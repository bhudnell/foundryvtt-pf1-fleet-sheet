class SyncManager {
  #active = false;
  #visited = new Set();

  get active() {
    return this.#active;
  }

  /**
   * Run an operation as part of the current synchronization chain.
   *
   * The first call starts a new chain. Nested calls share the same
   * visited set. The state is cleared when the root call finishes.
   *
   * @param {foundry.abstract.Document} document
   * @param {Function} callback
   */
  run(document, callback) {
    const isRoot = !this.#active;

    if (isRoot) {
      this.#active = true;
      this.#visited.clear();
    }

    try {
      // This document has already participated in this sync chain.
      if (this.#visited.has(document.uuid)) {
        return;
      }

      this.#visited.add(document.uuid);

      callback();
    } finally {
      // Only the root call cleans up the synchronization state.
      if (isRoot) {
        this.#active = false;
        this.#visited.clear();
      }
    }
  }

  prepare(document) {
    document.reset();
    if (game.ready && document.sheet.rendered) {
      document.sheet.render(true);
    }
  }
}

export const syncManager = new SyncManager();
