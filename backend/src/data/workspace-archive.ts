import {
  EXAM_LAYER_LABELS,
  INTERVIEW_SESSION_ERROR_MESSAGES,
  answerTurnLabel,
  answerTurnsOf,
  type ExamRoundIndex,
  type InterviewDeck,
  type LoadDeckRequest,
  type LoadDeckResponse,
} from 'interview-dsh-shared';
import type { ExamSessionStore } from './exam-session-store.js';

export type PersistFailure = {
  readonly ok: false;
  readonly code: 'persist_unavailable';
  readonly message: string;
};

export type WriteDeckResult =
  | { readonly ok: true; readonly archiveDir: string }
  | PersistFailure;

export type BeginRoundResult =
  | { readonly ok: true; readonly archiveDir: string; readonly round: number }
  | PersistFailure;

export type WriteRoundNotesResult =
  | { readonly ok: true; readonly qaPath: string; readonly summaryPath: string }
  | PersistFailure;

export interface WorkspaceArchive {
  writeDeck(deck: InterviewDeck): Promise<WriteDeckResult>;
  readDeck(sessionId: string): Promise<InterviewDeck | undefined>;
  beginRound?(
    sessionId: string,
    topic: string,
    options?: { forceNext?: boolean },
  ): Promise<BeginRoundResult>;
  markEnded?(sessionId: string, closingSeed: string): Promise<{ ok: true } | PersistFailure>;
  writeRoundNotes?(
    sessionId: string,
    notes: { readonly qa: string; readonly summary: string },
  ): Promise<WriteRoundNotesResult>;
  readRoundIndex?(sessionId: string): Promise<ExamRoundIndex | undefined>;
}

export const persistUnavailable = (): PersistFailure => ({
  ok: false,
  code: 'persist_unavailable',
  message: INTERVIEW_SESSION_ERROR_MESSAGES.persist_unavailable,
});

const ARCHIVE_SESSION_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

const RESERVED_ARCHIVE_SESSION_IDS = new Set(['config']);

export const sessionArchiveRoot = (sessionId: string): string | undefined => {
  if (
    !ARCHIVE_SESSION_ID.test(sessionId) ||
    sessionId.includes('..') ||
    RESERVED_ARCHIVE_SESSION_IDS.has(sessionId)
  ) {
    return undefined;
  }
  return `.dsh-interview/${sessionId}`;
};

export const topicSlug = (topic: string): string => {
  const slug = topic
    .trim()
    .replace(/[/\\]+/g, '-')
    .replace(/\.\./g, '')
    .replace(/\s+/g, '-')
    .replace(/[^\w\u4e00-\u9fff.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  return slug.length > 0 ? slug : 'round';
};

export const archiveDirFor = (sessionId: string, round = 1, topic = 'round'): string | undefined => {
  const root = sessionArchiveRoot(sessionId);
  if (root === undefined || !Number.isInteger(round) || round < 1) {
    return undefined;
  }
  return `${root}/round-${round}-${topicSlug(topic)}`;
};

export const isRoundArchiveDir = (sessionId: string, archiveDir: string): boolean => {
  const root = sessionArchiveRoot(sessionId);
  if (root === undefined || archiveDir.length === 0) {
    return false;
  }
  return archiveDir.startsWith(`${root}/round-`) && /\/round-\d+-/.test(archiveDir);
};

export const joinWorkspacePath = (cwd: string, rel: string): string =>
  `${cwd.replace(/[/\\]+$/, '')}/${rel.replace(/^[/\\]+/, '')}`;

export const renderCardMarkdown = (deck: InterviewDeck, cardId: string): string => {
  const card = deck.cards.find((item) => item.id === cardId);
  if (card === undefined) {
    return `# ${cardId}\n`;
  }
  const lines = [
    `# ${card.id}`,
    '',
    '## 题干',
    card.questionText,
    '',
    '## 开卷',
    card.questionBrief,
    ...card.keyPoints.map((point) => `- ${point}`),
    ...(card.layer !== undefined && card.intent !== undefined
      ? ['', '## 考察', EXAM_LAYER_LABELS[card.layer], card.intent]
      : []),
    '',
    '## 作答',
    ...(() => {
      const turns = answerTurnsOf(card);
      if (turns.length === 0) {
        return ['待作答'];
      }
      return turns.flatMap((turn, index) => [answerTurnLabel(index), turn]);
    })(),
    '',
    '## 对照',
    card.comparison === null
      ? '待对照'
      : [
          `已覆盖：${card.comparison.covered.join('；') || '无'}`,
          `未覆盖：${card.comparison.missed.join('；') || '无'}`,
          card.comparison.comment,
        ].join('\n'),
    '',
    '## 评分',
    ...card.scores.map((item) => `- ${item.dimension}：${item.score === null ? '—' : item.score}`),
    '',
  ];
  return lines.join('\n');
};

export const saveExamRecord = (
  examSessions: ExamSessionStore,
  deck: InterviewDeck,
  lastQuestionText: string,
  extras?: { ended?: boolean; closingSeed?: string; jevAccelerated?: boolean },
): void => {
  examSessions.save({
    sessionId: deck.sessionId,
    topic: deck.topic,
    difficulty: deck.difficulty,
    lastQuestionText,
    deck,
    ended: extras?.ended === true,
    ...(extras?.closingSeed !== undefined ? { closingSeed: extras.closingSeed } : {}),
    ...(extras?.jevAccelerated === true ? { jevAccelerated: true } : {}),
  });
};

export const loadDeckSession = async (
  examSessions: ExamSessionStore,
  request: LoadDeckRequest,
  archive?: WorkspaceArchive,
): Promise<LoadDeckResponse> => {
  const record = examSessions.load(request.sessionId);
  if (record !== undefined && record.ended !== true) {
    return { ok: true, deck: record.deck };
  }
  const disk = await archive?.readDeck(request.sessionId);
  if (disk !== undefined) {
    const last = disk.cards[disk.cards.length - 1];
    saveExamRecord(examSessions, disk, last?.questionText ?? '');
    return { ok: true, deck: disk };
  }
  return {
    ok: false,
    code: 'follow_up_failed',
    message: INTERVIEW_SESSION_ERROR_MESSAGES.follow_up_failed,
  };
};
