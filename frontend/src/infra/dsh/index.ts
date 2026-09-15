import { createElement } from 'react';
import { EntryPanel } from '../../features/entry/EntryPanel';
import type { EntryPort } from '../../features/entry/entry-port';
import type { AcceptEntryConfigRequest } from 'interview-dsh-shared';
import { InterviewTriggerButton } from './InterviewTriggerButton';
import { ENTRY_OVERLAY_ID, InterviewSlotPanel } from './InterviewSlotPanel';
import { entrySurface } from './entry-surface';
import { interviewEntryRemote } from './remote';
import { createRemoteEntryPort, createUnavailableEntryPort } from './remote-port';

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

const officialOpenTab = (ctx: ClientContext): ((kind: string) => void) | undefined => {
  const sidebarRight = readService(ctx, 'sidebarRight') as SidebarRightApi | undefined;
  if (sidebarRight === undefined || typeof sidebarRight.openTab !== 'function') {
    return undefined;
  }
  return (kind: string) => sidebarRight.openTab(kind);
};

const openOverlayFallback = (cause?: unknown): void => {
  try {
    if (entrySurface.isOpen()) {
      return;
    }
    entrySurface.open();
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
    entrySurface.toggle();
  } catch (cause: unknown) {
    openOverlayFallback(cause);
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
        const namespace = readService(ctx, 'remote.interviewEntry') as
          | {
              acceptEntryConfig: (request: AcceptEntryConfigRequest) => Promise<unknown>;
              getEntryConfig: () => Promise<unknown>;
            }
          | undefined;
    if (namespace !== undefined) {
      port = createRemoteEntryPort(namespace);
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
      () => createElement(InterviewSlotPanel, { port }),
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
