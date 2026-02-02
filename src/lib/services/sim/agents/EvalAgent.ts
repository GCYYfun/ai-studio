/**
 * Evaluation Agent
 * 
 * AI agent that analyzes interview transcripts and provides topic analysis and capability evaluation.
 * Based on the Python EvalAgent implementation.
 */

import { BaseAgent } from './BaseAgent';
import type { Message, TopicAnalysisResult, EvaluationResult, InterviewContext, ConversationMessage } from '../types';

export class EvalAgent extends BaseAgent {
  constructor(model = 'global.anthropic.claude-sonnet-4-5-20250929-v1:0') {
    super({
      name: 'Evaluator',
      role: 'evaluator',
      model
    });
  }

  /**
   * Analyze interview topics
   */
  async analyzeTopics(
    transcript: ConversationMessage[] | string,
    context: InterviewContext
  ): Promise<TopicAnalysisResult> {
    const transcriptText = this.formatTranscript(transcript);
    const systemPrompt = this.buildTopicAnalysisPrompt();

    const messages: Message[] = [{
      role: 'user',
      content: `这是面试记录:\n\n${transcriptText}\n\n请分析并拆分为若干个主题。`
    }];

    const response = await this.generateResponse(messages, systemPrompt);
    return this.parseJsonResponse<TopicAnalysisResult>(response);
  }

  /**
   * Evaluate interview performance
   */
  async evaluateInterview(
    transcript: ConversationMessage[] | string,
    context: InterviewContext,
    stage = '1',
    previousSummary?: string
  ): Promise<EvaluationResult> {
    const transcriptText = this.formatTranscript(transcript);
    const systemPrompt = this.buildEvaluationPrompt();

    let content: string;
    if (stage === '2' && previousSummary) {
      content = `现在是二面，这是一面的评价总结:\n${previousSummary}\n\n以下是面试的材料:\n\n职位描述（JD）:${context.jd}\n\n候选人简历(Resume):${context.resume}\n\n面试记录（Transcript）:\n\n${transcriptText}\n\n请生成评估JSON。`;
    } else {
      content = `以下是面试的材料:\n\n职位描述（JD）:${context.jd}\n\n候选人简历(Resume):${context.resume}\n\n面试记录（Transcript）:\n\n${transcriptText}\n\n请生成评估JSON。`;
    }

    const messages: Message[] = [{
      role: 'user',
      content
    }];

    const response = await this.generateResponse(messages, systemPrompt);
    return this.parseJsonResponse<EvaluationResult>(response);
  }

  /**
   * Build system prompt for topic analysis
   */
  private buildTopicAnalysisPrompt(): string {
    const currentDate = new Date().toISOString().split('T')[0];
    
    return `你是一位专业的面试分析师。请根据以下面试记录（Transcript），将面试过程拆分为若干个明确的对话主题（Topic）。

请输出严格的 JSON 格式，结构如下：
{
    "analysis_date": "${currentDate}",
    "topics": [
        {
            "topic_name": "主题名称（例如：自我介绍、技术深度考察、项目管理能力等）",
            "dialogue": [
                { "role": "interviewer", "content": "面试官的问题", "name": "面试官", "timestamp": "HH:MM:SS" },
                { "role": "candidate", "content": "候选人的回答", "name": "候选人", "timestamp": "HH:MM:SS" },
                ...
            ],
            "summary": "该主题的简要总结（1-2句）",
            "key_points": ["关键信息点1", "关键信息点2"],
            "critical_info": "此环节暴露出的核心优势或风险点"
        },
        ...
    ],
    "overall_summary": "整场面试的简要回顾"
}

注意：
1. 确保每一轮对话（问答对）都被归入某个主题。一个主题可以包含多个问答对。
2. 如果一个长问答包含多个主题，可以拆分，或者归入主要主题。
3. 不要遗漏任何主要对话内容。无用对话可以不归入主题。`;
  }

  /**
   * Build system prompt for evaluation
   */
  private buildEvaluationPrompt(): string {
    const currentDate = new Date().toISOString().split('T')[0];
    
    return `你是一位经验丰富且十分公正客观面试评估专家。
当前时间: ${currentDate}
请根据职位描述（JD）、候选人简历(Resume)和面试记录（Transcript）结合实际情况对候选人实事求是的进行客观辩证的深度评估。先定级,再打分。
你需要严格按照以下【核心验证标准】进行维度打分和评估，并参考【关键验证方法】判断信息是否充足，若不足则在报告中给出追问建议。同时，你需要给出置信度分数和置信度依据。

评估定级:(等级越高，要求越高，评高分越难)
初级: 应届毕业生，刚参加工作。
中级: 硕士工作经验满1年。本科工作经验满3年。
高级: 博士工作经验满1年。硕士满5年,本科工作经验满7年。
专家: 有极具特色或广泛被认可的个人的代表成果。

评分规则：(适用于所有维度和置信度)
1. 范围是0-100，100分代表最高水平。0代表不相关。
2. 60分代表及格水平。
3. 70-80分代表良好水平。
4. 80-90分代表优秀水平。
5. 90-100分代表卓越水平。

### 评估维度与标准

1. **聪明度**
   - **核心验证标准**：解题逻辑性（开放性问题解法是否成立）；底层理解力（能抓住问题本质）；迁移能力（能举一反三）。
   - **关键验证方法**：检查是否有开放性问题；追问逻辑链；验证举一反三能力。
   
2. **勤奋度**
   - **核心验证标准**：时间投入意愿（愿为关键任务付出）；持续行动证据（历史案例证明长期投入）。
   - **关键验证方法**：确认工作强度承受力；验证每日投入时长/超出常规的行动；交叉验证成果与投入的因果关系。
   
3. **目标感**
   - **核心验证标准**：目标坚持性（制定计划并持续行动）；抗阻行动（遇阻调整策略而非放弃）。
   - **关键验证方法**：追问为达成目标付出的持续努力；验证目标推进的关键证据。
   
4. **皮实度**
   - **核心验证标准**：抗压恢复力（受挫快速调整）；批评转化力（从否定中提取改进价值）。
   - **关键验证方法**：验证高压/受挫场景的具体案例；压力测试反应。
   
5. **迎难而上**
   - **核心验证标准**：挑战接纳度（积极接任务不推诿）；解决导向行动（主动拆解问题找方法，不糊弄）。
   - **关键验证方法**：验证主动承担高挑战任务案例；追问面对突发高难度任务的反应与优先级。
   
6. **客户第一**
   - **核心验证标准**：决策优先级（冲突时优先客户长期价值）；决策逻辑合理性（立足客户真实需求）。
   - **关键验证方法**：测试利益冲突场景（如KPI vs 客户利益）；追问选择背后的逻辑是否自洽。

### 置信度评分标准
置信度：置信度的目的是衡量维度评分的可靠性。
（1）通过与维度相关的问题的数量、多样性和深度评估对话在各维度上的覆盖广度和深度。
（2）通过与维度相关的回答的句子长度、长度占比以及语义相关度评估对话在各维度上的相关度与专注度。
综合以上两位方面的信息进行置信度的评分。

请输出严格的 JSON 格式，不要包含 Markdown 代码块标记。JSON 结构如下：
{
    "candidate_name": "从简历或对话中提取",
    "position": "JD中的职位名称",
    "evaluation_date": "${currentDate}",
    "dimensions": {
        "聪明度": { "score": 1-100, "assessment": "评估理由及依据,备注依据(主题)", "missing_info": "是否缺失需要核心验证的信息", "confidence_score": 1-100,"confidence_justification": "置信度评分的依据" },
        "勤奋度": { "score": 1-100, "assessment": "...", "missing_info": "...", "confidence_score": 1-100,"confidence_justification": "..." },
        "目标感": { "score": 1-100, "assessment": "...", "missing_info": "...", "confidence_score": 1-100,"confidence_justification": "..." },
        "皮实度": { "score": 1-100, "assessment": "...", "missing_info": "...", "confidence_score": 1-100,"confidence_justification": "..." },
        "迎难而上": { "score": 1-100, "assessment": "...", "missing_info": "...", "confidence_score": 1-100,"confidence_justification": "..." },
        "客户第一": { "score": 1-100, "assessment": "...", "missing_info": "...", "confidence_score": 1-100,"confidence_justification": "..." }
    },
    "overall_rating": 1-100,
    "overall_confidence": 1-100,
    "strengths": ["...", "..."],
    "weaknesses": ["...", "..."],
    "interviewer_rating_assessment":"对面试官的本场表现的评价。",
    "interviewer_rating":"面试官的本场表现分数",
    "suggested_follow_up_questions": {"针对哪个维度的哪个缺失信息的追问1": "追问内容", "针对哪个维度的哪个缺失信息的追问2": "追问内容",...},
    "summary": "整体评价总结",
    "hiring_recommendation": "倾向录用/倾向不录用/强烈推荐录用/追面"
}`;
  }

  /**
   * Format transcript for analysis
   */
  private formatTranscript(transcript: ConversationMessage[] | string): string {
    if (typeof transcript === 'string') {
      return transcript;
    }

    return transcript
      .map(msg => `${msg.role.toUpperCase()}: ${msg.content}`)
      .join('\n');
  }

  /**
   * Enhanced JSON response cleaning
   */
  protected cleanJsonResponse(response: string): string {
    // Remove markdown code blocks
    let cleaned = response
      .replace(/```json\s*/g, '')
      .replace(/```/g, '')
      .trim();

    // Remove any leading/trailing text that's not JSON
    const jsonStart = cleaned.indexOf('{');
    const jsonEnd = cleaned.lastIndexOf('}');
    
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      cleaned = cleaned.substring(jsonStart, jsonEnd + 1);
    }

    // Fix common JSON formatting issues
    cleaned = cleaned
      .replace(/,\s*}/g, '}')  // Remove trailing commas
      .replace(/,\s*]/g, ']')  // Remove trailing commas in arrays
      .replace(/\n/g, ' ')     // Replace newlines with spaces
      .replace(/\s+/g, ' ')    // Normalize whitespace
      .trim();

    return cleaned;
  }

  /**
   * Parse JSON response with enhanced error handling
   */
  protected parseJsonResponse<T>(response: string): T {
    try {
      const cleaned = this.cleanJsonResponse(response);
      
      if (!cleaned) {
        throw new Error('Empty response after cleaning');
      }

      const parsed = JSON.parse(cleaned);
      
      // Validate the parsed result has expected structure
      if (typeof parsed !== 'object' || parsed === null) {
        throw new Error('Parsed result is not an object');
      }

      return parsed as T;
    } catch (error) {
      console.error(`Failed to parse JSON response from ${this.name}:`, {
        original: response,
        cleaned: this.cleanJsonResponse(response),
        error: error instanceof Error ? error.message : String(error)
      });
      
      throw new Error(`Invalid JSON response from ${this.name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Implementation of abstract run method
   */
  async run(_context: any, _history: ConversationMessage[]): Promise<string> {
    // This is a generic run method - specific methods should be used instead
    throw new Error('Use specific methods: analyzeTopics() or evaluateInterview()');
  }
}