// main.ts — dossier builder for Sunset Cover Studio.
// Node 22, standard library only. Copies app/ + screenshots/ into
// $MAKEFUN_OUTPUT_DIR (default /output) and writes dossier.json there
// with buildDossier from vendor/makefun-app.ts. Two runs produce
// byte-identical output.
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-app.ts";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)));
const OUT_DIR = resolve(process.env.MAKEFUN_OUTPUT_DIR || "/output");

const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 48 * 1024 * 1024,
  app_path_max_bytes: 1000,
};

function main(): void {
  rmSync(OUT_DIR, { recursive: true, force: true });
  mkdirSync(OUT_DIR, { recursive: true });
  const appSrc = join(REPO_ROOT, "app");
  const shotsSrc = join(REPO_ROOT, "screenshots");
  if (!existsSync(appSrc)) {
    throw new Error(`app/ not found under ${REPO_ROOT} — refusing to write an empty dossier`);
  }
  cpSync(appSrc, join(OUT_DIR, "app"), { recursive: true });
  if (existsSync(shotsSrc)) {
    cpSync(shotsSrc, join(OUT_DIR, "screenshots"), { recursive: true });
  } else {
    console.warn("warning: screenshots/ not found — dossier will carry no screenshots");
  }
  // buildDossier returns the dossier bytes (Uint8Array) — write them raw.
  // JSON.stringify of a byte array would bloat it into an index-keyed
  // object (~20x the size), so handle strings, byte arrays and objects.
  const dossier = buildDossier(REPO_ROOT, CAPS);
  const outPath = join(OUT_DIR, "dossier.json");
  if (typeof dossier === "string") {
    writeFileSync(outPath, dossier, "utf8");
  } else if (dossier instanceof Uint8Array) {
    writeFileSync(outPath, dossier);
  } else {
    writeFileSync(outPath, JSON.stringify(dossier, null, 2) + "\n", "utf8");
  }
  console.log(`dossier written to ${join(OUT_DIR, "dossier.json")}`);
}

main();
