import { promises as fs } from "fs";
import path from "path";

import { compilePack } from "@foundryvtt/foundryvtt-cli";

import { sourcePacksDir, compiledPacksDir } from "./config.mjs";

const packs = await fs.readdir(sourcePacksDir);
const promises = packs.map((pack) => {
  console.log("Packing " + pack);
  const src = path.join(sourcePacksDir, pack);
  const dest = path.join(compiledPacksDir, pack);
  return compilePack(src, dest, {
    yaml: true,
    log: true,
  });
});

await Promise.all(promises);
