/**
 * Interviewer Agent
 * 
 * AI agent that acts as an interviewer, asking questions and controlling the interview flow.
 * Based on the Python InterviewerAgent implementation.
 */

import { BaseAgent } from './BaseAgent';
import type { Message, InterviewContext, ConversationMessage } from '../types';

export class InterviewerAgent extends BaseAgent {
  public static readonly END_SIGNAL = '[END_INTERVIEW]';

  constructor(model = 'global.anthropic.claude-sonnet-4-5-20250929-v1:0') {
    super({
      name: 'Interviewer',
      role: 'interviewer',
      model
    });
  }

  /**
   * Generate the next interview question
   */
  async generateQuestion(
    context: InterviewContext,
    history: ConversationMessage[]
  ): Promise<string> {
    const systemPrompt = this.buildSystemPrompt(context.jd, context.resume, context.transcript);
    const messages = this.convertHistory(history);

    // If history is empty, add a start signal
    if (messages.length === 0) {
      messages.push({
        role: 'user',
        content: '面试开始，请提出第一个问题。'
      });
    }

    return await this.generateResponse(messages, systemPrompt);
  }

  /**
   * Generate streaming question response
   */
  async generateQuestionStreaming(
    context: InterviewContext,
    history: ConversationMessage[],
    onChunk: (content: string, isComplete: boolean) => void
  ): Promise<void> {
    const systemPrompt = this.buildSystemPrompt(context.jd, context.resume, context.transcript);
    const messages = this.convertHistory(history);

    // If history is empty, add a start signal
    if (messages.length === 0) {
      messages.push({
        role: 'user',
        content: '面试开始，请提出第一个问题。'
      });
    }

    await this.generateStreamingResponse(messages, systemPrompt, (chunk) => {
      onChunk(chunk.content, chunk.isComplete);
    });
  }

  /**
   * Check if response contains end signal
   */
  isEndSignal(response: string): boolean {
    // Ensure response is a string
    const responseStr = typeof response === 'string' ? response : String(response);
    return responseStr.includes(InterviewerAgent.END_SIGNAL);
  }

  /**
   * Build system prompt for the interviewer
   */
  private buildSystemPrompt(jd: string, resume: string, transcript?: string): string {
    const basePrompt = `你是一位资深的技术面试官，正在根据岗位要求（JD）和候选人简历进行面试。

## 岗位要求（JD）
${jd}

## 候选人简历
${resume}

## 你的职责
1. **系统性考察**：根据 JD 要求，全面评估候选人的能力
2. **深入追问**：当候选人回答模糊或不充分时，追问细节
3. **灵活调整**：根据候选人的回答调整后续问题
4. **控制节奏**：合理分配时间，确保重点内容被充分考察

## 面试规则
- 每次只问一个问题
- 问题要具体、有针对性
- 追问要有深度，探索候选人的真实能力
- 当你认为已充分了解候选人时，输出 ${InterviewerAgent.END_SIGNAL} 结束面试

## 输出格式
直接输出你要问的问题，不需要额外格式。当面试结束时，先给出简短的结束语，然后输出 ${InterviewerAgent.END_SIGNAL}。`;

    if (transcript) {
      const transcriptPrompt = `

## 参考面试记录（Transcript）
以下是一份参考面试记录，你可以借鉴其中的提问思路和方向，但需要根据候选人的实际回答灵活调整：

${transcript}

注意：
- Transcript 仅作参考，不要完全照搬
- 根据候选人的回答灵活调整提问
- 如果候选人的回答与 Transcript 中不同，要针对性追问`;

      return basePrompt + transcriptPrompt;
    }

    return basePrompt;
  }

  /**
   * Convert conversation history to message format
   */
  private convertHistory(history: ConversationMessage[]): Message[] {
    return history.map(msg => ({
      role: msg.role === 'interviewer' ? 'assistant' : 'user',
      content: msg.content,
      timestamp: msg.timestamp
    }));
  }

  /**
   * Implementation of abstract run method
   */
  async run(context: InterviewContext, history: ConversationMessage[]): Promise<string> {
    return await this.generateQuestion(context, history);
  }
}