import { createElement, useSyncExternalStore } from 'react';
import { EntryPanel } from '../../features/entry/EntryPanel';
import type { EntryPort } from '../../features/entry/entry-port';
import {
  entrySurface,
  getEntrySurfaceError,
  getEntrySurfaceSnapshot,
} from './entry-surface';
import styles from './InterviewSlotPanel.module.css';

export const ENTRY_OVERLAY_ID = 'interview-dsh/entry-overlay';

export const InterviewSlotPanel = ({ port }: { port: EntryPort }) => {
  const open = useSyncExternalStore(
    entrySurface.subscribe,
    getEntrySurfaceSnapshot,
    getEntrySurfaceSnapshot,
  );
  const error = useSyncExternalStore(
    entrySurface.subscribe,
    getEntrySurfaceError,
    getEntrySurfaceError,
  );
  if (error !== null) {
    return createElement(
      'div',
      {
        className: styles.backdrop,
        'data-interview-entry-overlay': 'error',
        onClick: () => entrySurface.close(),
      },
      createElement(
        'div',
        {
          className: styles.dialog,
          role: 'alertdialog',
          'aria-modal': 'true',
          'aria-labelledby': 'interview-dsh-open-error-title',
          onClick: (event: { stopPropagation: () => void }) => event.stopPropagation(),
        },
        createElement(
          'h2',
          { id: 'interview-dsh-open-error-title', className: styles.title },
          '无法打开模拟面试入口',
        ),
        createElement('p', { className: styles.message }, error),
        createElement(
          'div',
          { className: styles.actions },
          createElement(
            'button',
            { type: 'button', className: styles.ack, onClick: () => entrySurface.close() },
            '知道了',
          ),
        ),
      ),
    );
  }
  if (!open) {
    return null;
  }
  return createElement(
    'aside',
    {
      className: styles.drawer,
      'aria-label': '面试',
      'data-interview-entry-overlay': 'true',
    },
    createElement(
      'div',
      { className: styles.body },
      createElement(EntryPanel, { port, onClose: () => entrySurface.close() }),
    ),
  );
};
