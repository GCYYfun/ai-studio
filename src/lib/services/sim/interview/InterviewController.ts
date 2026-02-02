/**
 * Interview Controller Service
 * 
 * Handles interview simulation control, progress monitoring, and result management.
 * Integrates with AI agents and provides real-time status updates.
 */

import type { 
  InterviewConfig, 
  InterviewSession, 
  ConversationMessage, 
  InterviewResult,
  InterviewMetadata,
  InterviewEvent
} from '../types';
import { generateId } from '../types';
import { InterviewSimulator } from './InterviewSimulator';
import { InterviewResultManager, type ExportOptions } from './InterviewResultManager';

export interface ControllerOptions {
  enableRealTimeUpdates?: boolean;
  autoSave?: boolean;
  maxRetries?: number;
}

export interface SimulationProgress {
  currentTurn: number;
  totalTurns: number;
  progress: number; // 0-1
  estimatedTimeRemaining?: number;
  status: 'idle' | 'running' | 'paused' | 'completed' | 'error';
}

export interface ControllerState {
  session: InterviewSession | null;
  simulator: InterviewSimulator | null;
  progress: SimulationProgress;
  lastError: Error | null;
}

/**
 * Main controller for interview simulation
 */
export class InterviewController {
  private state: ControllerState;
  private options: ControllerOptions;
  private resultManager: InterviewResultManager;
  private eventListeners: Map<string, (event: InterviewEvent) => void> = new Map();
  private simulationTimer: NodeJS.Timeout | null = null;
  private pausedAt: Date | null = null;

  constructor(options: ControllerOptions = {}) {
    this.options = {
      enableRealTimeUpdates: true,
      autoSave: true,
      maxRetries: 3,
      ...options
    };

    this.state = {
      session: null,
      simulator: null,
      progress: {
        currentTurn: 0,
        totalTurns: 0,
        progress: 0,
        status: 'idle'
      },
      lastError: null
    };

    this.resultManager = new InterviewResultManager();
  }

  /**
   * Initialize a new interview session
   */
  async initializeSession(config: InterviewConfig): Promise<InterviewSession> {
    try {
      // Validate configuration
      this.validateConfig(config);

      // Create new session
      const sessionId = generateId('session');
      const session: InterviewSession = {
        sessionId,
        status: 'idle',
        messages: [],
        config,
        startTime: new Date()
      };

      // Initialize simulator
      const simulator = new InterviewSimulator(config);
      // Note: InterviewSimulator doesn't have an initialize method, it's ready to use

      // Update state
      this.state.session = session;
      this.state.simulator = simulator;
      this.state.progress = {
        currentTurn: 0,
        totalTurns: config.maxTurns,
        progress: 0,
        status: 'idle'
      };
      this.state.lastError = null;

      this.emitEvent('status_change', { session, status: 'idle' });

      return session;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.state.lastError = err;
      throw err;
    }
  }

  /**
   * Start the interview simulation
   */
  async startSimulation(): Promise<void> {
    if (!this.state.session || !this.state.simulator) {
      throw new Error('No active session. Call initializeSession first.');
    }

    if (this.state.session.status === 'running') {
      throw new Error('Simulation is already running');
    }

    try {
      // Update status
      this.state.session.status = 'running';
      this.state.progress.status = 'running';
      this.pausedAt = null;

      this.emitEvent('status_change', { 
        session: this.state.session, 
        status: 'running' 
      });

      // Start simulation
      await this.runSimulationLoop();

    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.state.lastError = err;
      this.state.session.status = 'error';
      this.state.progress.status = 'error';
      
      this.emitEvent('error', { 
        session: this.state.session, 
        error: err 
      });
      
      throw err;
    }
  }

  /**
   * Pause the simulation
   */
  pauseSimulation(): void {
    if (!this.state.session) {
      throw new Error('No active session');
    }

    if (this.state.session.status !== 'running') {
      throw new Error('Simulation is not running');
    }

    this.state.session.status = 'paused';
    this.state.progress.status = 'paused';
    this.pausedAt = new Date();

    if (this.simulationTimer) {
      clearTimeout(this.simulationTimer);
      this.simulationTimer = null;
    }

    this.emitEvent('status_change', { 
      session: this.state.session, 
      status: 'paused' 
    });
  }

  /**
   * Resume the simulation
   */
  async resumeSimulation(): Promise<void> {
    if (!this.state.session) {
      throw new Error('No active session');
    }

    if (this.state.session.status !== 'paused') {
      throw new Error('Simulation is not paused');
    }

    this.state.session.status = 'running';
    this.state.progress.status = 'running';
    this.pausedAt = null;

    this.emitEvent('status_change', { 
      session: this.state.session, 
      status: 'running' 
    });

    // Continue simulation
    await this.runSimulationLoop();
  }

  /**
   * Stop the simulation
   */
  async stopSimulation(): Promise<InterviewResult> {
    if (!this.state.session) {
      throw new Error('No active session');
    }

    // Clear any running timers
    if (this.simulationTimer) {
      clearTimeout(this.simulationTimer);
      this.simulationTimer = null;
    }

    // Update status
    this.state.session.status = 'completed';
    this.state.session.endTime = new Date();
    this.state.progress.status = 'completed';
    this.state.progress.progress = 1;

    this.emitEvent('status_change', { 
      session: this.state.session, 
      status: 'completed' 
    });

    // Generate result
    const result = await this.generateResult();

    // Auto-save if enabled
    if (this.options.autoSave) {
      await this.saveResult(result);
    }

    return result;
  }

  /**
   * Get current session
   */
  getCurrentSession(): InterviewSession | null {
    return this.state.session;
  }

  /**
   * Get current progress
   */
  getProgress(): SimulationProgress {
    return { ...this.state.progress };
  }

  /**
   * Get current state
   */
  getState(): ControllerState {
    return { ...this.state };
  }

  /**
   * Save simulation result
   */
  async saveResult(result: InterviewResult, options: ExportOptions = { format: 'json' }): Promise<void> {
    await this.resultManager.saveResult(result);
  }

  /**
   * Export simulation result
   */
  async exportResult(options: ExportOptions = { format: 'json' }): Promise<string> {
    if (!this.state.session) {
      throw new Error('No active session to export');
    }

    const result = await this.generateResult();
    return this.resultManager.exportResult(result, options);
  }

  /**
   * Add event listener
   */
  addEventListener(eventType: string, listener: (event: InterviewEvent) => void): void {
    this.eventListeners.set(eventType, listener);
  }

  /**
   * Remove event listener
   */
  removeEventListener(eventType: string): void {
    this.eventListeners.delete(eventType);
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.simulationTimer) {
      clearTimeout(this.simulationTimer);
      this.simulationTimer = null;
    }

    this.eventListeners.clear();
    this.state.session = null;
    this.state.simulator = null;
    this.state.progress.status = 'idle';
  }

  /**
   * Private methods
   */

  private async runSimulationLoop(): Promise<void> {
    if (!this.state.session || !this.state.simulator) {
      throw new Error('Invalid state for simulation');
    }

    const session = this.state.session;
    const simulator = this.state.simulator;

    try {
      while (
        session.status === 'running' && 
        session.messages.length < session.config.maxTurns
      ) {
        // Generate next message
        const message = await this.generateNextMessage();
        
        if (!message) {
          // End of conversation
          break;
        }

        // Add message to session
        session.messages.push(message);

        // Update progress
        this.updateProgress();

        // Emit message event
        this.emitEvent('message', { 
          session, 
          message 
        });

        // Add delay between messages for realistic timing
        await this.delay(1000 + Math.random() * 2000);

        // Check if we should continue
        if (session.status !== 'running') {
          break;
        }
      }

      // Complete simulation if we reached the end naturally
      if (session.status === 'running') {
        await this.stopSimulation();
      }

    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.state.lastError = err;
      session.status = 'error';
      this.state.progress.status = 'error';
      
      this.emitEvent('error', { session, error: err });
      throw err;
    }
  }

  private async generateNextMessage(): Promise<ConversationMessage | null> {
    if (!this.state.session || !this.state.simulator) {
      return null;
    }

    const session = this.state.session;
    const currentTurn = session.messages.length + 1;
    const isInterviewerTurn = currentTurn % 2 === 1; // Odd turns are interviewer

    try {
      let content: string;
      let thinking: string | undefined;

      const context = {
        jd: session.config.jd,
        resume: session.config.resume,
        transcript: session.config.transcript
      };

      if (isInterviewerTurn) {
        // Use the InterviewSimulator's interviewer agent
        content = await this.state.simulator['interviewer'].generateQuestion(context, session.messages);
        
        // Check for end signal using the interviewer agent's method
        if (this.state.simulator['interviewer'].isEndSignal(content)) {
          return null; // End conversation
        }
      } else {
        // Use the InterviewSimulator's candidate agent
        content = await this.state.simulator['candidate'].generateAnswer(context, session.messages);
      }

      const message: ConversationMessage = {
        role: isInterviewerTurn ? 'interviewer' : 'candidate',
        content,
        timestamp: new Date(),
        turn: currentTurn,
        thinking
      };

      return message;

    } catch (error) {
      console.error('Failed to generate message:', error);
      throw error;
    }
  }

  private updateProgress(): void {
    if (!this.state.session) return;

    const currentTurn = this.state.session.messages.length;
    const totalTurns = this.state.session.config.maxTurns;
    const progress = Math.min(currentTurn / totalTurns, 1);

    this.state.progress = {
      currentTurn,
      totalTurns,
      progress,
      status: this.state.progress.status,
      estimatedTimeRemaining: this.calculateEstimatedTime()
    };

    this.emitEvent('progress', { 
      session: this.state.session, 
      progress: this.state.progress 
    });
  }

  private calculateEstimatedTime(): number | undefined {
    if (!this.state.session || this.state.session.messages.length === 0) {
      return undefined;
    }

    const elapsed = Date.now() - this.state.session.startTime.getTime();
    const averageTimePerTurn = elapsed / this.state.session.messages.length;
    const remainingTurns = this.state.session.config.maxTurns - this.state.session.messages.length;
    
    return remainingTurns * averageTimePerTurn;
  }

  private async generateResult(): Promise<InterviewResult> {
    if (!this.state.session) {
      throw new Error('No active session');
    }

    const session = this.state.session;
    const metadata: InterviewMetadata = {
      candidateName: this.extractCandidateName(),
      position: this.extractPosition(),
      startTime: session.startTime,
      endTime: session.endTime || new Date(),
      totalTurns: session.messages.length,
      endedByInterviewer: this.checkIfEndedByInterviewer(),
      config: session.config
    };

    const result: InterviewResult = {
      sessionId: session.sessionId,
      messages: [...session.messages],
      metadata,
      status: session.status === 'error' ? 'error' : 
              session.status === 'completed' ? 'completed' : 'interrupted'
    };

    return result;
  }

  private extractCandidateName(): string {
    // Try to extract from resume content or messages
    if (this.state.session?.config.resume) {
      const resumeMatch = this.state.session.config.resume.match(/姓名[:：]\s*([^\n\r]+)/);
      if (resumeMatch) {
        return resumeMatch[1].trim();
      }
    }

    // Try to extract from candidate messages
    for (const message of this.state.session?.messages || []) {
      if (message.role === 'candidate') {
        const nameMatch = message.content.match(/我[是叫]\s*([^\s，。]+)/);
        if (nameMatch) {
          return nameMatch[1];
        }
      }
    }

    return 'Unknown Candidate';
  }

  private extractPosition(): string {
    if (this.state.session?.config.jd) {
      const positionMatch = this.state.session.config.jd.match(/职位[:：]\s*([^\n\r]+)/);
      if (positionMatch) {
        return positionMatch[1].trim();
      }
    }
    return 'Unknown Position';
  }

  private checkIfEndedByInterviewer(): boolean {
    const messages = this.state.session?.messages || [];
    if (messages.length === 0) return false;
    
    const lastMessage = messages[messages.length - 1];
    return lastMessage.role === 'interviewer';
  }

  private validateConfig(config: InterviewConfig): void {
    if (!config.jd || config.jd.trim().length === 0) {
      throw new Error('JD content is required');
    }

    if (!config.resume || config.resume.trim().length === 0) {
      throw new Error('Resume content is required');
    }

    if (config.maxTurns <= 0 || config.maxTurns > 100) {
      throw new Error('Max turns must be between 1 and 100');
    }

    if (!config.interviewerModel || !config.candidateModel) {
      throw new Error('Both interviewer and candidate models are required');
    }
  }

  private emitEvent(type: string, data: any): void {
    const event: InterviewEvent = {
      type: type as any,
      sessionId: this.state.session?.sessionId || '',
      data,
      timestamp: new Date()
    };

    const listener = this.eventListeners.get(type);
    if (listener) {
      try {
        listener(event);
      } catch (error) {
        console.error('Event listener error:', error);
      }
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => {
      this.simulationTimer = setTimeout(resolve, ms);
    });
  }
}