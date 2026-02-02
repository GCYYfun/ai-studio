/**
 * Interview Simulator Service
 * 
 * Core service that orchestrates the interview simulation between interviewer and candidate agents.
 * Based on the Python InterviewSimulator implementation.
 */

import { InterviewerAgent } from '../agents/InterviewerAgent';
import { CandidateAgent } from '../agents/CandidateAgent';
import { interviewResultManager } from './InterviewResultManager';
import type { 
  InterviewConfig, 
  InterviewContext, 
  ConversationMessage, 
  InterviewResult, 
  InterviewMetadata,
  InterviewEvent
} from '../types';
import { generateId } from '../types';

export interface SimulationOptions {
  maxTurns: number;
  verbose?: boolean;
  onMessage?: (message: ConversationMessage) => void;
  onProgress?: (turn: number, maxTurns: number) => void;
  onStatusChange?: (status: string) => void;
  onEvent?: (event: InterviewEvent) => void;
}

export class InterviewSimulator {
  private interviewer: InterviewerAgent;
  private candidate: CandidateAgent;
  private conversation: ConversationMessage[] = [];
  private metadata: InterviewMetadata;
  private sessionId: string;
  private isRunning = false;
  private shouldStop = false;
  private eventListeners: ((event: InterviewEvent) => void)[] = [];

  constructor(config: InterviewConfig) {
    this.sessionId = generateId('sim');
    this.interviewer = new InterviewerAgent(config.interviewerModel);
    this.candidate = new CandidateAgent(config.candidateModel);
    
    this.metadata = {
      candidateName: this.extractCandidateName(config.resume),
      position: this.extractPosition(config.jd),
      startTime: new Date(),
      totalTurns: 0,
      endedByInterviewer: false,
      config
    };
  }

  /**
   * Add event listener
   */
  addEventListener(listener: (event: InterviewEvent) => void): void {
    this.eventListeners.push(listener);
  }

  /**
   * Remove event listener
   */
  removeEventListener(listener: (event: InterviewEvent) => void): void {
    const index = this.eventListeners.indexOf(listener);
    if (index > -1) {
      this.eventListeners.splice(index, 1);
    }
  }

  /**
   * Emit event to all listeners
   */
  private emitEvent(type: InterviewEvent['type'], data: any): void {
    const event: InterviewEvent = {
      type,
      sessionId: this.sessionId,
      data,
      timestamp: new Date()
    };
    
    this.eventListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in event listener:', error);
      }
    });
  }

  /**
   * Run the interview simulation
   */
  async run(options: SimulationOptions): Promise<InterviewResult> {
    if (this.isRunning) {
      throw new Error('Interview simulation is already running');
    }

    this.isRunning = true;
    this.shouldStop = false;
    this.conversation = [];
    this.metadata.startTime = new Date();

    const { maxTurns, verbose = false, onMessage, onProgress, onStatusChange, onEvent } = options;

    // Add onEvent to event listeners if provided
    if (onEvent) {
      this.addEventListener(onEvent);
    }

    try {
      onStatusChange?.('starting');
      this.emitEvent('status_change', { status: 'starting' });
      
      const context: InterviewContext = {
        jd: this.metadata.config.jd,
        resume: this.metadata.config.resume,
        transcript: this.metadata.config.transcript
      };

      if (verbose) {
        console.log('Starting interview simulation...');
        console.log(`Max turns: ${maxTurns}`);
        console.log(`Interviewer model: ${this.metadata.config.interviewerModel}`);
        console.log(`Candidate model: ${this.metadata.config.candidateModel}`);
      }

      onStatusChange?.('running');
      this.emitEvent('status_change', { status: 'running' });

      // Main interview loop
      for (let turn = 0; turn < maxTurns && !this.shouldStop; turn++) {
        if (verbose) {
          console.log(`\n--- Turn ${turn + 1} ---`);
        }

        onProgress?.(turn + 1, maxTurns);
        this.emitEvent('progress', { turn: turn + 1, maxTurns });

        // Interviewer asks question
        const question = await this.interviewer.generateQuestion(context, this.conversation);
        
        // Check for end signal
        if (this.interviewer.isEndSignal(question)) {
          if (verbose) {
            console.log('Interviewer ended the interview');
          }
          this.metadata.endedByInterviewer = true;
          
          // Add final message without END_SIGNAL
          const cleanQuestion = question.replace(InterviewerAgent.END_SIGNAL, '').trim();
          if (cleanQuestion) {
            this.addMessage('interviewer', cleanQuestion, turn + 1);
            onMessage?.(this.conversation[this.conversation.length - 1]);
          }
          break;
        }

        // Add interviewer message
        this.addMessage('interviewer', question, turn + 1);
        const interviewerMessage = this.conversation[this.conversation.length - 1];
        onMessage?.(interviewerMessage);
        this.emitEvent('message', interviewerMessage);

        if (verbose) {
          console.log(`Interviewer: ${question}`);
        }

        // Check if we should stop
        if (this.shouldStop) break;

        // Candidate responds
        const answer = await this.candidate.generateAnswer(context, this.conversation);
        
        // Add candidate message
        this.addMessage('candidate', answer, turn + 1);
        const candidateMessage = this.conversation[this.conversation.length - 1];
        onMessage?.(candidateMessage);
        this.emitEvent('message', candidateMessage);

        if (verbose) {
          console.log(`Candidate: ${answer}`);
        }

        this.metadata.totalTurns = turn + 1;
      }

      this.metadata.endTime = new Date();
      onStatusChange?.('completed');
      this.emitEvent('status_change', { status: 'completed' });

      if (verbose) {
        console.log(`\nInterview completed after ${this.metadata.totalTurns} turns`);
        console.log(`Duration: ${this.getDuration()} minutes`);
      }

      // Auto-save the result
      await this.autoSaveResult();

      return this.buildResult('completed');

    } catch (error) {
      this.metadata.endTime = new Date();
      onStatusChange?.('error');
      this.emitEvent('error', { error: error instanceof Error ? error.message : String(error) });
      
      console.error('Interview simulation error:', error);
      return this.buildResult('error');
    } finally {
      this.isRunning = false;
      // Clean up event listener if it was added
      if (onEvent) {
        this.removeEventListener(onEvent);
      }
    }
  }

  /**
   * Run interview with streaming responses
   */
  async runWithStreaming(
    options: SimulationOptions & {
      onInterviewerChunk?: (content: string, isComplete: boolean) => void;
      onCandidateChunk?: (content: string, isComplete: boolean) => void;
    }
  ): Promise<InterviewResult> {
    if (this.isRunning) {
      throw new Error('Interview simulation is already running');
    }

    this.isRunning = true;
    this.shouldStop = false;
    this.conversation = [];
    this.metadata.startTime = new Date();

    const { 
      maxTurns, 
      verbose = false, 
      onMessage, 
      onProgress, 
      onStatusChange,
      onInterviewerChunk,
      onCandidateChunk,
      onEvent
    } = options;

    // Add onEvent to event listeners if provided
    if (onEvent) {
      this.addEventListener(onEvent);
    }

    try {
      onStatusChange?.('starting');
      
      const context: InterviewContext = {
        jd: this.metadata.config.jd,
        resume: this.metadata.config.resume,
        transcript: this.metadata.config.transcript
      };

      onStatusChange?.('running');
      this.emitEvent('status_change', { status: 'running' });

      // Main interview loop with streaming
      for (let turn = 0; turn < maxTurns && !this.shouldStop; turn++) {
        onProgress?.(turn + 1, maxTurns);
        this.emitEvent('progress', { turn: turn + 1, maxTurns });

        // Interviewer asks question with streaming
        let interviewerResponse = '';
        await this.interviewer.generateQuestionStreaming(
          context, 
          this.conversation,
          (content, isComplete) => {
            interviewerResponse += content;
            onInterviewerChunk?.(content, isComplete);
          }
        );

        // Check for end signal
        if (this.interviewer.isEndSignal(interviewerResponse)) {
          this.metadata.endedByInterviewer = true;
          const cleanQuestion = interviewerResponse.replace(InterviewerAgent.END_SIGNAL, '').trim();
          if (cleanQuestion) {
            this.addMessage('interviewer', cleanQuestion, turn + 1);
            onMessage?.(this.conversation[this.conversation.length - 1]);
          }
          break;
        }

        // Add interviewer message
        this.addMessage('interviewer', interviewerResponse, turn + 1);
        onMessage?.(this.conversation[this.conversation.length - 1]);

        if (this.shouldStop) break;

        // Candidate responds with streaming
        let candidateResponse = '';
        await this.candidate.generateAnswerStreaming(
          context,
          this.conversation,
          (content, isComplete) => {
            candidateResponse += content;
            onCandidateChunk?.(content, isComplete);
          }
        );

        // Add candidate message
        this.addMessage('candidate', candidateResponse, turn + 1);
        onMessage?.(this.conversation[this.conversation.length - 1]);

        this.metadata.totalTurns = turn + 1;
      }

      this.metadata.endTime = new Date();
      onStatusChange?.('completed');

      // Auto-save the result
      await this.autoSaveResult();

      return this.buildResult('completed');

    } catch (error) {
      this.metadata.endTime = new Date();
      onStatusChange?.('error');
      console.error('Interview simulation error:', error);
      return this.buildResult('error');
    } finally {
      this.isRunning = false;
      // Clean up event listener if it was added
      if (onEvent) {
        this.removeEventListener(onEvent);
      }
    }
  }

  /**
   * Stop the interview simulation
   */
  stop(): void {
    this.shouldStop = true;
  }

  /**
   * Get current session ID
   */
  getSessionId(): string {
    return this.sessionId;
  }

  /**
   * Get current conversation
   */
  getConversation(): ConversationMessage[] {
    return [...this.conversation];
  }

  /**
   * Get simulation metadata
   */
  getMetadata(): InterviewMetadata {
    return { ...this.metadata };
  }

  /**
   * Check if simulation is running
   */
  getIsRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Add message to conversation
   */
  private addMessage(role: 'interviewer' | 'candidate', content: string, turn: number): void {
    const message: ConversationMessage = {
      role,
      content,
      timestamp: new Date(),
      turn
    };
    this.conversation.push(message);
  }

  /**
   * Build final result
   */
  private buildResult(status: 'completed' | 'error' | 'interrupted'): InterviewResult {
    return {
      sessionId: this.sessionId,
      messages: [...this.conversation],
      metadata: { ...this.metadata },
      status
    };
  }

  /**
   * Extract candidate name from resume
   */
  private extractCandidateName(resume: string): string {
    // Simple extraction - look for common patterns
    const lines = resume.split('\n').slice(0, 5); // Check first 5 lines
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.includes('简历') && !trimmed.includes('Resume') && trimmed.length < 20) {
        return trimmed;
      }
    }
    return 'Unknown Candidate';
  }

  /**
   * Extract position from JD
   */
  private extractPosition(jd: string): string {
    // Simple extraction - look for position indicators
    const lines = jd.split('\n').slice(0, 10); // Check first 10 lines
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.includes('职位') || trimmed.includes('岗位') || trimmed.includes('Position')) {
        return trimmed;
      }
    }
    return 'Unknown Position';
  }

  /**
   * Get interview duration in minutes
   */
  private getDuration(): number {
    if (!this.metadata.endTime) return 0;
    const duration = this.metadata.endTime.getTime() - this.metadata.startTime.getTime();
    return Math.round(duration / 60000); // Convert to minutes
  }

  /**
   * Save current result to result manager
   */
  async saveCurrentResult(tags?: string[]): Promise<string> {
    const result = this.buildResult(this.isRunning ? 'interrupted' : 'completed');
    return await interviewResultManager.saveResult(result, tags);
  }

  /**
   * Auto-save result when interview completes
   */
  private async autoSaveResult(): Promise<void> {
    try {
      const result = this.buildResult('completed');
      await interviewResultManager.saveResult(result, ['auto-saved']);
      console.log('Interview result auto-saved');
    } catch (error) {
      console.warn('Failed to auto-save interview result:', error);
    }
  }
}