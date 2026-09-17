import { createElement } from 'react';
import { EntryPanel } from '../../features/entry/EntryPanel';
import type { EntryPort } from '../../features/entry/entry-port';
import { InterviewTriggerButton } from './InterviewTriggerButton';
import { ENTRY_OVERLAY_ID, InterviewSlotPanel } from './InterviewSlotPanel';
import { entrySurface } from './entry-surface';
import { interviewEntryRemote } from './remote';
import { createInterviewPort, createUnavailableEntryPort, type InterviewRemote } from './remote-port';
import type { ExamRoomSessions } from './start-exam-room';

export const name = 'interview-dsh';
export const inject = ['slots', 'remote'];

export const ENTRY_TAB_ID = 'interview-dsh/entry';
export const ENTRY_TAB_KIND = 'interview';
export { ENTRY_OVERLAY_ID };

interface SlotsApi {
  inject(name: string, register: () => unknown): unknown;
  register(meta: Record<string, unknown>, component: unknown): unknown;
}

interface SidebarTabsApi {
  register(definition: {
    id: string;
    kind: string;
    title: () => string;
  }): unknown;
}

interface SidebarRightApi {
  openTab: (kind: string) => void;
}

interface LayoutPanels {
  openDetails: () => void;
  closeDetails: () => void;
}

interface RemoteApi {
  $mount: (contribution: unknown) => Promise<unknown>;
}

export interface ClientContext {
  slots: SlotsApi;
  remote?: RemoteApi;
  sidebarRight?: SidebarRightApi;
  sidebarRightTabs?: SidebarTabsApi;
  effect: (callback: () => unknown, label?: string) => void;
  inject: (services: string[], callback: (scoped: ClientContext) => unknown) => unknown;
  get?: (key: string) => unknown;
}

let officialTabRegistered = false;

const readService = (ctx: ClientContext, key: string): unknown => {
  if (typeof ctx.get === 'function') {
    try {
      return ctx.get(key);
    } catch {
      return undefined;
    }
  }
  return (ctx as unknown as Record<string, unknown>)[key];
};

const asExamRoomSessions = (value: unknown): ExamRoomSessions | undefined => {
  if (value === null || typeof value !== 'object') {
    return undefined;
  }
  const sessions = value as Partial<ExamRoomSessions>;
  if (typeof sessions.create !== 'function') {
    return undefined;
  }
  return sessions as ExamRoomSessions;
};

/**
 * `sessions` 不能写进 Client 顶层 inject。探测只用 ctx.get，再退回嵌套 inject。
 * 必须在点「开始」时再探一次：apply 时会话服务可能还没进这个 fiber。
 */
const probeSessions = (ctx: ClientContext): ExamRoomSessions | undefined => {
  const fromGet = asExamRoomSessions(readService(ctx, 'sessions'));
  if (fromGet !== undefined) {
    return fromGet;
  }
  try {
    let found: ExamRoomSessions | undefined;
    ctx.inject(['sessions'], (scoped) => {
      found =
        asExamRoomSessions((scoped as ClientContext & { sessions?: unknown }).sessions) ??
        asExamRoomSessions(readService(scoped, 'sessions'));
    });
    return found;
  } catch {
    return undefined;
  }
};

const officialOpenTab = (ctx: ClientContext): ((kind: string) => void) | undefined => {
  const sidebarRight = readService(ctx, 'sidebarRight') as SidebarRightApi | undefined;
  if (sidebarRight === undefined || typeof sidebarRight.openTab !== 'function') {
    return undefined;
  }
  return (kind: string) => sidebarRight.openTab(kind);
};

const asLayout = (value: unknown): LayoutPanels | undefined => {
  if (value === null || typeof value !== 'object') {
    return undefined;
  }
  const layout = value as Partial<LayoutPanels>;
  if (typeof layout.openDetails !== 'function' || typeof layout.closeDetails !== 'function') {
    return undefined;
  }
  return layout as LayoutPanels;
};

const probeLayout = (ctx: ClientContext): LayoutPanels | undefined => {
  const fromGet = asLayout(readService(ctx, 'layout'));
  if (fromGet !== undefined) {
    return fromGet;
  }
  try {
    let found: LayoutPanels | undefined;
    ctx.inject(['layout'], (scoped) => {
      found =
        asLayout((scoped as ClientContext & { layout?: unknown }).layout) ??
        asLayout(readService(scoped, 'layout'));
    });
    return found;
  } catch {
    return undefined;
  }
};

/**
 * overlay 是浮层，不会挤对话列。打开官方 details 列让出右栏。
 * 关闭时不得 sessions.open 考场：用户可能已切到新会话，钉回去会把输入和历史都绑死在上一场。
 * 禁止注册 `details` 槽，那会盖掉宿主 DetailsPanel。
 */
const openOverlayChrome = (ctx: ClientContext): void => {
  probeLayout(ctx)?.openDetails();
};

const closeOverlayChrome = (ctx: ClientContext): void => {
  entrySurface.close();
  probeLayout(ctx)?.closeDetails();
};

const openOverlayFallback = (ctx: ClientContext, cause?: unknown): void => {
  try {
    if (entrySurface.isOpen()) {
      return;
    }
    entrySurface.open();
    openOverlayChrome(ctx);
  } catch (overlayCause: unknown) {
    entrySurface.fail(overlayCause);
    throw overlayCause instanceof Error ? overlayCause : new Error(String(overlayCause));
  }
  if (!entrySurface.isOpen()) {
    entrySurface.fail(cause ?? '无法打开模拟面试入口。');
    throw cause instanceof Error ? cause : new Error(String(cause ?? '无法打开模拟面试入口。'));
  }
};

export const openInterviewTab = (ctx: ClientContext): void => {
  try {
    if (officialTabRegistered) {
      const openTab = officialOpenTab(ctx);
      if (openTab !== undefined) {
        openTab(ENTRY_TAB_KIND);
        return;
      }
    }
    if (entrySurface.isOpen()) {
      closeOverlayChrome(ctx);
      return;
    }
    entrySurface.open();
    openOverlayChrome(ctx);
  } catch (cause: unknown) {
    openOverlayFallback(ctx, cause);
  }
};

const onInterviewTrigger = (ctx: ClientContext): void => {
  try {
    openInterviewTab(ctx);
  } catch (cause: unknown) {
    entrySurface.fail(cause);
  }
};

export async function apply(ctx: ClientContext): Promise<void> {
  officialTabRegistered = false;
  let port = createUnavailableEntryPort(
    'interview-dsh: ctx.remote.interviewEntry is unavailable',
  );
  if (ctx.remote !== undefined && typeof ctx.remote.$mount === 'function') {
    const dispose = await ctx.remote.$mount(interviewEntryRemote);
    ctx.effect(() => () => {
      if (typeof dispose === 'function') {
        dispose();
      }
    }, 'interview-dsh: remote contribution');
        const namespace = readService(ctx, 'remote.interviewEntry') as InterviewRemote | undefined;
    if (namespace !== undefined) {
      port = createInterviewPort(namespace, () => probeSessions(ctx));
    }
  }

  ctx.slots.inject('conversation.input.right', () =>
    ctx.slots.register(
      {
        name: 'conversation.input.right',
        id: 'interview-dsh',
        order: 9,
        label: '面试',
      },
      () => createElement(InterviewTriggerButton, { onOpen: () => onInterviewTrigger(ctx) }),
    ),
  );

  ctx.slots.inject('shell.overlay', () =>
    ctx.slots.register(
      {
        name: 'shell.overlay',
        id: ENTRY_OVERLAY_ID,
        order: 40,
        label: '面试',
      },
      () =>
        createElement(InterviewSlotPanel, {
          port,
          onClose: () => closeOverlayChrome(ctx),
          onExamLive: () => openOverlayChrome(ctx),
        }),
    ),
  );

  try {
    ctx.inject(['sidebarRightTabs'], (scoped) => {
      const tabs =
        scoped.sidebarRightTabs ??
        (readService(scoped, 'sidebarRightTabs') as SidebarTabsApi | undefined);
      if (tabs === undefined || typeof tabs.register !== 'function') {
        return;
      }
      const disposers: Array<() => void> = [];
      try {
        const typeDispose = tabs.register({
          id: ENTRY_TAB_ID,
          kind: ENTRY_TAB_KIND,
          title: () => '面试',
        });
        if (typeof typeDispose === 'function') {
          disposers.push(typeDispose as () => void);
        }
        const bodyDispose = scoped.slots.inject('sidebar.right.pane.tab', () =>
          scoped.slots.register(
            {
              name: 'sidebar.right.pane.tab',
              key: ENTRY_TAB_ID,
              inject: () => ({ port }),
            },
            ({ port: injectedPort }: { port: EntryPort }) =>
              createElement(EntryPanel, { port: injectedPort }),
          ),
        );
        if (typeof bodyDispose === 'function') {
          disposers.push(bodyDispose as () => void);
        }
        officialTabRegistered = true;
      } catch (cause: unknown) {
        officialTabRegistered = false;
        for (const dispose of disposers) {
          dispose();
        }
        throw cause instanceof Error ? cause : new Error(String(cause));
      }
      return () => {
        for (const dispose of disposers) {
          dispose();
        }
      };
    });
  } catch (cause: unknown) {
    officialTabRegistered = false;
    if (officialOpenTab(ctx) !== undefined) {
      throw cause instanceof Error ? cause : new Error(String(cause));
    }
  }
}
