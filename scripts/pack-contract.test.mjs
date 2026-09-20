import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pkgPath = resolve(root, 'package.json');
const hostPath = resolve(root, 'lib/index.js');
const clientPath = resolve(root, 'lib/client.js');
const patchPath = resolve(root, 'cordis.patch.yml');
const licensePath = resolve(root, 'LICENSE');

const workspacePackageName = /interview-dsh-shared/;
const workspaceProtocol = /workspace:/;
const externalSharedImport =
  /(?:from|import)\s*['"]interview-dsh-shared['"]|require\(\s*['"]interview-dsh-shared['"]\s*\)/;

const readPkg = () => JSON.parse(readFileSync(pkgPath, 'utf8'));

const dependencyBlob = (pkg) =>
  JSON.stringify({
    dependencies: pkg.dependencies ?? {},
    peerDependencies: pkg.peerDependencies ?? {},
    optionalDependencies: pkg.optionalDependencies ?? {},
  });

test('root package is a public, licensed DSH bundle', () => {
  const pkg = readPkg();
  assert.notEqual(pkg.private, true, 'root package must not be private');
  assert.equal(typeof pkg.license, 'string');
  assert.match(pkg.license, /MIT/i);
  assert.ok(existsSync(licensePath), 'LICENSE file must exist');
  assert.equal(typeof pkg.dsh?.bundle?.patch, 'string');
  assert.equal(pkg.dsh?.client?.platform, 'web');
  assert.equal(typeof pkg.exports?.['./client'], 'string');
  assert.equal(typeof pkg.exports?.['./cordis.patch.yml'], 'string');
  assert.ok(existsSync(resolve(root, pkg.dsh.bundle.patch)));
  assert.ok(existsSync(patchPath));
});

test('installer dependency graph has no workspace packages', () => {
  const blob = dependencyBlob(readPkg());
  assert.doesNotMatch(blob, workspaceProtocol);
  assert.doesNotMatch(blob, workspacePackageName);
});

test('lib runtime entries exist and Host does not import unpublished shared', () => {
  assert.ok(existsSync(hostPath), 'lib/index.js must exist');
  assert.ok(existsSync(clientPath), 'lib/client.js must exist');
  const host = readFileSync(hostPath, 'utf8');
  const client = readFileSync(clientPath, 'utf8');
  assert.doesNotMatch(host, externalSharedImport);
  assert.match(client, /window\.__ModuleLoader__\.load/);
  assert.match(client, /interview-dsh/);
});

test('npm pack includes runtime halves, patch, and LICENSE', () => {
  const packed = spawnSync('npm', ['pack', '--dry-run', '--json'], {
    cwd: root,
    encoding: 'utf8',
  });
  assert.equal(packed.status, 0, packed.stderr || packed.stdout);
  const reports = JSON.parse(packed.stdout);
  const report = Array.isArray(reports) ? reports[0] : reports;
  const files = (report.files ?? []).map((file) =>
    String(file.path ?? file).replace(/^package\//, ''),
  );
  for (const needed of ['lib/index.js', 'lib/client.js', 'cordis.patch.yml', 'LICENSE']) {
    assert.ok(
      files.some((path) => path === needed || path.endsWith(`/${needed}`)),
      `pack must include ${needed}, got ${files.join(', ')}`,
    );
  }
});
