import { fleetId, moduleId, squadronId } from "./config.mjs";

export const defaultIcons = {
  actors: {
    [fleetId]: `modules/${moduleId}/assets/ship-wheel.svg`,
    [squadronId]: `modules/${moduleId}/assets/caravel.svg`,
  },
};
