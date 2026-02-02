/**
 * Candidate Agent
 * 
 * AI agent that acts as a job candidate, answering interview questions.
 * Based on the Python CandidateAgent implementation.
 */

import { BaseAgent } from './BaseAgent';
import type { Message, InterviewContext, ConversationMessage } from '../types';

export class CandidateAgent extends BaseAgent {
  constructor(model = 'global.anthropic.claude-sonnet-4-5-20250929-v1:0') {
    super({
      name: 'Candidate',
      role: 'candidate',
      model
    });
  }

  /**
   * Generate answer to interviewer's question
   */
  async generateAnswer(
    context: InterviewContext,
    history: ConversationMessage[]
  ): Promise<string> {
    const systemPrompt = this.buildSystemPrompt(context.resume, context.jd, context.transcript);
    const messages = this.convertHistory(history);

    return await this.generateResponse(messages, systemPrompt);
  }

  /**
   * Generate streaming answer response
   */
  async generateAnswerStreaming(
    context: InterviewContext,
    history: ConversationMessage[],
    onChunk: (content: string, isComplete: boolean) => void
  ): Promise<void> {
    const systemPrompt = this.buildSystemPrompt(context.resume, context.jd, context.transcript);
    const messages = this.convertHistory(history);

    await this.generateStreamingResponse(messages, systemPrompt, (chunk) => {
      onChunk(chunk.content, chunk.isComplete);
    });
  }

  /**
   * Build system prompt for the candidate
   */
  private buildSystemPrompt(resume: string, jd = '', transcript?: string): string {
    const basePrompt = `你是一位正在参加面试的候选人。你的背景和经历如下：

## 你的简历
${resume}

## 你正在应聘的岗位
${jd || '未提供岗位信息'}

## 回答要求
1. **真实自然**：基于你的简历内容回答，不要编造不存在的经历
2. **展示能力**：在回答中体现你的专业能力和经验
3. **具体详实**：用具体的例子和数据来支撑你的回答
4. **保持谦逊**：既要自信展示能力，也要表现出学习和成长的意愿
5. **适当发挥**：在简历基础上，可以合理补充细节，使回答更加完整

## 输出格式
直接回答问题即可，像真实面试一样自然地表达。`;

    if (transcript) {
      const transcriptPrompt = `

## 参考面试记录（Transcript）
以下是一份参考面试记录，你可以借鉴其中的回答思路和表达方式：

${transcript}

注意：
- 参考 Transcript 中的优秀表达和回答结构
- 但要根据你自己的简历内容来回答
- 保持回答的一致性和真实性`;

      return basePrompt + transcriptPrompt;
    }

    return basePrompt;
  }

  /**
   * Convert conversation history to message format
   */
  private convertHistory(history: ConversationMessage[]): Message[] {
    return history.map(msg => ({
      role: msg.role === 'candidate' ? 'assistant' : 'user',
      content: msg.content,
      timestamp: msg.timestamp
    }));
  }

  /**
   * Implementation of abstract run method
   */
  async run(context: InterviewContext, history: ConversationMessage[]): Promise<string> {
    return await this.generateAnswer(context, history);
  }
}