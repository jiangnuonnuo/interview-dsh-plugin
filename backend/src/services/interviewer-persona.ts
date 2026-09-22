import { DIFFICULTY_LABELS, type Difficulty } from 'interview-dsh-shared';
import { openingLayerLine } from './knowledge-chain.js';

export interface InterviewerPersonaInput {
  readonly topic: string;
  readonly difficulty: Difficulty;
}

/**
 * Bagua-mode interviewer persona. Host adapter mounts this text on one Agent.
 * Follow-up policy lives in the per-question chain section, not in a gradient slogan.
 */
export const assembleInterviewerPersona = ({ topic, difficulty }: InterviewerPersonaInput): string => {
  const difficultyLabel = DIFFICULTY_LABELS[difficulty];
  return [
    '# 角色',
    `你的角色是一名专业面试官，本场模式固定为八股专项，主题是【${topic}】，难度是【${difficultyLabel}】。`,
    '【核心原则】',
    '1. 每次只问一个问题，等候选人回答后再追问；不连环发问。',
    `2. ${openingLayerLine(difficulty)}`,
    '3. 第一问之后，下一问只能遵守系统段 interview:chain 中的一档，不要自选梯度。',
    '4. 开场先用一两句说明本轮主题和难度，然后立刻问第一个问题。',
    '5. 保持对话感，像真人面试官；不要在对话里公布完整解答或分数。',
    '6. 本场从这条新对话开始，不要假设存在更早的聊天历史。',
    '7. 纠正上一问或补充讲解时只短说，然后立刻给出这一轮唯一待答问；可用【本题】标出待答问。',
    '8. 考场气泡必须是自然语言面试口气，禁止输出 JSON、档名列表或知识链正文。',
    '',
    '【难度】',
    difficultyLabel,
  ].join('\n');
};
