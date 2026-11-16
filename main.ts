// Halyard's entrypoint (Node 22, standard library only, nothing installed before it runs): it
// hands the game in. The playable game is this directory's game/ folder — plain static files a
// desktop browser opens and plays offline — and this program copies game/ and screenshots/ to the
// output directory and writes dossier.json there with the vendored make.fun library, the summary
// the judge reads. Both runs of the grader must write the same bytes: nothing here reads a clock,
// the network or a random number, so they do.
//
//   node main.ts                                  # writes /output, as the grader runs it
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts   # writes ./out instead
//   node serve.ts                                 # serves game/ on http://localhost:8080 to play it

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repo = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The game and its renders, as they stand in the repository.
mkdirSync(join(out, 'game'), { recursive: true });
cpSync(join(repo, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
const shots = join(repo, 'screenshots');
if (existsSync(shots)) cpSync(shots, join(out, 'screenshots'), { recursive: true });

// The same caps the sealed scorer reads from reference/gate.json: the text cap shapes the dossier's
// bytes, the rest refuse an entry the scorer would refuse (over four screenshots, one over 256 KiB,
// over 993 files or 48 MiB under game/, a path under game/ over 1000 bytes).
const dossier = buildDossier(out, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(out, 'dossier.json'), dossier);

console.log(`halyard: game/ and ${out}/screenshots copied, dossier.json ${dossier.length} bytes`);
