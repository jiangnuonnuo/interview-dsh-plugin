import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { ENTRY_TAB_ID, ENTRY_TAB_KIND } from './index';

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

describe('frontend DSH adapter boundary', () => {
  it('registers the interview tab id and kind', () => {
    expect(ENTRY_TAB_ID).toBe('interview-dsh/entry');
    expect(ENTRY_TAB_KIND).toBe('interview');
  });

  it('does not write into conversation bubbles', () => {
    const adapterDir = join(process.cwd(), 'src/infra/dsh');
        const source = walk(adapterDir)
          .filter((file) => /\.(ts|tsx)$/.test(file) && !file.includes('.test.'))
          .map((file) => readFileSync(file, 'utf8'))
          .join('\n');
    expect(source).not.toMatch(/appendMessage/);
    expect(source).not.toMatch(/writeBubble/);
    expect(source).not.toMatch(/insertChat/);
    expect(source).not.toMatch(/conversation\.chat\.node/);
  });

  it('keeps features/ free of Sidebar SDK imports', () => {
    const featuresDir = join(process.cwd(), 'src/features');
    const source = walk(featuresDir)
      .filter((file) => /\.(ts|tsx)$/.test(file))
      .map((file) => readFileSync(file, 'utf8'))
      .join('\n');
    expect(source).not.toMatch(/sidebarRightTabs/);
    expect(source).not.toMatch(/sidebarRight/);
    expect(source).not.toMatch(/@deepseek-ai\/dsh-client-ui-sidebar/);
    expect(source).not.toMatch(/from ['"]\.\.\/infra\/dsh/);
  });

  it('registers the trigger on conversation.input.right, not the session header', () => {
    const adapterDir = join(process.cwd(), 'src/infra/dsh');
    const source = walk(adapterDir)
      .filter((file) => /\.(ts|tsx)$/.test(file) && !file.includes('.test.'))
      .map((file) => readFileSync(file, 'utf8'))
      .join('\n');
    expect(source).toMatch(/conversation\.input\.right/);
    expect(source).not.toMatch(/conversation\.session\.header\.utilities/);
  });

  it('declares the same dsh.client.inject family as the prompt optimizer', () => {
    const rootPkg = JSON.parse(
      readFileSync(join(process.cwd(), '../package.json'), 'utf8'),
    ) as {
      dsh?: { client?: { inject?: string[] } };
    };
    expect(rootPkg.dsh?.client?.inject).toEqual([
      '@deepseek-ai/dsh-client-runtime',
      '@deepseek-ai/dsh-api-remotes',
      '@deepseek-ai/dsh-client-ui-layout',
      '@deepseek-ai/dsh-client-ui-conversation',
    ]);
  });

  it('does not add a features/chat directory', () => {
    expect(() => readdirSync(join(process.cwd(), 'src/features/chat'))).toThrow();
  });

  it('does not call fetch /api from the client adapter', () => {
    const adapterDir = join(process.cwd(), 'src/infra/dsh');
    const source = walk(adapterDir)
      .filter((file) => /\.(ts|tsx)$/.test(file) && !file.includes('.test.'))
      .map((file) => readFileSync(file, 'utf8'))
      .join('\n');
    expect(source).not.toMatch(/fetch\(['"`]\/api\//);
    expect(source).toMatch(/readService\(ctx, 'sessions'\)/);
    expect(source).toMatch(/inject\(\['sessions'\]/);
    expect(source).toMatch(/inject\(\['layout'\]/);
    expect(source).not.toMatch(/inject = \['slots', 'remote', 'sessions'\]/);
    expect(source).toMatch(/export const inject = \['slots', 'remote'\]/);
    expect(source).not.toMatch(/inject\(['"]details['"]/);
    expect(source).not.toMatch(/name: ['"]details['"]/);
  });
});
