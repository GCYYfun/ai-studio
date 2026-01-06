<script lang="ts">
	import { onMount } from 'svelte';
	import { Card, Button, Input, Select, Badge, Heading, P, Textarea, Label, Toggle, Alert } from 'flowbite-svelte';
	import { PaperPlaneOutline } from 'flowbite-svelte-icons';
	import LoadingSpinner from '$lib/components/ui/LoadingSpinner.svelte';
	import ApiKeyInput from '$lib/components/ui/ApiKeyInput.svelte';
	import { 
		playgroundStore, 
		playgroundActions,
		selectedModel,
		inputText,
		parameters,
		currentOutput,
		loadingState,
		error,
		availableModels
	} from '$lib/stores/playground';
	import { menglongApi } from '$lib/services/menglongApi';
	import type { ModelInfo } from '$lib/types';

	// 响应式状态
	const isLoading = $derived($loadingState === 'loading');
	const hasError = $derived($error !== null);
	const canSubmit = $derived($inputText.trim().length > 0 && !isLoading);

	// 组件状态
	let apiKey = $state('');
	let showApiKeyInput = $state(true);
	let connectionError = $state('');
	let loading = $state(false);
	let requestDetails = $state({
		responseTime: '--',
		tokenUsage: '--',
		status: '就绪',
		model: '--'
	});
	let streamMode = $state(false);

	// 获取状态显示
	function getStatusBadge() {
		switch ($loadingState) {
			case 'loading':
				return { color: 'yellow', text: '处理中...' };
			case 'success':
				return { color: 'green', text: '完成' };
			case 'error':
				return { color: 'red', text: '错误' };
			default:
				return { color: 'gray', text: '就绪' };
		}
	}

	const statusBadge = $derived(getStatusBadge());

	// 生命周期
	onMount(async () => {
		// 检查是否已有API密钥
		const savedApiKey = localStorage.getItem('menglong_api_key');
		if (savedApiKey) {
			apiKey = savedApiKey;
			await connectToApi(savedApiKey);
		}
	});

	// 连接到 API
	async function connectToApi(key: string) {
		loading = true;
		connectionError = '';
		
		try {
			// 设置 API Key
			menglongApi.setApiKey(key);
			
			// 检查连接
			const response = await menglongApi.checkConnection();
			
			if (response.success) {
				showApiKeyInput = false;
				apiKey = key;
				
				// 保存到本地存储
				localStorage.setItem('menglong_api_key', key);
				
				// 加载模型列表
				await loadModels();
				
				// 清除错误
				playgroundActions.setError(null);
			} else {
				throw new Error(response.error || 'API连接失败');
			}
		} catch (error) {
			connectionError = error instanceof Error ? error.message : 'API连接失败';
			showApiKeyInput = true;
		} finally {
			loading = false;
		}
	}

	// 断开连接
	function disconnect() {
		showApiKeyInput = true;
		apiKey = '';
		connectionError = '';
		
		// 清除本地存储
		localStorage.removeItem('menglong_api_key');
		
		// 重置状态
		playgroundActions.reset();
	}

	// 加载模型列表
	async function loadModels() {
		try {
			playgroundActions.setLoadingState('loading');
			const response = await menglongApi.getModels();
			
			if (response.success && response.data) {
				playgroundActions.setAvailableModels(response.data);
				// 如果当前选中的模型不在列表中，选择第一个
				if (response.data.length > 0 && !response.data.find(m => m.id === $selectedModel)) {
					playgroundActions.setSelectedModel(response.data[0].id);
				}
			} else {
				playgroundActions.setError(response.error || '加载模型列表失败');
			}
		} catch (err) {
			playgroundActions.setError('加载模型列表时发生错误');
		} finally {
			playgroundActions.setLoadingState('idle');
		}
	}

	// 处理模型选择
	function handleModelChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		playgroundActions.setSelectedModel(target.value);
	}

	// 处理输入文本变化
	function handleInputChange(event: Event) {
		const target = event.target as HTMLTextAreaElement;
		playgroundActions.setInputText(target.value);
	}

	// 处理参数变化
	function handleParameterChange(key: string, value: any) {
		playgroundActions.updateParameter(key as keyof typeof $parameters, value);
	}

	// 发送请求
	async function handleSendRequest() {
		if (!canSubmit) return;

		const startTime = Date.now();
		
		// 开始测试
		const test = playgroundActions.startTest($inputText, $parameters);
		
		try {
			// 构建消息
			const messages = [
				{ role: 'user' as const, content: $inputText }
			];

			// 构建请求
			const request = {
				model: $selectedModel,
				messages,
				temperature: $parameters.temperature,
				max_tokens: $parameters.maxTokens
			};

			// 发送请求
			const response = await menglongApi.chat(request);
			
			if (response.success && response.data) {
				const duration = Date.now() - startTime;
				
				// 调试：打印响应数据结构
				console.log('API Response:', response.data);
				console.log('Output object:', response.data.output);
				console.log('Content:', response.data.output?.content);
				console.log('Content type:', typeof response.data.output?.content);
				
				const output = response.data.output?.content;
				
				// 确保 output 是字符串
				const outputString = typeof output === 'string' ? output : JSON.stringify(output);
				
				// 更新输出
				playgroundActions.setCurrentOutput(outputString);
				playgroundActions.completeTest(outputString, duration, response.data.usage);
				
				// 更新请求详情
				requestDetails = {
					responseTime: `${duration}ms`,
					tokenUsage: `${response.data.usage.total_tokens} tokens`,
					status: '成功',
					model: $selectedModel
				};
			} else {
				throw new Error(response.error || '请求失败');
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : '未知错误';
			playgroundActions.failTest(errorMessage);
			
			// 更新请求详情
			requestDetails = {
				responseTime: `${Date.now() - startTime}ms`,
				tokenUsage: '--',
				status: '失败',
				model: $selectedModel
			};
		}
	}

	// 发送流式请求
	async function handleSendStreamRequest() {
		if (!canSubmit) return;

		const startTime = Date.now();
		
		// 开始测试
		const test = playgroundActions.startTest($inputText, $parameters);
		playgroundActions.clearOutput();
		
		try {
			// 构建消息
			const messages = [
				{ role: 'user' as const, content: $inputText }
			];

			// 构建请求
			const request = {
				model: $selectedModel,
				messages,
				temperature: $parameters.temperature,
				max_tokens: $parameters.maxTokens
			};

			// 发送流式请求
			await menglongApi.streamChat(
				request,
				// onChunk
				(content: string) => {
					playgroundActions.appendOutput(content);
				},
				// onComplete
				(usage: any) => {
					const duration = Date.now() - startTime;
					playgroundActions.completeTest($currentOutput, duration, usage);
					
					// 更新请求详情
					requestDetails = {
						responseTime: `${duration}ms`,
						tokenUsage: usage ? `${usage.total_tokens} tokens` : '--',
						status: '成功',
						model: $selectedModel
					};
				},
				// onError
				(error: string) => {
					playgroundActions.failTest(error);
					
					// 更新请求详情
					requestDetails = {
						responseTime: `${Date.now() - startTime}ms`,
						tokenUsage: '--',
						status: '失败',
						model: $selectedModel
					};
				}
			);
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : '未知错误';
			playgroundActions.failTest(errorMessage);
			
			// 更新请求详情
			requestDetails = {
				responseTime: `${Date.now() - startTime}ms`,
				tokenUsage: '--',
				status: '失败',
				model: $selectedModel
			};
		}
	}
</script>

<svelte:head>
	<title>Playground - AI Studio Web</title>
	<meta name="description" content="AI Studio Web 模型测试 Playground" />
</svelte:head>

<div class="space-y-6">
	<div>
		<Heading tag="h1" class="text-3xl font-bold">
			AI 模型测试 Playground
		</Heading>
		<P class="mt-2">
			交互式AI模型测试环境，支持参数调整和结果分析
		</P>
	</div>

	<!-- API密钥配置 -->
	{#if showApiKeyInput}
		<Card class="max-w-2xl mx-auto">
			<div class="text-center mb-6">
				<Heading tag="h2" class="text-xl font-semibold mb-2">
					连接到 MengLong API
				</Heading>
				<P class="text-gray-600 dark:text-gray-400">
					请输入您的 MengLong API Key 以开始使用模型测试功能
				</P>
			</div>
			
			<ApiKeyInput
				value={apiKey}
				onchange={(key) => apiKey = key}
				onsubmit={connectToApi}
				{loading}
				error={connectionError}
				placeholder="请输入您的 MengLong API Key (sk-...)"
			/>
			
			<div class="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
				<h3 class="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
					服务信息
				</h3>
				<div class="text-sm text-blue-700 dark:text-blue-300 space-y-1">
					<p>• 服务地址: http://localhost:8000</p>
					<p>• 支持的端点: /menglong/models, /menglong/chat</p>
					<p>• 支持流式和非流式对话模式</p>
				</div>
			</div>
		</Card>
	{:else}
		<!-- 连接成功后的主界面 -->
		<Alert color="green" class="border-green-200 dark:border-green-600 bg-green-50 dark:bg-green-900/10">
			<div class="flex items-center justify-between">
				<div class="flex items-center">
					<svg class="w-5 h-5 text-green-500 dark:text-green-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
						<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
					</svg>
					<div>
						<h3 class="text-sm font-medium text-green-800 dark:text-white">
							已连接到 MengLong API
						</h3>
						<div class="mt-1 text-sm text-green-700 dark:text-gray-300">
							<p>API Key: {apiKey.substring(0, 8)}... | 可用模型: {$availableModels.length} 个</p>
						</div>
					</div>
				</div>
				<Button 
					size="xs" 
					color="light" 
					onclick={disconnect}
				>
					断开连接
				</Button>
			</div>
		</Alert>

		<div class="grid lg:grid-cols-3 gap-6">
			<!-- 输入区域 -->
			<div class="lg:col-span-1 space-y-4">
				<Card>
					<Heading tag="h3" class="text-lg font-semibold mb-4">模型配置</Heading>
					<div class="space-y-4">
						<div>
							<Label class="mb-2">模型选择</Label>
							<Select value={$selectedModel} onchange={handleModelChange}>
								{#each $availableModels as model}
									<option value={model.id}>{model.name} ({model.provider})</option>
								{/each}
							</Select>
						</div>
						<div>
							<Label class="mb-2">Temperature ({$parameters.temperature})</Label>
							<Input 
								type="range" 
								min="0" 
								max="2" 
								step="0.1"
								value={$parameters.temperature}
								oninput={(e) => handleParameterChange('temperature', parseFloat(e.target.value))}
							/>
						</div>
						<div>
							<Label class="mb-2">Max Tokens</Label>
							<Input 
								type="number" 
								min="1" 
								max="4000"
								value={$parameters.maxTokens}
								oninput={(e) => handleParameterChange('maxTokens', parseInt(e.target.value))}
							/>
						</div>
						<div>
							<Label class="mb-2">Top P ({$parameters.topP})</Label>
							<Input 
								type="range" 
								min="0" 
								max="1" 
								step="0.1"
								value={$parameters.topP}
								oninput={(e) => handleParameterChange('topP', parseFloat(e.target.value))}
							/>
						</div>
					</div>
				</Card>
				
				<Card>
					<Heading tag="h3" class="text-lg font-semibold mb-4">输入内容</Heading>
					<Textarea 
						rows="6"
						placeholder="请输入您要测试的内容..."
						class="resize-none"
						value={$inputText}
						oninput={handleInputChange}
					/>
					<div class="mt-4 space-y-3">
						<div class="flex items-center space-x-2">
							<Toggle bind:checked={streamMode} />
							<Label>流式输出</Label>
						</div>
						<Button 
							color="blue" 
							class="w-full"
							disabled={!canSubmit}
							onclick={streamMode ? handleSendStreamRequest : handleSendRequest}
						>
							<PaperPlaneOutline class="w-4 h-4 mr-2" />
							{isLoading ? '处理中...' : '发送请求'}
						</Button>
					</div>
				</Card>
			</div>

			<!-- 输出区域 -->
			<div class="lg:col-span-2 space-y-4">
				<Card>
					<div class="flex items-center justify-between mb-4">
						<Heading tag="h3" class="text-lg font-semibold">模型响应</Heading>
						<Badge color={statusBadge.color}>{statusBadge.text}</Badge>
					</div>
					<div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 min-h-[200px] border border-gray-200 dark:border-gray-700">
						{#if $currentOutput}
							<!-- 调试信息 -->
							<div class="text-xs text-gray-500 mb-2">
								输出类型: {typeof $currentOutput} | 长度: {$currentOutput?.length || 0}
							</div>
							<div class="whitespace-pre-wrap text-gray-900 dark:text-white">
								{typeof $currentOutput === 'string' ? $currentOutput : JSON.stringify($currentOutput, null, 2)}
							</div>
						{:else if hasError}
							<div class="text-center text-red-500">
								<svg class="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
								</svg>
								<P class="font-medium">错误: {$error}</P>
							</div>
						{:else if isLoading}
							<div class="flex items-center justify-center">
								<LoadingSpinner size="lg" class="mr-3" />
								<span class="text-gray-600 dark:text-gray-400">正在生成响应...</span>
							</div>
						{:else}
							<div class="text-center text-gray-500 dark:text-gray-400">
								<svg class="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
								</svg>
								<P>等待输入内容...</P>
							</div>
						{/if}
					</div>
				</Card>
				
				<Card>
					<Heading tag="h3" class="text-lg font-semibold mb-4">请求详情</Heading>
					<div class="grid grid-cols-2 gap-4 text-sm">
						<div>
							<span class="text-gray-600 dark:text-gray-400">响应时间:</span>
							<span class="ml-2 font-medium text-gray-900 dark:text-white">{requestDetails.responseTime}</span>
						</div>
						<div>
							<span class="text-gray-600 dark:text-gray-400">Token使用:</span>
							<span class="ml-2 font-medium text-gray-900 dark:text-white">{requestDetails.tokenUsage}</span>
						</div>
						<div>
							<span class="text-gray-600 dark:text-gray-400">状态:</span>
							<span class="ml-2 font-medium text-gray-900 dark:text-white">{requestDetails.status}</span>
						</div>
						<div>
							<span class="text-gray-600 dark:text-gray-400">模型:</span>
							<span class="ml-2 font-medium text-gray-900 dark:text-white">{requestDetails.model}</span>
						</div>
					</div>
				</Card>
			</div>
		</div>
	{/if}
</div>