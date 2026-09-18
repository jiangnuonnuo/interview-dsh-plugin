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
  it('keeps services free of Host Agent SDK', () => {
    const source = walk(join(srcRoot, 'services'))
      .filter((file) => file.endsWith('.ts'))
      .map((file) => readFileSync(file, 'utf8'))
      .join('\n');
    expect(source).not.toMatch(/agents\.get/);
    expect(source).not.toMatch(/ctx\.agents/);
    expect(source).not.toMatch(/llm\.stream/);
    expect(source).not.toMatch(/agentDefaultModel/);
    expect(source).not.toMatch(/from ['"]node:fs['"]/);
  });

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

  it('does not append coach output onto the conversation log', () => {
    const adapterDir = join(srcRoot, 'infra/dsh');
    const source = walk(adapterDir)
      .filter((file) => file.endsWith('.ts'))
      .map((file) => readFileSync(file, 'utf8'))
      .join('\n');
    expect(source).not.toMatch(/session\.append\(/);
    expect(source).not.toMatch(/appendMessage/);
    expect(source).not.toMatch(/session\.prompt\(/);
  });

  it('does not mention the retired interviewer identifier in src', () => {
    const source = walk(srcRoot)
      .filter((file) => file.endsWith('.ts'))
      .map((file) => readFileSync(file, 'utf8'))
      .join('\n');
    expect(source).not.toMatch(/interviewerId/);
  });

  it('injects fs for workspace writes and never uses node:fs in the adapter', () => {
    const adapter = readFileSync(join(srcRoot, 'infra/dsh/adapter.ts'), 'utf8');
    const data = walk(join(srcRoot, 'data'))
      .filter((file) => file.endsWith('.ts'))
      .map((file) => readFileSync(file, 'utf8'))
      .join('\n');
    expect(adapter).toMatch(/inject = \['agents', 'llm', 'agentDefaultModel', 'fs'\]/);
    expect(adapter).not.toMatch(/from ['"]node:fs['"]/);
    expect(data).not.toMatch(/from ['"]node:fs['"]/);
    expect(data).not.toMatch(/@deepseek-ai\//);
  });
});
