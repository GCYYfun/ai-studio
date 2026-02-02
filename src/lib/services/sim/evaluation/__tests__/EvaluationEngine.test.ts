/**
 * EvaluationEngine Tests
 * 
 * Tests for the evaluation engine service functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EvaluationEngine } from '../EvaluationEngine';
import type { ConversationMessage, InterviewContext, TopicAnalysisResult, EvaluationResult } from '../../types';

// Mock the EvalAgent
vi.mock('../../agents/EvalAgent', () => ({
  EvalAgent: vi.fn().mockImplementation(() => ({
    analyzeTopics: vi.fn(),
    evaluateInterview: vi.fn()
  }))
}));

describe('EvaluationEngine', () => {
  let evaluationEngine: EvaluationEngine;
  let mockEvalAgent: any;

  const mockTranscript: ConversationMessage[] = [
    {
      role: 'interviewer',
      content: '请介绍一下你自己',
      timestamp: new Date('2024-01-01T10:00:00Z'),
      turn: 1
    },
    {
      role: 'candidate',
      content: '我是一名软件工程师，有5年的开发经验',
      timestamp: new Date('2024-01-01T10:01:00Z'),
      turn: 1
    }
  ];

  const mockContext: InterviewContext = {
    jd: '招聘高级软件工程师',
    resume: '候选人简历内容',
    transcript: '面试记录'
  };

  const mockTopicAnalysis: TopicAnalysisResult = {
    analysis_date: '2024-01-01',
    topics: [
      {
        topic_name: '自我介绍',
        dialogue: [
          {
            role: 'interviewer',
            content: '请介绍一下你自己',
            name: '面试官',
            timestamp: '10:00:00'
          },
          {
            role: 'candidate',
            content: '我是一名软件工程师',
            name: '候选人',
            timestamp: '10:01:00'
          }
        ],
        summary: '候选人进行了基本的自我介绍',
        key_points: ['5年开发经验', '软件工程师背景'],
        critical_info: '经验丰富'
      }
    ],
    overall_summary: '面试开始阶段，候选人表现正常'
  };

  const mockEvaluation: EvaluationResult = {
    candidate_name: '张三',
    position: '高级软件工程师',
    evaluation_date: '2024-01-01',
    dimensions: {
      聪明度: {
        score: 75,
        assessment: '逻辑思维清晰',
        missing_info: '',
        confidence_score: 80,
        confidence_justification: '回答问题逻辑性强'
      },
      勤奋度: {
        score: 70,
        assessment: '工作态度积极',
        missing_info: '需要了解加班情况',
        confidence_score: 60,
        confidence_justification: '信息不够充分'
      },
      目标感: {
        score: 65,
        assessment: '有一定的职业规划',
        missing_info: '',
        confidence_score: 70,
        confidence_justification: '表达了明确的发展方向'
      },
      皮实度: {
        score: 60,
        assessment: '抗压能力一般',
        missing_info: '需要了解压力处理方式',
        confidence_score: 50,
        confidence_justification: '缺乏相关案例'
      },
      迎难而上: {
        score: 68,
        assessment: '愿意接受挑战',
        missing_info: '',
        confidence_score: 65,
        confidence_justification: '有相关经历分享'
      },
      客户第一: {
        score: 72,
        assessment: '有服务意识',
        missing_info: '',
        confidence_score: 75,
        confidence_justification: '提到了用户体验'
      }
    },
    overall_rating: 68,
    overall_confidence: 67,
    strengths: ['技术能力强', '沟通能力好'],
    weaknesses: ['抗压能力待提升', '需要更多挑战经历'],
    suggested_follow_up_questions: {
      '皮实度相关': '请分享一个在高压环境下工作的经历',
      '勤奋度相关': '你如何平衡工作和生活？'
    },
    summary: '候选人综合素质良好，技术能力符合要求',
    hiring_recommendation: '倾向录用'
  };

  beforeEach(() => {
    evaluationEngine = new EvaluationEngine();
    mockEvalAgent = (evaluationEngine as any).evalAgent;
  });

  describe('analyzeTopics', () => {
    it('should analyze topics successfully', async () => {
      mockEvalAgent.analyzeTopics.mockResolvedValue(mockTopicAnalysis);

      const result = await evaluationEngine.analyzeTopics(mockTranscript, mockContext);

      expect(result).toEqual(mockTopicAnalysis);
      expect(mockEvalAgent.analyzeTopics).toHaveBeenCalledWith(
        mockTranscript,
        mockContext,
        false
      );
    });

    it('should call analyzeTopics without extra parameters', async () => {
      mockEvalAgent.analyzeTopics.mockResolvedValue(mockTopicAnalysis);

      await evaluationEngine.analyzeTopics(mockTranscript, mockContext, {});

      expect(mockEvalAgent.analyzeTopics).toHaveBeenCalledWith(
        mockTranscript,
        mockContext
      );
    });

    it('should validate transcript format', async () => {
      const invalidTranscript = [
        { role: 'interviewer', content: '', timestamp: new Date(), turn: 1 }
      ] as ConversationMessage[];

      await expect(
        evaluationEngine.analyzeTopics(invalidTranscript, mockContext)
      ).rejects.toThrow('Invalid transcript format');
    });
  });

  describe('evaluateCapabilities', () => {
    it('should evaluate capabilities successfully', async () => {
      mockEvalAgent.evaluateInterview.mockResolvedValue(mockEvaluation);

      const result = await evaluationEngine.evaluateCapabilities(mockTranscript, mockContext);

      expect(result).toEqual(mockEvaluation);
      expect(mockEvalAgent.evaluateInterview).toHaveBeenCalledWith(
        mockTranscript,
        mockContext,
        '1',
        undefined,
        false
      );
    });

    it('should handle stage 2 evaluation', async () => {
      mockEvalAgent.evaluateInterview.mockResolvedValue(mockEvaluation);

      await evaluationEngine.evaluateCapabilities(mockTranscript, mockContext, {
        stage: '2',
        previousSummary: '一面表现良好'
      });

      expect(mockEvalAgent.evaluateInterview).toHaveBeenCalledWith(
        mockTranscript,
        mockContext,
        '2',
        '一面表现良好',
        false
      );
    });
  });

  describe('extractTopicInsights', () => {
    it('should extract topic insights correctly', () => {
      const insights = evaluationEngine.extractTopicInsights(mockTopicAnalysis);

      expect(insights).toEqual({
        totalTopics: 1,
        topicNames: ['自我介绍'],
        keyInsights: ['5年开发经验', '软件工程师背景'],
        criticalInfo: ['经验丰富'],
        dialogueCount: 2
      });
    });
  });

  describe('extractCapabilityInsights', () => {
    it('should extract capability insights correctly', () => {
      const insights = evaluationEngine.extractCapabilityInsights(mockEvaluation);

      expect(insights.averageScore).toBe(68.33);
      expect(insights.averageConfidence).toBe(66.67);
      expect(insights.topStrengths).toEqual(['技术能力强', '沟通能力好']);
      expect(insights.topWeaknesses).toEqual(['抗压能力待提升', '需要更多挑战经历']);
      expect(insights.followUpQuestions).toBe(2);
      expect(insights.recommendation).toBe('倾向录用');
    });
  });

  describe('generateTopicSummary', () => {
    it('should generate topic summary correctly', () => {
      const summary = evaluationEngine.generateTopicSummary(mockTopicAnalysis);

      expect(summary).toContain('总计 1 个主题');
      expect(summary).toContain('涵盖领域：自我介绍');
      expect(summary).toContain('对话轮次：2 轮');
      expect(summary).toContain('关键洞察：2 个要点');
      expect(summary).toContain('风险提示：1 个关键信息点');
    });
  });

  describe('generateCapabilitySummary', () => {
    it('should generate capability summary correctly', () => {
      const summary = evaluationEngine.generateCapabilitySummary(mockEvaluation);

      expect(summary).toContain('候选人：张三');
      expect(summary).toContain('职位：高级软件工程师');
      expect(summary).toContain('综合评分：68/100');
      expect(summary).toContain('录用建议：倾向录用');
    });
  });

  describe('calculateConfidenceLevels', () => {
    it('should calculate confidence levels correctly', () => {
      const levels = evaluationEngine.calculateConfidenceLevels(mockEvaluation);

      expect(levels.high).toEqual(['聪明度']);
      expect(levels.medium).toEqual(['勤奋度', '目标感', '迎难而上', '客户第一']);
      expect(levels.low).toEqual(['皮实度']);
    });
  });

  describe('generateFollowUpQuestions', () => {
    it('should generate follow-up questions for low confidence dimensions', () => {
      const questions = evaluationEngine.generateFollowUpQuestions(mockEvaluation);

      expect(questions).toHaveLength(3); // 勤奋度, 皮实度, and 迎难而上 have confidence < 70
      expect(questions.some(q => q.dimension === '勤奋度')).toBe(true);
      expect(questions.some(q => q.dimension === '皮实度')).toBe(true);
    });
  });
});