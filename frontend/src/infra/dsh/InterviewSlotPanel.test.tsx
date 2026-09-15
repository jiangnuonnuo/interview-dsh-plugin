import { act, createElement, type ComponentType } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { createMemoryEntryPort } from '../../features/entry/memory-port';
import { entrySurface } from './entry-surface';
import { apply, openInterviewTab, type ClientContext } from './index';
import { InterviewSlotPanel } from './InterviewSlotPanel';

const slotsStub: ClientContext['slots'] = {
  inject: () => () => undefined,
  register: () => undefined,
};

const baseCtx = (): ClientContext => ({
  slots: slotsStub,
  effect: () => undefined,
  inject: () => undefined,
});

describe('entrySurface', () => {
  afterEach(() => {
    entrySurface.close();
  });

  it('starts closed and toggles', () => {
    expect(entrySurface.isOpen()).toBe(false);
    entrySurface.toggle();
    expect(entrySurface.isOpen()).toBe(true);
    entrySurface.toggle();
    expect(entrySurface.isOpen()).toBe(false);
  });
});

describe('openInterviewTab', () => {
  afterEach(() => {
    entrySurface.close();
  });

  it('falls back to the slot overlay when official tabs were not registered', () => {
    openInterviewTab({
      ...baseCtx(),
      sidebarRight: { openTab: () => undefined },
    });
    expect(entrySurface.isOpen()).toBe(true);
  });

  it('opens the overlay when ctx.get exists and sidebarRight is undeclared', () => {
    const ctx: ClientContext = {
      ...baseCtx(),
      get: () => undefined,
    };
    Object.defineProperty(ctx, 'sidebarRight', {
      get() {
        throw new Error('service "sidebarRight" is not declared by your plugin');
      },
    });
    openInterviewTab(ctx);
    expect(entrySurface.isOpen()).toBe(true);
    expect(entrySurface.error()).toBeNull();
  });

  it('still opens the overlay if probing sidebarRight throws', () => {
    openInterviewTab({
      ...baseCtx(),
      get: () => {
        throw new Error('service "sidebarRight" is not declared by your plugin');
      },
    });
    expect(entrySurface.isOpen()).toBe(true);
  });
});

describe('apply', () => {
  afterEach(() => {
    act(() => {
      entrySurface.close();
    });
  });

  it('still registers the input trigger when sidebarRightTabs inject is unavailable', async () => {
    const registered: string[] = [];
    await apply({
      ...baseCtx(),
      slots: {
        inject: (name, register) => {
          registered.push(name);
          register();
          return () => undefined;
        },
        register: () => undefined,
      },
      inject: () => {
        throw new Error('sidebarRightTabs is not provided');
      },
    });
    expect(registered).toContain('conversation.input.right');
    expect(registered).toContain('shell.overlay');
  });

  it('clicking 面试 shows the entry panel through shell.overlay', async () => {
    let Trigger: ComponentType | undefined;
    let Overlay: ComponentType | undefined;
    await apply({
      ...baseCtx(),
      get: () => undefined,
      slots: {
        inject: (_name, register) => {
          register();
          return () => undefined;
        },
        register: (meta, component) => {
          if (meta.name === 'conversation.input.right') {
            Trigger = component as ComponentType;
          }
          if (meta.name === 'shell.overlay') {
            Overlay = component as ComponentType;
          }
          return () => undefined;
        },
      },
    });
    expect(Trigger).toBeDefined();
    expect(Overlay).toBeDefined();
    render(
      createElement(
        'div',
        null,
        createElement(Trigger!),
        createElement(Overlay!),
      ),
    );
    expect(screen.queryByText('选择面试主题')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '面试' }));
    expect(screen.getByText('选择面试主题')).toBeDefined();
    expect(screen.getByRole('button', { name: '开始模拟面试' })).toBeDefined();
  });

  it('uses official openTab after sidebarRightTabs register succeeds', async () => {
    const opened: string[] = [];
    const sidebarRight = { openTab: (kind: string) => opened.push(kind) };
    const ctx: ClientContext = {
      ...baseCtx(),
      get: (key) => (key === 'sidebarRight' ? sidebarRight : undefined),
      slots: {
        inject: (_name, register) => {
          register();
          return () => undefined;
        },
        register: () => () => undefined,
      },
      inject: (services, callback) => {
        if (!services.includes('sidebarRightTabs')) {
          return undefined;
        }
        return callback({
          ...baseCtx(),
          get: (key) => (key === 'sidebarRight' ? sidebarRight : undefined),
          sidebarRightTabs: { register: () => () => undefined },
          slots: {
            inject: (_name, register) => {
              register();
              return () => undefined;
            },
            register: () => () => undefined,
          },
        });
      },
    };
    await apply(ctx);
    openInterviewTab(ctx);
    expect(opened).toEqual(['interview']);
    expect(entrySurface.isOpen()).toBe(false);
  });
});

describe('InterviewSlotPanel', () => {
  afterEach(() => {
    act(() => {
      entrySurface.close();
    });
  });

  it('renders nothing while closed', () => {
    const { container } = render(<InterviewSlotPanel port={createMemoryEntryPort()} />);
    expect(container.querySelector('[data-interview-entry-overlay]')).toBeNull();
  });

  it('renders the entry panel in the overlay when open', () => {
    entrySurface.open();
    render(<InterviewSlotPanel port={createMemoryEntryPort()} />);
    expect(screen.getByLabelText('面试')).toBeDefined();
    expect(screen.getByText('选择面试主题')).toBeDefined();
    expect(screen.getByRole('button', { name: '开始模拟面试' })).toBeDefined();
  });

  it('places 关闭 to the left of the title, not the right edge', () => {
    entrySurface.open();
    render(<InterviewSlotPanel port={createMemoryEntryPort()} />);
    const close = screen.getByRole('button', { name: '关闭' });
    const title = screen.getByRole('heading', { name: '模拟面试' });
    expect(close.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getAllByRole('button', { name: '关闭' })).toHaveLength(1);
  });

  it('renders a visible error dialog when opening fails', () => {
    entrySurface.fail('service "sidebarRight" is not declared by your plugin');
    render(<InterviewSlotPanel port={createMemoryEntryPort()} />);
    expect(screen.getByRole('alertdialog', { name: '无法打开模拟面试入口' })).toBeDefined();
    expect(
      screen.getByText('service "sidebarRight" is not declared by your plugin'),
    ).toBeDefined();
  });
});
