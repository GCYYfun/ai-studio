/**
 * Evaluation Engine Service
 * 
 * Core service that handles interview analysis including topic analysis and capability evaluation.
 * Based on the Python evaluator implementation.
 */

import { EvalAgent } from '../agents/EvalAgent';
import type { 
  TopicAnalysisResult, 
  EvaluationResult, 
  InterviewContext, 
  ConversationMessage
} from '../types';
import { generateId } from '../types';

export interface EvaluationOptions {
  step: 'all' | 'topic' | 'report';
  stage?: string;
  force?: boolean;
  temp?: boolean;
  onProgress?: (step: string, progress: number) => void;
  onStatusChange?: (status: string) => void;
}

export interface BatchEvaluationOptions extends EvaluationOptions {
  concurrency?: number;
  onItemComplete?: (index: number, total: number, result: any) => void;
}

export class EvaluationEngine {
  private evalAgent: EvalAgent;
  private processId: string;
  private isRunning = false;

  constructor(model = 'deepseek-chat') {
    this.processId = generateId('eval');
    this.evalAgent = new EvalAgent(model);
  }

  /**
   * Run complete evaluation (topic analysis + capability evaluation)
   */
  async evaluateInterview(
    transcript: ConversationMessage[] | string,
    context: InterviewContext,
    options: EvaluationOptions = { step: 'all' }
  ): Promise<{
    topicAnalysis?: TopicAnalysisResult;
    evaluation?: EvaluationResult;
    processId: string;
  }> {
    if (this.isRunning) {
      throw new Error('Evaluation is already running');
    }

    this.isRunning = true;
    const { step, stage = '1', onProgress, onStatusChange } = options;

    try {
      onStatusChange?.('starting');
      
      // Validate transcript upfront
      if (!this.validateTranscript(transcript)) {
        throw new Error('Invalid transcript format');
      }
      
      let topicAnalysis: TopicAnalysisResult | undefined;
      let evaluation: EvaluationResult | undefined;

      // Step 1: Topic Analysis
      if (step === 'all' || step === 'topic') {
        onStatusChange?.('analyzing_topics');
        onProgress?.('topic_analysis', 0);
        
        console.log('Running topic analysis...');
        topicAnalysis = await this.evalAgent.analyzeTopics(transcript, context);
        
        // Validate topic analysis result
        if (!this.validateTopicAnalysisResult(topicAnalysis)) {
          throw new Error('Invalid topic analysis result structure');
        }
        
        onProgress?.('topic_analysis', 100);
        console.log(`Topic analysis completed with ${topicAnalysis.topics.length} topics`);
      }

      // Step 2: Capability Evaluation
      if (step === 'all' || step === 'report') {
        onStatusChange?.('evaluating_capabilities');
        onProgress?.('capability_evaluation', 0);
        
        console.log('Running capability evaluation...');
        
        // Use topic analysis if available, otherwise use raw transcript
        const evaluationInput = topicAnalysis ? 
          this.formatTopicsForEvaluation(topicAnalysis) : 
          transcript;
        
        evaluation = await this.evalAgent.evaluateInterview(
          evaluationInput,
          context,
          stage,
          undefined
        );
        
        // Validate evaluation result
        if (!this.validateEvaluationResult(evaluation)) {
          throw new Error('Invalid evaluation result structure');
        }
        
        onProgress?.('capability_evaluation', 100);
        console.log(`Capability evaluation completed for ${evaluation.candidate_name}`);
      }

      onStatusChange?.('completed');

      return {
        topicAnalysis,
        evaluation,
        processId: this.processId
      };

    } catch (error) {
      onStatusChange?.('error');
      console.error('Evaluation error:', error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Run topic analysis only
   */
  async analyzeTopics(
    transcript: ConversationMessage[] | string,
    context: InterviewContext,
    options: Pick<EvaluationOptions, 'onProgress' | 'onStatusChange'> = {}
  ): Promise<TopicAnalysisResult> {
    const { onProgress, onStatusChange } = options;
    
    onStatusChange?.('analyzing_topics');
    onProgress?.('topic_analysis', 0);
    
    try {
      console.log('Starting topic analysis...');
      
      // Validate transcript
      if (!this.validateTranscript(transcript)) {
        throw new Error('Invalid transcript format');
      }

      const result = await this.evalAgent.analyzeTopics(transcript, context);
      
      // Validate result structure
      if (!this.validateTopicAnalysisResult(result)) {
        throw new Error('Invalid topic analysis result structure');
      }

      onProgress?.('topic_analysis', 100);
      onStatusChange?.('completed');
      
      console.log(`Topic analysis completed with ${result.topics.length} topics`);
      return result;
    } catch (error) {
      onStatusChange?.('error');
      console.error('Topic analysis error:', error);
      throw error;
    }
  }

  /**
   * Run capability evaluation only
   */
  async evaluateCapabilities(
    transcript: ConversationMessage[] | string,
    context: InterviewContext,
    options: Pick<EvaluationOptions, 'stage' | 'onProgress' | 'onStatusChange'> & {
      previousSummary?: string;
    } = {}
  ): Promise<EvaluationResult> {
    const { stage = '1', previousSummary, onProgress, onStatusChange } = options;
    
    onStatusChange?.('evaluating_capabilities');
    onProgress?.('capability_evaluation', 0);
    
    try {
      console.log('Starting capability evaluation...');
      
      // Validate transcript
      if (!this.validateTranscript(transcript)) {
        throw new Error('Invalid transcript format');
      }

      const result = await this.evalAgent.evaluateInterview(
        transcript,
        context,
        stage,
        previousSummary
      );
      
      // Validate result structure
      if (!this.validateEvaluationResult(result)) {
        throw new Error('Invalid evaluation result structure');
      }

      onProgress?.('capability_evaluation', 100);
      onStatusChange?.('completed');
      
      console.log(`Capability evaluation completed for ${result.candidate_name}`);
      return result;
    } catch (error) {
      onStatusChange?.('error');
      console.error('Capability evaluation error:', error);
      throw error;
    }
  }

  /**
   * Batch evaluation of multiple transcripts
   */
  async batchEvaluate(
    transcripts: Array<{
      transcript: ConversationMessage[] | string;
      context: InterviewContext;
      name: string;
    }>,
    options: BatchEvaluationOptions = { step: 'all' }
  ): Promise<Array<{
    name: string;
    topicAnalysis?: TopicAnalysisResult;
    evaluation?: EvaluationResult;
    error?: string;
  }>> {
    const { concurrency = 3, onItemComplete, onStatusChange } = options;
    
    onStatusChange?.('batch_processing');
    
    const results: Array<{
      name: string;
      topicAnalysis?: TopicAnalysisResult;
      evaluation?: EvaluationResult;
      error?: string;
    }> = [];

    // Process in batches to avoid overwhelming the API
    for (let i = 0; i < transcripts.length; i += concurrency) {
      const batch = transcripts.slice(i, i + concurrency);
      
      const batchPromises = batch.map(async (item, batchIndex) => {
        const globalIndex = i + batchIndex;
        try {
          const result = await this.evaluateInterview(
            item.transcript,
            item.context,
            { ...options, onProgress: undefined, onStatusChange: undefined }
          );
          
          const finalResult = {
            name: item.name,
            topicAnalysis: result.topicAnalysis,
            evaluation: result.evaluation
          };
          
          onItemComplete?.(globalIndex, transcripts.length, finalResult);
          return finalResult;
          
        } catch (error) {
          const errorResult = {
            name: item.name,
            error: error instanceof Error ? error.message : String(error)
          };
          
          onItemComplete?.(globalIndex, transcripts.length, errorResult);
          return errorResult;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    onStatusChange?.('completed');
    return results;
  }

  /**
   * Get current process ID
   */
  getProcessId(): string {
    return this.processId;
  }

  /**
   * Check if evaluation is running
   */
  getIsRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Format topic analysis results for capability evaluation
   */
  private formatTopicsForEvaluation(topicAnalysis: TopicAnalysisResult): string {
    let formattedContent = '';
    
    for (const topic of topicAnalysis.topics) {
      formattedContent += `## 主题: ${topic.topic_name}\n`;
      
      for (const msg of topic.dialogue) {
        const sender = msg.name || msg.role;
        const timestamp = msg.timestamp ? ` (${msg.timestamp})` : '';
        formattedContent += `${sender}${timestamp}: ${msg.content}\n`;
      }
      
      formattedContent += '\n\n';
    }
    
    return formattedContent;
  }

  /**
   * Validate transcript format
   */
  private validateTranscript(transcript: ConversationMessage[] | string): boolean {
    if (typeof transcript === 'string') {
      return transcript.trim().length > 0;
    }
    
    return Array.isArray(transcript) && 
           transcript.length > 0 && 
           transcript.every(msg => msg.role && msg.content);
  }

  /**
   * Validate topic analysis result structure
   */
  private validateTopicAnalysisResult(result: TopicAnalysisResult): boolean {
    return !!(
      result &&
      result.analysis_date &&
      Array.isArray(result.topics) &&
      result.topics.length > 0 &&
      result.topics.every(topic => 
        topic.topic_name &&
        Array.isArray(topic.dialogue) &&
        topic.summary &&
        Array.isArray(topic.key_points)
      ) &&
      result.overall_summary
    );
  }

  /**
   * Validate evaluation result structure
   */
  private validateEvaluationResult(result: EvaluationResult): boolean {
    const requiredDimensions = ['聪明度', '勤奋度', '目标感', '皮实度', '迎难而上', '客户第一'];
    
    return !!(
      result &&
      result.candidate_name &&
      result.position &&
      result.evaluation_date &&
      result.dimensions &&
      requiredDimensions.every(dim => 
        result.dimensions[dim as keyof typeof result.dimensions] &&
        typeof result.dimensions[dim as keyof typeof result.dimensions].score === 'number' &&
        result.dimensions[dim as keyof typeof result.dimensions].assessment
      ) &&
      typeof result.overall_rating === 'number' &&
      typeof result.overall_confidence === 'number' &&
      Array.isArray(result.strengths) &&
      Array.isArray(result.weaknesses) &&
      result.summary &&
      result.hiring_recommendation
    );
  }

  /**
   * Extract key information from topic analysis
   */
  extractTopicInsights(topicAnalysis: TopicAnalysisResult): {
    totalTopics: number;
    topicNames: string[];
    keyInsights: string[];
    criticalInfo: string[];
    dialogueCount: number;
  } {
    const topicNames = topicAnalysis.topics.map(topic => topic.topic_name);
    const keyInsights = topicAnalysis.topics.flatMap(topic => topic.key_points);
    const criticalInfo = topicAnalysis.topics
      .map(topic => topic.critical_info)
      .filter(info => info && info.trim().length > 0);
    
    const dialogueCount = topicAnalysis.topics.reduce(
      (total, topic) => total + topic.dialogue.length, 
      0
    );

    return {
      totalTopics: topicAnalysis.topics.length,
      topicNames,
      keyInsights,
      criticalInfo,
      dialogueCount
    };
  }

  /**
   * Generate topic analysis summary
   */
  generateTopicSummary(topicAnalysis: TopicAnalysisResult): string {
    const insights = this.extractTopicInsights(topicAnalysis);
    
    return `面试主题分析摘要：
- 总计 ${insights.totalTopics} 个主题
- 涵盖领域：${insights.topicNames.join('、')}
- 对话轮次：${insights.dialogueCount} 轮
- 关键洞察：${insights.keyInsights.length} 个要点
- 风险提示：${insights.criticalInfo.length} 个关键信息点

整体评价：${topicAnalysis.overall_summary}`;
  }

  /**
   * Extract capability insights from evaluation result
   */
  extractCapabilityInsights(evaluation: EvaluationResult): {
    averageScore: number;
    averageConfidence: number;
    topStrengths: string[];
    topWeaknesses: string[];
    dimensionScores: Array<{ dimension: string; score: number; confidence: number }>;
    followUpQuestions: number;
    recommendation: string;
  } {
    const dimensions = Object.entries(evaluation.dimensions);
    const scores = dimensions.map(([_, data]) => data.score);
    const confidences = dimensions.map(([_, data]) => data.confidence_score);
    
    const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const averageConfidence = confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length;
    
    const dimensionScores = dimensions.map(([dimension, data]) => ({
      dimension,
      score: data.score,
      confidence: data.confidence_score
    }));

    return {
      averageScore: Math.round(averageScore * 100) / 100,
      averageConfidence: Math.round(averageConfidence * 100) / 100,
      topStrengths: evaluation.strengths.slice(0, 3),
      topWeaknesses: evaluation.weaknesses.slice(0, 3),
      dimensionScores,
      followUpQuestions: Object.keys(evaluation.suggested_follow_up_questions).length,
      recommendation: evaluation.hiring_recommendation
    };
  }

  /**
   * Generate capability evaluation summary
   */
  generateCapabilitySummary(evaluation: EvaluationResult): string {
    const insights = this.extractCapabilityInsights(evaluation);
    
    const topDimensions = insights.dimensionScores
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(d => `${d.dimension}(${d.score}分)`)
      .join('、');
    
    const lowConfidenceDimensions = insights.dimensionScores
      .filter(d => d.confidence < 60)
      .map(d => d.dimension);

    return `六维能力评估摘要：
候选人：${evaluation.candidate_name}
职位：${evaluation.position}
综合评分：${evaluation.overall_rating}/100 (置信度: ${evaluation.overall_confidence}/100)

优势维度：${topDimensions}
主要优点：${insights.topStrengths.join('；')}
改进空间：${insights.topWeaknesses.join('；')}

${lowConfidenceDimensions.length > 0 ? 
  `需要进一步了解的维度：${lowConfidenceDimensions.join('、')}` : 
  '各维度信息较为充分'}
${insights.followUpQuestions > 0 ? 
  `建议追问 ${insights.followUpQuestions} 个问题` : 
  '无需额外追问'}

录用建议：${evaluation.hiring_recommendation}`;
  }

  /**
   * Calculate dimension confidence levels
   */
  calculateConfidenceLevels(evaluation: EvaluationResult): {
    high: string[];
    medium: string[];
    low: string[];
  } {
    const dimensions = Object.entries(evaluation.dimensions);
    
    const high: string[] = [];
    const medium: string[] = [];
    const low: string[] = [];
    
    dimensions.forEach(([dimension, data]) => {
      if (data.confidence_score >= 80) {
        high.push(dimension);
      } else if (data.confidence_score >= 60) {
        medium.push(dimension);
      } else {
        low.push(dimension);
      }
    });
    
    return { high, medium, low };
  }

  /**
   * Generate follow-up questions based on low confidence dimensions
   */
  generateFollowUpQuestions(evaluation: EvaluationResult): Array<{
    dimension: string;
    confidence: number;
    questions: string[];
    missingInfo: string;
  }> {
    const dimensions = Object.entries(evaluation.dimensions);
    
    return dimensions
      .filter(([_, data]) => data.confidence_score < 70 || data.missing_info)
      .map(([dimension, data]) => ({
        dimension,
        confidence: data.confidence_score,
        questions: Object.entries(evaluation.suggested_follow_up_questions)
          .filter(([key, _]) => key.includes(dimension))
          .map(([_, question]) => question),
        missingInfo: data.missing_info
      }));
  }

  /**
   * Generate comprehensive evaluation report
   */
  generateComprehensiveReport(
    topicAnalysis?: TopicAnalysisResult,
    evaluation?: EvaluationResult
  ): {
    summary: string;
    topicInsights?: {
      totalTopics: number;
      topicNames: string[];
      keyInsights: string[];
      criticalInfo: string[];
      dialogueCount: number;
    };
    capabilityInsights?: {
      averageScore: number;
      averageConfidence: number;
      topStrengths: string[];
      topWeaknesses: string[];
      dimensionScores: Array<{ dimension: string; score: number; confidence: number }>;
      followUpQuestions: number;
      recommendation: string;
    };
    recommendations: string[];
    followUpActions: string[];
  } {
    const recommendations: string[] = [];
    const followUpActions: string[] = [];
    
    let summary = '面试综合评估报告\n\n';
    
    let topicInsights: {
      totalTopics: number;
      topicNames: string[];
      keyInsights: string[];
      criticalInfo: string[];
      dialogueCount: number;
    } | undefined;
    let capabilityInsights: {
      averageScore: number;
      averageConfidence: number;
      topStrengths: string[];
      topWeaknesses: string[];
      dimensionScores: Array<{ dimension: string; score: number; confidence: number }>;
      followUpQuestions: number;
      recommendation: string;
    } | undefined;
    
    // Topic Analysis Section
    if (topicAnalysis) {
      topicInsights = this.extractTopicInsights(topicAnalysis);
      summary += this.generateTopicSummary(topicAnalysis) + '\n\n';
      
      if (topicInsights.criticalInfo.length > 0) {
        recommendations.push('关注面试中暴露的风险点');
        followUpActions.push('针对关键风险点进行深入追问');
      }
    }
    
    // Capability Evaluation Section
    if (evaluation) {
      capabilityInsights = this.extractCapabilityInsights(evaluation);
      summary += this.generateCapabilitySummary(evaluation) + '\n\n';
      
      const confidenceLevels = this.calculateConfidenceLevels(evaluation);
      
      if (confidenceLevels.low.length > 0) {
        recommendations.push(`进一步评估${confidenceLevels.low.join('、')}维度`);
        followUpActions.push('安排针对性的二面或技术面试');
      }
      
      if (capabilityInsights.averageScore >= 80) {
        recommendations.push('候选人综合素质优秀，建议优先考虑');
      } else if (capabilityInsights.averageScore >= 60) {
        recommendations.push('候选人基本符合要求，可考虑录用');
      } else {
        recommendations.push('候选人存在明显不足，建议谨慎考虑');
      }
    }
    
    // Combined Analysis
    if (topicAnalysis && evaluation) {
      const topicCoverage = topicInsights!.totalTopics;
      const avgConfidence = capabilityInsights!.averageConfidence;
      
      if (topicCoverage < 3) {
        followUpActions.push('面试覆盖面较窄，建议补充相关主题的深入交流');
      }
      
      if (avgConfidence < 70) {
        followUpActions.push('整体信息置信度偏低，建议进行补充面试');
      }
    }
    
    return {
      summary,
      topicInsights,
      capabilityInsights,
      recommendations,
      followUpActions
    };
  }

  /**
   * Extract metadata from transcript
   */
  extractMetadata(transcript: ConversationMessage[] | string): {
    messageCount: number;
    duration?: number;
    participantCount: number;
  } {
    if (typeof transcript === 'string') {
      const lines = transcript.split('\n').filter(line => line.trim());
      return {
        messageCount: lines.length,
        participantCount: 2 // Assume interviewer + candidate
      };
    }

    const participants = new Set(transcript.map(msg => msg.role));
    const firstMessage = transcript[0];
    const lastMessage = transcript[transcript.length - 1];
    
    let duration: number | undefined;
    if (firstMessage?.timestamp && lastMessage?.timestamp) {
      duration = lastMessage.timestamp.getTime() - firstMessage.timestamp.getTime();
    }

    return {
      messageCount: transcript.length,
      duration,
      participantCount: participants.size
    };
  }
}