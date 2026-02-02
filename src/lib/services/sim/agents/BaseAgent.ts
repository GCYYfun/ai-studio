/**
 * Base Agent Class
 * 
 * Abstract base class for all AI agents in the interview system.
 * Provides common functionality for API integration and message handling.
 */

import type { Message, StreamingResponse } from '../types';
import { menglongApi } from '$lib/services/menglongApi';
import type { ChatRequest, ChatResponse } from '$lib/types';

export interface AgentConfig {
  name: string;
  role: string;
  model: string;
}

export abstract class BaseAgent {
  protected name: string;
  protected role: string;
  protected model: string;

  constructor(config: AgentConfig) {
    this.name = config.name;
    this.role = config.role;
    this.model = config.model;
  }

  /**
   * Generate a response using the MengLong API
   */
  protected async generateResponse(
    messages: Message[],
    systemPrompt: string
  ): Promise<string> {
    try {
      // Validate messages
      if (!this.validateMessages(messages)) {
        throw new Error('Invalid message format');
      }

      // Convert messages to API format
      const apiMessages = this.convertMessagesToApiFormat(messages, systemPrompt);

      // Prepare chat request - only include supported parameters
      const chatRequest: ChatRequest = {
        model: this.model,
        messages: apiMessages,
        stream: false
      };

      // Debug: Log the request
      console.log(`[${this.name}] API Request:`, JSON.stringify(chatRequest, null, 2));

      // Call MengLong API
      const response = await menglongApi.chat(chatRequest);

      if (!response.success) {
        // Provide more specific error messages
        const errorMsg = response.error || 'Unknown error';
        if (errorMsg.includes('API Key') || errorMsg.includes('401') || errorMsg.includes('Unauthorized')) {
          throw new Error('API Key无效或未配置，请检查API Key设置');
        } else if (errorMsg.includes('403') || errorMsg.includes('Forbidden')) {
          throw new Error('API访问被拒绝，请检查API Key权限');
        } else if (errorMsg.includes('429') || errorMsg.includes('rate limit')) {
          throw new Error('API请求频率超限，请稍后重试');
        } else if (errorMsg.includes('500') || errorMsg.includes('502') || errorMsg.includes('503')) {
          throw new Error('API服务暂时不可用，请稍后重试');
        } else {
          throw new Error(`API错误: ${errorMsg}`);
        }
      }

      // Extract content from response
      const content = response.data?.output?.content;
      if (!content) {
        throw new Error('API响应中没有内容');
      }

      // Handle both string and object formats
      // API may return {"text":"...","reasoning":null} or plain string
      let contentString: string;
      if (typeof content === 'string') {
        contentString = content;
      } else if (typeof content === 'object' && content !== null) {
        // Check if it's the new format with text and reasoning
        if ('text' in content) {
          contentString = (content as any).text;
          // Store reasoning if present for potential UI display
          const reasoning = (content as any).reasoning;
          if (reasoning) {
            // For now, we'll just log it - UI can be enhanced later to display it
            console.log(`[${this.name}] Reasoning:`, reasoning);
          }
        } else {
          contentString = JSON.stringify(content);
        }
      } else {
        contentString = String(content);
      }
      
      return contentString;
    } catch (error) {
      console.error(`Error in ${this.name} generateResponse:`, error);
      
      // Re-throw with more context
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`生成响应失败: ${String(error)}`);
    }
  }

  /**
   * Generate a streaming response using the MengLong API
   */
  protected async generateStreamingResponse(
    messages: Message[],
    systemPrompt: string,
    onChunk: (chunk: StreamingResponse) => void
  ): Promise<void> {
    try {
      // Validate messages
      if (!this.validateMessages(messages)) {
        throw new Error('Invalid message format');
      }

      // Convert messages to API format
      const apiMessages = this.convertMessagesToApiFormat(messages, systemPrompt);

      // Prepare chat request
      const chatRequest: ChatRequest = {
        model: this.model,
        messages: apiMessages,
        stream: true
      };

      let fullContent = '';

      // Call MengLong API with streaming
      await menglongApi.streamChat(
        chatRequest,
        (content: string) => {
          fullContent += content;
          const chunk: StreamingResponse = {
            content,
            isComplete: false
          };
          onChunk(chunk);
        },
        (usage?: any) => {
          // Stream completed
          const finalChunk: StreamingResponse = {
            content: '',
            isComplete: true
          };
          onChunk(finalChunk);
        },
        (error: string) => {
          // Stream error
          const errorChunk: StreamingResponse = {
            content: '',
            isComplete: true,
            error
          };
          onChunk(errorChunk);
        }
      );
    } catch (error) {
      console.error(`Error in ${this.name} generateStreamingResponse:`, error);
      const errorChunk: StreamingResponse = {
        content: '',
        isComplete: true,
        error: error instanceof Error ? error.message : String(error)
      };
      onChunk(errorChunk);
    }
  }

  /**
   * Convert internal message format to API format
   */
  private convertMessagesToApiFormat(messages: Message[], systemPrompt: string): any[] {
    const apiMessages = [];

    // Add system prompt
    if (systemPrompt) {
      apiMessages.push({
        role: 'system',
        content: systemPrompt
      });
    }

    // Convert messages - only include role and content (API format)
    for (const message of messages) {
      // Map internal roles to API roles
      let apiRole: 'system' | 'user' | 'assistant' = 'user';
      
      if (message.role === 'system') {
        apiRole = 'system';
      } else if (message.role === 'assistant') {
        apiRole = 'assistant';
      } else if (message.role === 'user') {
        apiRole = 'user';
      } else if (message.role === 'interviewer') {
        apiRole = 'assistant';
      } else if (message.role === 'candidate') {
        apiRole = 'user';
      }

      // Only include role and content - no extra fields like timestamp
      apiMessages.push({
        role: apiRole,
        content: message.content
      });
    }

    return apiMessages;
  }

  /**
   * Validate message format
   */
  protected validateMessages(messages: Message[]): boolean {
    return messages.every(msg => 
      msg.role && 
      msg.content && 
      typeof msg.content === 'string' &&
      msg.content.trim().length > 0
    );
  }

  /**
   * Clean JSON response by removing markdown code blocks
   */
  protected cleanJsonResponse(response: string): string {
    return response
      .replace(/```json\s*/g, '')
      .replace(/```/g, '')
      .trim();
  }

  /**
   * Parse JSON response with error handling
   */
  protected parseJsonResponse<T>(response: string): T {
    try {
      const cleaned = this.cleanJsonResponse(response);
      return JSON.parse(cleaned);
    } catch (error) {
      console.error(`Failed to parse JSON response from ${this.name}:`, response);
      throw new Error(`Invalid JSON response: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get agent information
   */
  public getInfo(): AgentConfig {
    return {
      name: this.name,
      role: this.role,
      model: this.model
    };
  }

  /**
   * Abstract method that must be implemented by subclasses
   */
  public abstract run(context: any, history: Message[]): Promise<string>;
}