# Agent API 请求格式修复总结

## 问题描述

interview-sim 的 agent 在调用 menglong API 时请求格式不正确，与 playground 中验证过的格式不一致。

## 根本原因

1. **不支持的参数**: Agent 在调用 API 时添加了 `thinking` 参数，但该参数不在 MengLong API 的标准参数列表中
2. **类型定义不匹配**: `ChatRequest` 类型定义包含了 `thinking?: boolean` 字段，但 API 文档中没有这个参数
3. **额外字段传递**: Message 对象包含 `timestamp` 等额外字段，这些字段被传递给 API 导致验证失败
4. **错误的模型名称**: 模型名称错误地包含了 `menglong/` 前缀（例如 `menglong/deepseek-chat`），但 API 不接受这个前缀

## 修复内容

### 1. 移除 `thinking` 参数 ✅

**文件**: `src/lib/types/index.ts`

```typescript
// 修复前
export interface ChatRequest {
  model: string;
  messages: Message[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  thinking?: boolean;  // ❌ 不支持的参数
}

// 修复后
export interface ChatRequest {
  model: string;
  messages: Message[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}
```

### 2. 更新 BaseAgent 实现 ✅

**文件**: `src/lib/services/sim/agents/BaseAgent.ts`

```typescript
// 修复前
protected async generateResponse(
  messages: Message[],
  systemPrompt: string,
  thinking = false  // ❌ 不支持的参数
): Promise<string> {
  const chatRequest: ChatRequest = {
    model: this.model,
    messages: apiMessages,
    stream: false,
    thinking  // ❌ 传递不支持的参数
  };
}

// 修复后
protected async generateResponse(
  messages: Message[],
  systemPrompt: string
): Promise<string> {
  const chatRequest: ChatRequest = {
    model: this.model,
    messages: apiMessages,
    stream: false
  };
}
```

### 3. 修复消息格式转换 ✅

**关键修复**: 确保只传递 API 需要的字段（`role` 和 `content`），不传递额外字段如 `timestamp`

```typescript
// 修复后 - 只包含必需字段
private convertMessagesToApiFormat(messages: Message[], systemPrompt: string): any[] {
  const apiMessages = [];
  
  if (systemPrompt) {
    apiMessages.push({
      role: 'system',
      content: systemPrompt
    });
  }
  
  for (const message of messages) {
    // 明确映射角色
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
    
    // ✅ 只包含 role 和 content - 不包含额外字段
    apiMessages.push({
      role: apiRole,
      content: message.content
    });
  }
  
  return apiMessages;
}
```

### 4. 更新 EvalAgent 调用 ✅

**文件**: `src/lib/services/sim/agents/EvalAgent.ts`

```typescript
// 修复前
async analyzeTopics(
  transcript: ConversationMessage[] | string,
  context: InterviewContext,
  withThinking = false  // ❌ 不支持的参数
): Promise<TopicAnalysisResult> {
  const response = await this.generateResponse(messages, systemPrompt, withThinking);
}

// 修复后
async analyzeTopics(
  transcript: ConversationMessage[] | string,
  context: InterviewContext
): Promise<TopicAnalysisResult> {
  const response = await this.generateResponse(messages, systemPrompt);
}
```

同样的修复应用于 `evaluateInterview` 方法。

### 5. 修复模型名称（移除 `menglong/` 前缀）✅

所有 agent 的默认模型名称已修复，移除了错误的 `menglong/` 前缀：

**修复的文件**:

1. **src/lib/services/sim/agents/InterviewerAgent.ts**
   ```typescript
   // 修复前
   constructor(model = 'menglong/global.anthropic.claude-sonnet-4-5-20250929-v1:0') { ... }
   
   // 修复后
   constructor(model = 'global.anthropic.claude-sonnet-4-5-20250929-v1:0') { ... }
   ```

2. **src/lib/services/sim/agents/CandidateAgent.ts**
   ```typescript
   // 修复前
   constructor(model = 'menglong/deepseek-chat') { ... }
   
   // 修复后
   constructor(model = 'deepseek-chat') { ... }
   ```

3. **src/lib/services/sim/agents/EvalAgent.ts**
   ```typescript
   // 修复前
   constructor(model = 'menglong/global.anthropic.claude-sonnet-4-5-20250929-v1:0') { ... }
   
   // 修复后
   constructor(model = 'global.anthropic.claude-sonnet-4-5-20250929-v1:0') { ... }
   ```

4. **src/lib/services/sim/evaluation/EvaluationEngine.ts**
   ```typescript
   // 修复前
   constructor(model = 'menglong/global.anthropic.claude-sonnet-4-5-20250929-v1:0') { ... }
   
   // 修复后
   constructor(model = 'global.anthropic.claude-sonnet-4-5-20250929-v1:0') { ... }
   ```

5. **src/lib/services/sim/storage/FileManager.ts**
   ```typescript
   // 修复前
   model: 'menglong/global.anthropic.claude-sonnet-4-5-20250929-v1:0'
   
   // 修复后
   model: 'global.anthropic.claude-sonnet-4-5-20250929-v1:0'
   ```

6. **src/lib/services/sim/storage/test-resume-llm.ts**
   ```typescript
   // 修复前
   model: 'menglong/global.anthropic.claude-sonnet-4-5-20250929-v1:0'
   
   // 修复后
   model: 'global.anthropic.claude-sonnet-4-5-20250929-v1:0'
   ```

## 验证

### Playground 中的正确格式（参考）

根据 playground 的成功请求日志：

```json
{
  "model": "deepseek-chat",
  "messages": [
    {
      "role": "user",
      "content": "你好"
    }
  ],
  "max_tokens": 1000,
  "stream": false
}
```

### Agent 的正确格式（修复后）

```json
{
  "model": "global.anthropic.claude-sonnet-4-5-20250929-v1:0",
  "messages": [
    {
      "role": "system",
      "content": "你是一位资深的技术面试官..."
    },
    {
      "role": "user",
      "content": "面试开始，请提出第一个问题。"
    }
  ],
  "stream": false
}
```

### 关键要点

1. ✅ 模型名称**不包含** `menglong/` 前缀
2. ✅ Messages 只包含 `role` 和 `content` 字段（没有 `timestamp`）
3. ✅ 不包含 `thinking` 参数
4. ✅ 只包含有值的参数（可选参数可以省略）

### 支持的 API 参数

根据 MengLong API 文档，支持的参数包括：

| 参数 | 类型 | 必填 | 说明 | 默认值 |
|------|------|------|------|--------|
| model | string | 是 | 模型 ID（不含前缀） | - |
| messages | array | 是 | 对话消息列表 | - |
| temperature | float | 否 | 温度参数（0-2） | 0.7 |
| max_tokens | integer | 否 | 最大生成 token 数 | null |
| stream | boolean | 否 | 是否流式输出 | false |

**Message 对象格式**:
```typescript
{
  role: "system" | "user" | "assistant",  // 只支持这三种角色
  content: string                          // 消息内容
  // ❌ 不支持其他字段如 timestamp, name 等
}
```

**注意**: 
- `thinking` 参数不在支持列表中
- Message 对象只能包含 `role` 和 `content` 字段
- 模型名称不应包含 `menglong/` 前缀

## 影响范围

修复影响以下组件：

1. **BaseAgent** - 所有 agent 的基类
2. **CandidateAgent** - 候选人 agent
3. **InterviewerAgent** - 面试官 agent
4. **EvalAgent** - 评估 agent
5. **EvaluationEngine** - 评估引擎
6. **FileManager** - 文件管理器（简历解析）

所有这些组件现在都使用与 playground 相同的 API 请求格式。

## 测试建议

1. 启动 MengLong API 服务（`http://localhost:8000`）
2. 配置有效的 API Key
3. 在 SimulatorInterface 中测试面试模拟功能
4. 在 EvaluatorInterface 中测试评估功能
5. 验证 API 调用成功且返回正确的响应
6. 检查浏览器控制台的调试日志，确认请求格式正确

## 调试日志

添加了调试日志来帮助排查问题：

```typescript
// BaseAgent.ts
console.log(`[${this.name}] API Request:`, JSON.stringify(chatRequest, null, 2));

// menglongApi.ts
console.log('[menglongApi.chat] Request:', JSON.stringify(requestWithAuth, null, 2));
console.log('[menglongApi.chat] Response:', JSON.stringify(response, null, 2));

// playground/+page.svelte
console.log('[Playground] Sending request:', JSON.stringify(request, null, 2));
console.log('[Playground] Received response:', JSON.stringify(response, null, 2));
```

这些日志将在控制台输出实际发送的请求和收到的响应，方便验证格式是否正确。

## 相关文件

- `src/lib/types/index.ts` - 类型定义
- `src/lib/services/sim/agents/BaseAgent.ts` - Agent 基类
- `src/lib/services/sim/agents/CandidateAgent.ts` - 候选人 agent
- `src/lib/services/sim/agents/InterviewerAgent.ts` - 面试官 agent
- `src/lib/services/sim/agents/EvalAgent.ts` - 评估 agent
- `src/lib/services/sim/evaluation/EvaluationEngine.ts` - 评估引擎
- `src/lib/services/sim/storage/FileManager.ts` - 文件管理器
- `src/lib/services/menglongApi.ts` - API 服务（参考实现）
- `src/routes/playground/+page.svelte` - Playground（工作示例）
- `docs/MENGLONG_API.md` - API 文档

## 总结

修复确保了 interview-sim 的所有 agent 使用与 playground 相同的 API 请求格式：

1. ✅ 移除了不支持的 `thinking` 参数
2. ✅ 确保 Message 对象只包含 `role` 和 `content` 字段，不包含额外字段如 `timestamp`
3. ✅ 修复了所有模型名称，移除了错误的 `menglong/` 前缀
4. ✅ 使 API 调用符合 MengLong API 的标准规范

所有修复已完成，interview simulator 现在应该能够正常工作。
