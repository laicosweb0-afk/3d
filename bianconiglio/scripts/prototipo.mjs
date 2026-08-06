// Costruisce il PROTOTIPO: la versione senza server, senza chiavi e senza
// costi a visita. Uso: `npm run prototipo` (parola d'accesso di default:
// «seguimi»; per cambiarla: PAROLA=lamiaparola npm run prototipo).
//
// L'export statico di Next non ammette né middleware né API routes, quindi lo
// script li mette da parte prima di compilare e li rimette a posto SEMPRE,
// anche se la compilazione fallisce: il progetto «vero» non deve mai restare
// mutilato per colpa di una build del prototipo.

import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, renameSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const radice = join(dirname(fileURLToPath(import.meta.url)), '..');
const parola = process.env.PAROLA || 'seguimi';

// La stessa impronta di lib/sigillo.ts: prefisso + SHA-256.
const sigillo = createHash('sha256')
  .update(`bianconiglio::sigillo::${parola}`)
  .digest('hex');

const daParcheggiare = [
  { da: join(radice, 'middleware.ts'), a: join(radice, '.prototipo-middleware.ts') },
  { da: join(radice, 'app/api'), a: join(radice, '.prototipo-api') },
];

const parcheggiati = [];
for (const { da, a } of daParcheggiare) {
  if (existsSync(da)) {
    renameSync(da, a);
    parcheggiati.push({ da, a });
  }
}

try {
  rmSync(join(radice, '.next'), { recursive: true, force: true });
  rmSync(join(radice, 'out'), { recursive: true, force: true });
  execSync('npx next build', {
    cwd: radice,
    stdio: 'inherit',
    env: {
      ...process.env,
      PROTOTIPO: '1',
      NEXT_PUBLIC_PROTOTIPO: '1',
      NEXT_PUBLIC_SIGILLO: sigillo,
    },
  });
  console.log(`\nPrototipo pronto in out/ — parola d'accesso: «${parola}»`);
} finally {
  for (const { da, a } of parcheggiati) renameSync(a, da);
}
