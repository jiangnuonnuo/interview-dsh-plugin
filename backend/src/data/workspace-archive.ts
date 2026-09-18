import {
  INTERVIEW_SESSION_ERROR_MESSAGES,
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

export interface WorkspaceArchive {
  writeDeck(deck: InterviewDeck): Promise<WriteDeckResult>;
  readDeck(sessionId: string): Promise<InterviewDeck | undefined>;
}

export const persistUnavailable = (): PersistFailure => ({
  ok: false,
  code: 'persist_unavailable',
  message: INTERVIEW_SESSION_ERROR_MESSAGES.persist_unavailable,
});

export const topicSlug = (topic: string): string => {
  const slug = topic
    .trim()
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 48);
  return slug.length > 0 ? slug : 'interview';
};

export const archiveStamp = (at: Date): string => {
  const pad = (value: number): string => String(value).padStart(2, '0');
  return `${at.getFullYear()}${pad(at.getMonth() + 1)}${pad(at.getDate())}-${pad(at.getHours())}${pad(at.getMinutes())}`;
};

export const archiveDirFor = (topic: string, at: Date): string =>
  `study/interview-dsh/${archiveStamp(at)}-${topicSlug(topic)}`;

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
    '',
    '## 作答',
    card.answer ?? '待作答',
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
): void => {
  examSessions.save({
    sessionId: deck.sessionId,
    topic: deck.topic,
    difficulty: deck.difficulty,
    lastQuestionText,
    deck,
  });
};

export const loadDeckSession = async (
  examSessions: ExamSessionStore,
  request: LoadDeckRequest,
  archive?: WorkspaceArchive,
): Promise<LoadDeckResponse> => {
  const record = examSessions.load(request.sessionId);
  if (record !== undefined) {
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
