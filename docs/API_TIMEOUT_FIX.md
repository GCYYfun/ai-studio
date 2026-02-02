# API 超时问题修复总结

## 问题描述

用户反馈 API 请求总是报超时错误，需要：
1. 检查当前的 timeout 设置
2. 增加 timeout 时间以适应 LLM 响应时间
3. 改进错误处理和日志

## 问题分析

### 1. 原始 Timeout 设置

**文件**: `src/lib/utils/constants.ts`

```typescript
export const API_TIMEOUT = 30000; // 30 seconds
```

**问题**:
- 30 秒对于 LLM API 来说太短
- LLM 生成响应通常需要更长时间，特别是：
  - 长文本生成
  - 复杂的推理任务
  - 面试对话生成
  - 评估分析

### 2. Fetch API 默认行为

**原生 fetch() 没有内置 timeout**:
- 浏览器的 fetch API 默认没有 timeout
- 需要使用 AbortController 手动实现 timeout
- 如果不设置，请求可能永久挂起

### 3. 当前实现

**api.ts** 使用 AbortController 实现 timeout:
```typescript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), config.timeout);

const response = await fetch(url, {
  ...options,
  signal: controller.signal
});
```

**menglongApi.ts** 的 streamChat 方法**没有** timeout 控制。

## 修复方案

### 修复 1: 增加 API Timeout 时间

**文件**: `src/lib/utils/constants.ts`

```typescript
// 修复前
export const API_TIMEOUT = 30000; // 30 seconds

// 修复后
export const API_TIMEOUT = 120000; // 120 seconds (2 minutes) - increased for LLM responses
```

**说明**:
- 从 30 秒增加到 120 秒（2 分钟）
- 适应 LLM 响应时间
- 仍然有合理的上限，避免无限等待

### 修复 2: 为 streamChat 添加 Timeout 控制

**文件**: `src/lib/services/menglongApi.ts`

**修改内容**:

```typescript
// 修复前 - 没有 timeout 控制
async streamChat(
  request: ChatRequest,
  onChunk: (content: string) => void,
  onComplete?: (usage?: any) => void,
  onError?: (error: string) => void
): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/menglong/chat`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(requestWithAuth)
      // ❌ 没有 signal 参数，没有 timeout
    });
    // ...
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    onError?.(errorMessage);
  }
}

// 修复后 - 添加 timeout 控制
async streamChat(
  request: ChatRequest,
  onChunk: (content: string) => void,
  onComplete?: (usage?: any) => void,
  onError?: (error: string) => void
): Promise<void> {
  // ✅ Create AbortController for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
    onError?.('Request timeout after 120 seconds');
  }, 120000); // 120 seconds timeout

  try {
    const requestWithAuth = {
      ...request,
      stream: true
    };

    console.log('[menglongApi.streamChat] Starting stream request:', JSON.stringify(requestWithAuth, null, 2));

    const response = await fetch(`${API_BASE_URL}/menglong/chat`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(requestWithAuth),
      signal: controller.signal  // ✅ 添加 signal 参数
    });

    clearTimeout(timeoutId);  // ✅ 清除 timeout

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `HTTP ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Response body is not readable');
    }

    const decoder = new TextDecoder();
    let chunkCount = 0;  // ✅ 添加计数器

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        console.log('[menglongApi.streamChat] Stream completed, total chunks:', chunkCount);
        break;
      }

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(line => line.trim());

      for (const line of lines) {
        try {
          const data: StreamResponse = JSON.parse(line);
          
          if (data.delta?.content) {
            chunkCount++;  // ✅ 计数
            onChunk(data.delta.content);
          }

          if (data.finish_reason && data.usage) {
            console.log('[menglongApi.streamChat] Stream finished:', data.finish_reason, 'Usage:', data.usage);
            onComplete?.(data.usage);
          }
        } catch (e) {
          console.warn('Failed to parse stream chunk:', e, 'Line:', line);  // ✅ 改进日志
        }
      }
    }
  } catch (error) {
    clearTimeout(timeoutId);  // ✅ 确保清除 timeout
    
    // ✅ 区分 timeout 错误和其他错误
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('[menglongApi.streamChat] Request aborted (timeout)');
      onError?.('Request timeout - the server took too long to respond');
    } else {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[menglongApi.streamChat] Stream error:', errorMessage);
      onError?.(errorMessage);
    }
  }
}
```

**改进点**:
1. ✅ 添加 AbortController 实现 timeout 控制
2. ✅ 120 秒 timeout（与非流式请求一致）
3. ✅ 区分 timeout 错误和其他错误
4. ✅ 添加详细的调试日志
5. ✅ 添加 chunk 计数器
6. ✅ 确保 timeout 被正确清除

### 修复 3: 统一使用 API_BASE_URL

**问题**: 之前有些地方硬编码了 `http://localhost:8000`

**修复的文件**:

1. **src/lib/services/menglongApi.ts**
   - ✅ 所有 `baseURL` 参数改为 `API_BASE_URL`
   - ✅ fetch URL 改为 `${API_BASE_URL}/menglong/chat`

2. **src/lib/services/statisticsApi.ts**
   - ✅ fetch URL 改为 `${API_BASE_URL}${endpoint}`

**好处**:
- 统一配置，易于维护
- 支持环境切换（开发/生产）
- 避免硬编码

## Timeout 时间对比

| 场景 | 原始 Timeout | 新 Timeout | 说明 |
|------|-------------|-----------|------|
| 普通 API 请求 | 30 秒 | 120 秒 | 适应 LLM 响应时间 |
| 流式请求 | 无限制 ⚠️ | 120 秒 | 添加了 timeout 控制 |
| 重试延迟 | 1 秒 | 1 秒 | 保持不变 |
| 最大重试次数 | 3 次 | 3 次 | 保持不变 |

## 错误处理改进

### 1. Timeout 错误识别

```typescript
if (error instanceof Error && error.name === 'AbortError') {
  // 这是 timeout 错误
  onError?.('Request timeout - the server took too long to respond');
}
```

### 2. 详细的日志

```typescript
console.log('[menglongApi.streamChat] Starting stream request:', ...);
console.log('[menglongApi.streamChat] Stream completed, total chunks:', chunkCount);
console.log('[menglongApi.streamChat] Stream finished:', data.finish_reason, 'Usage:', data.usage);
console.error('[menglongApi.streamChat] Request aborted (timeout)');
```

### 3. 友好的错误消息

- Timeout: "Request timeout - the server took too long to respond"
- 其他错误: 显示具体的错误信息

## 测试建议

### 测试场景 1: 正常请求

**测试步骤**:
1. 发送一个正常的 API 请求
2. 观察响应时间

**预期结果**:
- 请求在 120 秒内完成
- 没有 timeout 错误
- 控制台显示正常的日志

### 测试场景 2: 长时间请求

**测试步骤**:
1. 发送一个需要较长时间的请求（如复杂的评估）
2. 观察是否能在 120 秒内完成

**预期结果**:
- 如果在 120 秒内完成，正常返回结果
- 如果超过 120 秒，显示 timeout 错误
- 错误消息清晰友好

### 测试场景 3: 流式请求

**测试步骤**:
1. 发送流式请求
2. 观察 chunk 接收情况

**预期结果**:
- 实时接收 chunks
- 控制台显示 chunk 计数
- 完成时显示总 chunk 数和 usage 信息

### 测试场景 4: 网络问题

**测试步骤**:
1. 断开网络
2. 发送请求

**预期结果**:
- 显示网络错误（不是 timeout）
- 错误消息清晰
- 可以重试

### 测试场景 5: 服务器无响应

**测试步骤**:
1. 请求一个不存在的端点或服务器挂起
2. 等待 120 秒

**预期结果**:
- 120 秒后显示 timeout 错误
- 不会无限等待
- 可以重试

## 调试技巧

### 1. 查看控制台日志

打开浏览器控制台（F12），查看：
- `[menglongApi.chat]` - 非流式请求日志
- `[menglongApi.streamChat]` - 流式请求日志
- 请求参数、响应数据、错误信息

### 2. 监控网络请求

在浏览器开发者工具的 Network 标签：
- 查看请求状态
- 查看响应时间
- 查看请求/响应内容

### 3. 检查 API 服务器

确保 MengLong API 服务器：
- 正在运行
- 可以访问（检查 URL）
- API Key 有效

## 后续优化建议

### 1. 实现流式显示

当前已经支持流式请求，可以进一步优化 UI：
- 实时显示生成的内容
- 显示生成进度
- 支持取消请求

### 2. 自适应 Timeout

根据请求类型动态调整 timeout：
```typescript
const timeout = request.maxTokens > 2000 ? 180000 : 120000;
```

### 3. 重试策略优化

对于 timeout 错误，可以：
- 增加重试次数
- 使用指数退避
- 提示用户减少 maxTokens

### 4. 进度指示

对于长时间请求：
- 显示加载动画
- 显示预估时间
- 允许用户取消

## 相关文件

### 已修改的文件

1. **src/lib/utils/constants.ts**
   - 增加 `API_TIMEOUT` 从 30 秒到 120 秒

2. **src/lib/services/menglongApi.ts**
   - 添加 `API_BASE_URL` 导入
   - 所有 `baseURL` 改为 `API_BASE_URL`
   - `streamChat` 方法添加 timeout 控制
   - 改进错误处理和日志

3. **src/lib/services/statisticsApi.ts**
   - 添加 `API_BASE_URL` 导入
   - fetch URL 改为使用 `API_BASE_URL`

### 相关文件（无需修改）

1. **src/lib/services/api.ts**
   - 已经正确实现了 timeout 控制
   - 使用 `API_TIMEOUT` 常量

## 总结

本次修复解决了 API 超时问题：

1. ✅ **增加 Timeout 时间**: 从 30 秒增加到 120 秒，适应 LLM 响应时间
2. ✅ **添加流式 Timeout**: 为 streamChat 方法添加 timeout 控制
3. ✅ **改进错误处理**: 区分 timeout 和其他错误，提供友好的错误消息
4. ✅ **统一 API URL**: 所有请求使用 `API_BASE_URL` 常量
5. ✅ **增强日志**: 添加详细的调试日志，方便问题诊断

现在：
- API 请求有 120 秒的合理 timeout
- 流式请求也有 timeout 保护
- 错误消息更清晰友好
- 便于调试和维护

建议测试各种场景，确保 timeout 设置合适。如果仍然遇到 timeout，可以考虑：
- 进一步增加 timeout（如 180 秒）
- 优化请求参数（减少 maxTokens）
- 检查网络和服务器性能
