/**
 * @jest-environment node
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const srcRoot = join(process.cwd(), 'src');

const walk = (dir: string): string[] => {
  const entries = readdirSync(dir);
  const files: string[] = [];
  for (const entry of entries) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...walk(full));
    } else {
      files.push(full);
    }
  }
  return files;
};

describe('backend DSH adapter boundary', () => {
  it('does not register sidebarRightTabs or header buttons', () => {
    const source = walk(srcRoot)
      .filter((file) => file.endsWith('.ts'))
      .map((file) => readFileSync(file, 'utf8'))
      .join('\n');
    expect(source).not.toMatch(/sidebarRightTabs/);
    expect(source).not.toMatch(/sidebar\.right\.pane\.tab/);
    expect(source).not.toMatch(/conversation\.session\.header/);
    expect(source).not.toMatch(/openTab\(/);
  });

  it('does not mention the retired interviewer identifier in src', () => {
    const source = walk(srcRoot)
      .filter((file) => file.endsWith('.ts'))
      .map((file) => readFileSync(file, 'utf8'))
      .join('\n');
    expect(source).not.toMatch(/interviewerId/);
  });
});
