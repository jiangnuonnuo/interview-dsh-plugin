import { build } from 'esbuild';
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const libDir = resolve(root, 'lib');
const sharedEntry = resolve(root, 'shared/src/index.ts');
const clientSrc = resolve(root, 'frontend/dist/client.js');

mkdirSync(libDir, { recursive: true });

const common = {
  bundle: true,
  format: 'esm',
  platform: 'node',
  packages: 'bundle',
  target: 'node20',
  alias: {
    'interview-dsh-shared': sharedEntry,
  },
  logLevel: 'info',
};

await build({
  ...common,
  entryPoints: [resolve(root, 'backend/src/infra/dsh/index.ts')],
  outfile: resolve(libDir, 'index.js'),
});

await build({
  ...common,
  entryPoints: [resolve(root, 'backend/src/typert.host.ts')],
  outfile: resolve(libDir, 'typert.host.js'),
});

if (!existsSync(clientSrc)) {
  throw new Error('frontend/dist/client.js missing; run workspace frontend build first');
}

copyFileSync(clientSrc, resolve(libDir, 'client.js'));
