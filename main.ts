// main.ts — hands the app in for the GTA 6 cover art bounty.
//
// It copies app/ and screenshots/ from this repository into the output
// directory and writes output/dossier.json with buildDossier from the
// kit's vendor/makefun-app.ts. The grader runs it twice; both runs write
// the same bytes. Outside the grader, MAKEFUN_OUTPUT_DIR stands in for
// /output. Node 22, standard library only.
import { cpSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-app.ts";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)));
const OUTPUT_DIR = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? "/output");

// The gate's own caps, from the competition rules: dossier text at most
// 160 KiB, at most 4 screenshots of at most 256 KiB each, app/ at most
// 993 files and 48 MiB, paths at most 1000 bytes.
const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 48 * 1024 * 1024,
  app_path_max_bytes: 1000,
};

rmSync(OUTPUT_DIR, { recursive: true, force: true });
mkdirSync(OUTPUT_DIR, { recursive: true });
cpSync(join(REPO_ROOT, "app"), join(OUTPUT_DIR, "app"), { recursive: true });
cpSync(join(REPO_ROOT, "screenshots"), join(OUTPUT_DIR, "screenshots"), {
  recursive: true,
});
const dossier = buildDossier(REPO_ROOT, DOSSIER_CAPS);
writeFileSync(join(OUTPUT_DIR, "dossier.json"), dossier);
console.log(
  `wrote ${OUTPUT_DIR}: app/ + screenshots/ + dossier.json (${dossier.length} bytes)`,
);
