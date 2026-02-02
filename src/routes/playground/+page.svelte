<script lang="ts">
	import { onMount } from 'svelte';
	import { Card, Button, Input, Select, Badge, Heading, P, Textarea, Label, Toggle, Alert } from 'flowbite-svelte';
	import { PaperPlaneOutline, RefreshOutline, ExclamationCircleOutline } from 'flowbite-svelte-icons';
	import LoadingSpinner from '$lib/components/ui/LoadingSpinner.svelte';
	import ApiKeyInput from '$lib/components/ui/ApiKeyInput.svelte';
	import { 
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

	// 重试请求
	function handleRetry() {
		playgroundActions.setError(null);
		if (streamMode) {
			handleSendStreamRequest();
		} else {
			handleSendRequest();
		}
	}

	// 发送请求
	async function handleSendRequest() {
		if (!canSubmit) return;

		const startTime = Date.now();
		
		// 开始测试
		playgroundActions.startTest($inputText, $parameters);
		
		try {
			// 构建消息
			const messages = [
				{ role: 'user' as const, content: $inputText }
			];

			// 构建请求 - 只包含有值的参数
			const request: any = {
				model: $selectedModel,
				messages
			};

			// 只添加非默认值的参数
			if ($parameters.temperature !== undefined && $parameters.temperature !== 0.7) {
				request.temperature = $parameters.temperature;
			}
			
			if ($parameters.maxTokens !== undefined && $parameters.maxTokens > 0) {
				request.max_tokens = $parameters.maxTokens;
			}

			// Debug: Log the request before sending
			console.log('[Playground] Sending request:', JSON.stringify(request, null, 2));

			// 发送请求
			const response = await menglongApi.chat(request);
			
			// Debug: Log the response
			console.log('[Playground] Received response:', JSON.stringify(response, null, 2));
			
			if (response.success && response.data) {
				const duration = Date.now() - startTime;
				
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
		playgroundActions.startTest($inputText, $parameters);
		playgroundActions.clearOutput();
		
		try {
			// 构建消息
			const messages = [
				{ role: 'user' as const, content: $inputText }
			];

			// 构建请求 - 只包含有值的参数
			const request: any = {
				model: $selectedModel,
				messages
			};

			// 只添加非默认值的参数
			if ($parameters.temperature !== undefined && $parameters.temperature !== 0.7) {
				request.temperature = $parameters.temperature;
			}
			
			if ($parameters.maxTokens !== undefined && $parameters.maxTokens > 0) {
				request.max_tokens = $parameters.maxTokens;
			}

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
			
			<!-- <div class="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
				<h3 class="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
					服务信息
				</h3>
				<div class="text-sm text-blue-700 dark:text-blue-300 space-y-1">
					<p>• 服务地址: http://localhost:8000</p>
					<p>• 支持的端点: /menglong/models, /menglong/chat</p>
					<p>• 支持流式和非流式对话模式</p>
				</div>
			</div> -->
		</Card>
	{:else}
		<!-- 连接成功后的主界面 -->
		<Alert color="green" class="border-green-200 dark:border-green-600 bg-green-50 dark:bg-green-900/10 transition-all duration-300 hover:shadow-md">
			<div class="flex items-center justify-between">
				<div class="flex items-center">
					<svg class="w-5 h-5 text-green-500 dark:text-green-400 mr-3 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
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
					class="transition-all duration-200 hover:bg-gray-200 dark:hover:bg-gray-700"
					onclick={disconnect}
				>
					断开连接
				</Button>
			</div>
		</Alert>

		<div class="grid lg:grid-cols-3 gap-6">
			<!-- 输入区域 -->
			<div class="lg:col-span-1 space-y-4">
				<Card class="shadow-sm hover:shadow-md transition-shadow duration-200">
					<Heading tag="h3" class="text-lg font-semibold mb-4">模型配置</Heading>
					<div class="space-y-4">
						<div class="transition-all duration-200">
							<Label class="mb-2 flex items-center justify-between">
								<span class="text-gray-900 dark:text-gray-100">模型选择</span>
								<Badge class="text-xs bg-blue-600 dark:bg-blue-500 text-white px-2 py-1">{$availableModels.length} 个可用</Badge>
							</Label>
							<Select 
								value={$selectedModel} 
								onchange={handleModelChange}
								class="transition-all duration-200 hover:border-blue-400 focus:ring-2 focus:ring-blue-500 dark:bg-gray-900 dark:border-gray-600 dark:hover:border-blue-500 dark:text-gray-100"
							>
								{#each $availableModels as model}
									<option value={model.id}>{model.name} ({model.provider})</option>
								{/each}
							</Select>
						</div>
						<div class="transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-800/50 p-3 rounded-lg -m-3">
							<Label class="mb-3 flex items-center justify-between">
								<span class="font-medium text-gray-900 dark:text-gray-100">Temperature</span>
								<Badge class="text-xs font-mono px-2 py-1 bg-blue-600 dark:bg-blue-500 text-white">{$parameters.temperature}</Badge>
							</Label>
							<Input 
								type="range" 
								min="0" 
								max="2" 
								step="0.1"
								value={$parameters.temperature}
								class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 transition-all duration-200"
								oninput={(e) => {
									const target = e.target as HTMLInputElement;
									handleParameterChange('temperature', parseFloat(target.value));
								}}
							/>
							<div class="flex justify-between text-xs text-gray-600 dark:text-gray-300 mt-2 font-medium">
								<span>精确 (0)</span>
								<span>平衡 (1)</span>
								<span>创造 (2)</span>
							</div>
						</div>
						<div class="transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-800/50 p-3 rounded-lg -m-3">
							<Label class="mb-3 flex items-center justify-between">
								<span class="font-medium text-gray-900 dark:text-gray-100">Max Tokens</span>
								<Badge class="text-xs font-mono px-2 py-1 bg-blue-600 dark:bg-blue-500 text-white">{$parameters.maxTokens}</Badge>
							</Label>
							<Input 
								type="number" 
								min="1" 
								max="4000"
								value={$parameters.maxTokens}
								class="transition-all duration-200 hover:border-blue-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:bg-gray-900 dark:border-gray-600 dark:hover:border-blue-500 dark:text-gray-100"
								oninput={(e) => {
									const target = e.target as HTMLInputElement;
									handleParameterChange('maxTokens', parseInt(target.value));
								}}
							/>
							<p class="text-xs text-gray-600 dark:text-gray-300 mt-2 font-medium">
								控制生成文本的最大长度
							</p>
						</div>
						<div class="transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-800/50 p-3 rounded-lg -m-3">
							<Label class="mb-3 flex items-center justify-between">
								<span class="font-medium text-gray-900 dark:text-gray-100">Top P</span>
								<Badge class="text-xs font-mono px-2 py-1 bg-blue-600 dark:bg-blue-500 text-white">{$parameters.topP}</Badge>
							</Label>
							<Input 
								type="range" 
								min="0" 
								max="1" 
								step="0.1"
								value={$parameters.topP}
								class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 transition-all duration-200"
								oninput={(e) => {
									const target = e.target as HTMLInputElement;
									handleParameterChange('topP', parseFloat(target.value));
								}}
							/>
							<div class="flex justify-between text-xs text-gray-600 dark:text-gray-300 mt-2 font-medium">
								<span>确定性 (0)</span>
								<span>多样性 (1)</span>
							</div>
						</div>
					</div>
				</Card>
				
				<Card class="shadow-sm hover:shadow-md transition-shadow duration-200">
					<Heading tag="h3" class="text-lg font-semibold mb-4 flex items-center justify-between">
						<span class="text-gray-900 dark:text-gray-100">输入内容</span>
						<span class="text-xs font-normal text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
							{$inputText.length} 字符
						</span>
					</Heading>
					<div class="relative">
						<Textarea 
							rows={8}
							placeholder="在此输入您要测试的内容...&#10;&#10;例如：请介绍一下人工智能的发展历史"
							class="resize-none transition-all duration-200 hover:border-blue-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:bg-gray-900 dark:border-gray-600 dark:hover:border-blue-500 font-mono text-sm leading-relaxed"
							value={$inputText}
							oninput={handleInputChange}
						/>
						{#if $inputText.length > 0}
							<button
								class="absolute top-2 right-2 p-1.5 rounded-md bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200"
								onclick={() => playgroundActions.setInputText('')}
								title="清空输入"
							>
								<svg class="w-4 h-4 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
								</svg>
							</button>
						{/if}
					</div>
					<div class="mt-4 space-y-3">
						<div class="flex items-center space-x-3 p-3 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 transition-all duration-200 hover:shadow-sm">
							<Toggle bind:checked={streamMode} class="focus:ring-2 focus:ring-blue-500" />
							<div class="flex-1">
								<Label class="cursor-pointer font-medium text-sm text-gray-900 dark:text-gray-100">流式输出</Label>
								<p class="text-xs text-gray-600 dark:text-gray-300 mt-0.5">
									{streamMode ? '实时显示生成过程' : '等待完整响应后显示'}
								</p>
							</div>
							<Badge class="text-xs px-2 py-1 {streamMode ? 'bg-green-600 dark:bg-green-500 text-white' : 'bg-gray-500 dark:bg-gray-600 text-white'}">
								{streamMode ? '已启用' : '已禁用'}
							</Badge>
						</div>
						<Button 
							color="blue" 
							class="w-full py-3 text-base font-medium transition-all duration-200 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none"
							disabled={!canSubmit}
							onclick={streamMode ? handleSendStreamRequest : handleSendRequest}
						>
							{#if isLoading}
								<svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
									<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
									<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
								</svg>
								处理中...
							{:else}
								<PaperPlaneOutline class="w-5 h-5 mr-2" />
								发送请求
							{/if}
						</Button>
						{#if $inputText.trim().length === 0}
							<div class="flex items-center justify-center space-x-2 text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 p-2 rounded-lg">
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
								</svg>
								<span>请先输入内容</span>
							</div>
						{/if}
					</div>
				</Card>
			</div>

			<!-- 输出区域 -->
			<div class="lg:col-span-2 space-y-4">
				<Card class="shadow-sm hover:shadow-md transition-shadow duration-200">
					<div class="flex items-center justify-between mb-4">
						<Heading tag="h3" class="text-lg font-semibold">模型响应</Heading>
						<Badge color={statusBadge.color as any} class="px-3 py-1">{statusBadge.text}</Badge>
					</div>
					<div class="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 rounded-lg p-6 min-h-[300px] border-2 border-gray-200 dark:border-gray-700 relative overflow-hidden">
						{#if $currentOutput}
							<div class="whitespace-pre-wrap text-gray-900 dark:text-white leading-relaxed font-sans">
								{typeof $currentOutput === 'string' ? $currentOutput : JSON.stringify($currentOutput, null, 2)}
							</div>
						{:else if hasError}
							<!-- 增强的错误展示 -->
							<div class="flex flex-col items-center justify-center h-full min-h-[250px] space-y-4">
								<div class="p-4 bg-red-100 dark:bg-red-900/20 rounded-full">
									<ExclamationCircleOutline class="w-12 h-12 text-red-500 dark:text-red-400" />
								</div>
								<div class="text-center space-y-2">
									<P class="text-lg font-semibold text-red-600 dark:text-red-400">请求失败</P>
									<P class="text-sm text-gray-600 dark:text-gray-400 max-w-md">
										{$error}
									</P>
								</div>
								<div class="flex gap-3">
									<Button 
										color="red" 
										size="sm"
										class="transition-all duration-200 hover:shadow-lg hover:scale-105 active:scale-95"
										onclick={handleRetry}
									>
										<RefreshOutline class="w-4 h-4 mr-2" />
										重试
									</Button>
									<Button 
										color="light" 
										size="sm"
										class="transition-all duration-200 hover:bg-gray-200 dark:hover:bg-gray-700"
										onclick={() => playgroundActions.setError(null)}
									>
										清除
									</Button>
								</div>
							</div>
						{:else if isLoading}
							<!-- 增强的加载状态 -->
							<div class="flex flex-col items-center justify-center h-full min-h-[250px] space-y-4">
								<LoadingSpinner size="lg" />
								<div class="text-center space-y-2">
									<P class="text-lg font-medium text-gray-700 dark:text-gray-300">
										{streamMode ? '正在流式生成响应...' : '正在生成响应...'}
									</P>
									<P class="text-sm text-gray-500 dark:text-gray-400">
										请稍候，模型正在处理您的请求
									</P>
								</div>
								<!-- 加载动画效果 -->
								<div class="flex space-x-2">
									<div class="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style="animation-delay: 0ms"></div>
									<div class="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style="animation-delay: 150ms"></div>
									<div class="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style="animation-delay: 300ms"></div>
								</div>
							</div>
						{:else}
							<!-- 空状态 -->
							<div class="flex flex-col items-center justify-center h-full min-h-[250px] text-gray-500 dark:text-gray-400">
								<svg class="w-16 h-16 mb-4 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
								</svg>
								<P class="text-center">
									输入内容并点击发送按钮开始测试
								</P>
							</div>
						{/if}
					</div>
				</Card>
				
				<Card class="shadow-sm hover:shadow-md transition-shadow duration-200">
					<Heading tag="h3" class="text-lg font-semibold mb-4">请求详情</Heading>
					<div class="grid grid-cols-2 gap-3">
						<div class="p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg border border-blue-200 dark:border-blue-800 transition-all duration-200 hover:shadow-md">
							<div class="flex items-center space-x-2 mb-2">
								<svg class="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
								</svg>
								<div class="text-xs font-medium text-blue-700 dark:text-blue-300">响应时间</div>
							</div>
							<div class="text-xl font-bold text-blue-900 dark:text-blue-100">{requestDetails.responseTime}</div>
						</div>
						<div class="p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg border border-purple-200 dark:border-purple-800 transition-all duration-200 hover:shadow-md">
							<div class="flex items-center space-x-2 mb-2">
								<svg class="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"></path>
								</svg>
								<div class="text-xs font-medium text-purple-700 dark:text-purple-300">Token使用</div>
							</div>
							<div class="text-xl font-bold text-purple-900 dark:text-purple-100">{requestDetails.tokenUsage}</div>
						</div>
						<div class="p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg border border-green-200 dark:border-green-800 transition-all duration-200 hover:shadow-md">
							<div class="flex items-center space-x-2 mb-2">
								<svg class="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
								</svg>
								<div class="text-xs font-medium text-green-700 dark:text-green-300">状态</div>
							</div>
							<div class="text-lg font-bold" class:text-green-700={requestDetails.status === '成功'} class:dark:text-green-300={requestDetails.status === '成功'} class:text-red-700={requestDetails.status === '失败'} class:dark:text-red-300={requestDetails.status === '失败'} class:text-gray-700={requestDetails.status === '就绪'} class:dark:text-gray-300={requestDetails.status === '就绪'}>
								{requestDetails.status}
							</div>
						</div>
						<div class="p-4 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 rounded-lg border border-amber-200 dark:border-amber-800 transition-all duration-200 hover:shadow-md">
							<div class="flex items-center space-x-2 mb-2">
								<svg class="w-4 h-4 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
								</svg>
								<div class="text-xs font-medium text-amber-700 dark:text-amber-300">模型</div>
							</div>
							<div class="text-sm font-semibold text-amber-900 dark:text-amber-100 truncate" title={requestDetails.model}>
								{requestDetails.model}
							</div>
						</div>
					</div>
				</Card>
			</div>
		</div>
	{/if}
</div>