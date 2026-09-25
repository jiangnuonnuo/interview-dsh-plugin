import {
  JEV_CONFIG_ERROR_MESSAGES,
  JEV_CONFIG_REL,
  type GetJevConfigResponse,
  type SaveJevConfigResponse,
} from 'interview-dsh-shared';
import {
  emptyJevSecret,
  parseJevFile,
  planJevSave,
  toPublicJevConfig,
  type JevConfigStore,
  type JevSecretConfig,
} from '../../data/jev-config.js';
import { persistUnavailable } from '../../data/workspace-archive.js';
import {
  type ArchiveWorkspaceLookup,
  type WorkspaceTextFs,
} from './workspace-fs.js';

const resolveTarget = async (
  fs: WorkspaceTextFs,
  cwd: string,
  rel: string,
): Promise<unknown> => {
  if (typeof fs.resolve === 'function') {
    return await fs.resolve(rel, { cwd });
  }
  return `${cwd.replace(/[/\\]+$/, '')}/${rel.replace(/^[/\\]+/, '')}`;
};

const workspaceWritePolicy = (cwd: string) => ({
  mode: 'workspace-write' as const,
  workspaceRoot: cwd,
  sessionId: 'jev-config',
});

const readRel = async (fs: WorkspaceTextFs, cwd: string): Promise<string | undefined> => {
  if (typeof fs.readText !== 'function') {
    return undefined;
  }
  try {
    const target = await resolveTarget(fs, cwd, JEV_CONFIG_REL);
    return await fs.readText(target as never);
  } catch {
    return undefined;
  }
};

const writeRel = async (fs: WorkspaceTextFs, cwd: string, text: string): Promise<void> => {
  const target = await resolveTarget(fs, cwd, JEV_CONFIG_REL);
  await fs.writeText(target as never, text, undefined, undefined, workspaceWritePolicy(cwd));
};

/**
 * Jev 开关与密钥只写 `.dsh-interview/config/jev.json`，经 Host ctx.fs。
 */
export const createFsJevConfigStore = (
  fs: WorkspaceTextFs | undefined,
  workspace: ArchiveWorkspaceLookup,
): JevConfigStore => {
  const cwdOf = (sessionId?: string): string | undefined => {
    if (sessionId === undefined || sessionId.length === 0) {
      return undefined;
    }
    return workspace.cwdFor(sessionId);
  };

  const readSecret = async (sessionId?: string): Promise<
    { readonly ok: true; readonly secret: JevSecretConfig; readonly cwd: string } | { readonly ok: false }
  > => {
    if (fs === undefined) {
      return { ok: false };
    }
    const cwd = cwdOf(sessionId);
    if (cwd === undefined || cwd.length === 0) {
      return { ok: false };
    }
    return { ok: true, secret: parseJevFile(await readRel(fs, cwd)), cwd };
  };

  return {
    async loadPublic(sessionId): Promise<GetJevConfigResponse> {
      const loaded = await readSecret(sessionId);
      if (!loaded.ok) {
        return {
          ok: false,
          code: 'persist_unavailable',
          message: JEV_CONFIG_ERROR_MESSAGES.persist_unavailable,
        };
      }
      const publicConfig = toPublicJevConfig(loaded.secret);
      return { ok: true, enabled: publicConfig.enabled, apiKeySet: publicConfig.apiKeySet };
    },
    async loadSecret(sessionId): Promise<JevSecretConfig> {
      const loaded = await readSecret(sessionId);
      if (!loaded.ok) {
        return emptyJevSecret();
      }
      return loaded.secret;
    },
    async save(input, sessionId): Promise<SaveJevConfigResponse> {
      if (fs === undefined) {
        return persistUnavailable();
      }
      const cwd = cwdOf(sessionId);
      if (cwd === undefined || cwd.length === 0) {
        return persistUnavailable();
      }
      const current = parseJevFile(await readRel(fs, cwd));
      const planned = planJevSave(current, input);
      if (!planned.ok) {
        return planned;
      }
      try {
        await writeRel(fs, cwd, `${JSON.stringify(planned.next, null, 2)}\n`);
      } catch {
        return persistUnavailable();
      }
      const publicConfig = toPublicJevConfig(planned.next);
      return { ok: true, enabled: publicConfig.enabled, apiKeySet: publicConfig.apiKeySet };
    },
  };
};
