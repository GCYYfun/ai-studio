<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Card, Button, Heading, P, Badge, Alert, Spinner } from 'flowbite-svelte';
	import { ui } from '$lib/ui';
	import { interviewStore, type InterviewMessage } from '$lib/stores/interview.js';

	const { Icon } = ui;

	// Props
	let { class: className = '' } = $props();

	// Store subscriptions
	let currentSession = $state<any>(null);
	let messages = $state<ConversationMessage[]>([]);
	let uiState = $state({ activePanel: 'config', showThinking: true, isFullscreen: false });

	// UI state
	let isStreaming = $state(false);
	let currentStreamingMessage = $state('');
	let currentStreamingRole = $state<'interviewer' | 'candidate'>('interviewer');
	let scrollContainer: HTMLDivElement;
	let autoScroll = $state(true);

	// Subscribe to stores
	interviewStore.currentSession.subscribe(value => {
		currentSession = value;
		messages = value?.messages || [];
	});
	interviewStore.uiState.subscribe(value => uiState = value);

	onMount(() => {
		// Auto-scroll to bottom when new messages arrive
		scrollToBottom();

		// Click outside handler for export options
		function handleClickOutside(event: MouseEvent) {
			if (showExportOptions) {
				const target = event.target as Element;
				if (!target.closest('.export-dropdown')) {
					showExportOptions = false;
				}
			}
		}

		document.addEventListener('click', handleClickOutside);
		
		return () => {
			document.removeEventListener('click', handleClickOutside);
		};
	});

	onDestroy(() => {
		// Cleanup any ongoing streams
		if (isStreaming) {
			stopStreaming();
		}
	});

	// Auto-scroll to bottom
	function scrollToBottom() {
		if (scrollContainer && autoScroll) {
			setTimeout(() => {
				scrollContainer.scrollTop = scrollContainer.scrollHeight;
			}, 100);
		}
	}

	// Handle scroll to detect if user scrolled up
	function handleScroll() {
		if (scrollContainer) {
			const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
			autoScroll = scrollTop + clientHeight >= scrollHeight - 50;
		}
	}

	// Control functions
	function pauseSimulation() {
		try {
			// Access controller from parent or global state
			// For now, just update the store directly
			if (currentSession) {
				interviewStore.currentSession.update(session => 
					session ? { ...session, status: 'paused' } : null
				);
			}
			console.log('Pausing simulation');
		} catch (error) {
			console.error('Failed to pause simulation:', error);
		}
	}

	function resumeSimulation() {
		try {
			if (currentSession) {
				interviewStore.currentSession.update(session => 
					session ? { ...session, status: 'running' } : null
				);
			}
			console.log('Resuming simulation');
		} catch (error) {
			console.error('Failed to resume simulation:', error);
		}
	}

	function stopSimulation() {
		try {
			if (currentSession) {
				interviewStore.currentSession.update(session => 
					session ? { ...session, status: 'completed' } : null
				);
			}
			stopStreaming();
			console.log('Stopping simulation');
		} catch (error) {
			console.error('Failed to stop simulation:', error);
		}
	}

	function saveResults() {
		if (currentSession && messages.length > 0) {
			// Show export options
			showExportOptions = true;
		}
		console.log('Saving results');
	}

	// Export options state
	let showExportOptions = $state(false);
	let exportFormat = $state<'json' | 'txt' | 'md'>('json');

	// Export with selected format
	function exportResults(format: 'json' | 'txt' | 'md') {
		if (currentSession && messages.length > 0) {
			const transcript = formatTranscriptForExport();
			downloadTranscript(transcript, format);
			showExportOptions = false;
		}
	}

	// Streaming functions
	function startStreaming(role: 'interviewer' | 'candidate', content: string) {
		isStreaming = true;
		currentStreamingRole = role;
		currentStreamingMessage = '';
		
		// Simulate streaming by adding characters progressively
		let index = 0;
		const streamInterval = setInterval(() => {
			if (index < content.length) {
				currentStreamingMessage += content[index];
				index++;
				scrollToBottom();
			} else {
				clearInterval(streamInterval);
				finishStreaming();
			}
		}, 30); // Adjust speed as needed
	}

	function finishStreaming() {
		if (isStreaming && currentStreamingMessage) {
			// Add the complete message to the conversation
			const newMessage: ConversationMessage = {
				role: currentStreamingRole,
				content: currentStreamingMessage,
				timestamp: new Date(),
				turn: messages.length + 1
			};

			interviewStore.currentSession.update(session => {
				if (session) {
					return {
						...session,
						messages: [...session.messages, newMessage]
					};
				}
				return session;
			});
		}
		
		isStreaming = false;
		currentStreamingMessage = '';
		scrollToBottom();
	}

	function stopStreaming() {
		isStreaming = false;
		currentStreamingMessage = '';
	}

	// Export functions
	function formatTranscriptForExport() {
		const transcript = {
			sessionId: currentSession?.sessionId,
			timestamp: new Date().toISOString(),
			totalTurns: messages.length,
			status: currentSession?.status,
			messages: messages.map(msg => ({
				role: msg.role,
				content: msg.content,
				timestamp: msg.timestamp.toISOString(),
				turn: msg.turn,
				thinking: msg.thinking
			}))
		};
		return transcript;
	}

	function downloadTranscript(data: any, format: 'json' | 'txt' | 'md' = 'json') {
		let content: string;
		let filename: string;
		let mimeType: string;

		switch (format) {
			case 'json':
				content = JSON.stringify(data, null, 2);
				filename = `interview_transcript_${Date.now()}.json`;
				mimeType = 'application/json';
				break;
			case 'txt':
				content = messages.map(msg => 
					`${msg.role === 'interviewer' ? '面试官' : '候选人'} (${msg.timestamp.toLocaleTimeString()}): ${msg.content}`
				).join('\n\n');
				filename = `interview_transcript_${Date.now()}.txt`;
				mimeType = 'text/plain';
				break;
			case 'md':
				content = `# 面试记录\n\n**会话ID**: ${currentSession?.sessionId}\n**时间**: ${new Date().toLocaleString()}\n**总轮数**: ${messages.length}\n\n---\n\n` +
					messages.map(msg => 
						`## ${msg.role === 'interviewer' ? '面试官' : '候选人'} (第${msg.turn}轮)\n\n**时间**: ${msg.timestamp.toLocaleString()}\n\n${msg.content}\n\n---\n`
					).join('\n');
				filename = `interview_transcript_${Date.now()}.md`;
				mimeType = 'text/markdown';
				break;
		}

		const blob = new Blob([content], { type: mimeType });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = filename;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}

	// Toggle thinking display
	function toggleThinking() {
		interviewStore.uiState.update(state => ({
			...state,
			showThinking: !state.showThinking
		}));
	}

	// Toggle fullscreen
	function toggleFullscreen() {
		interviewStore.uiState.update(state => ({
			...state,
			isFullscreen: !state.isFullscreen
		}));
	}

	// Reactive effects
	$effect(() => {
		scrollToBottom();
	});

	// Demo function for testing streaming
	function startDemoConversation() {
		if (!currentSession) return;

		const demoMessages = [
			{ role: 'interviewer' as const, content: '您好，欢迎参加今天的面试。请先简单介绍一下自己。' },
			{ role: 'candidate' as const, content: '您好，我是朱泽辉，有5年的HR工作经验，主要负责招聘和员工关系管理。我对这个职位很感兴趣，希望能够为公司的人力资源发展贡献自己的力量。' },
			{ role: 'interviewer' as const, content: '很好。能详细说说您在招聘方面的经验吗？特别是在候选人筛选和面试技巧方面。' },
			{ role: 'candidate' as const, content: '在招聘方面，我建立了一套完整的候选人筛选流程。首先通过简历筛选确定基本匹配度，然后进行电话初筛了解候选人的基本情况和求职动机，最后安排现场面试深入评估专业能力和文化匹配度。' }
		];

		let messageIndex = 0;
		
		function sendNextMessage() {
			if (messageIndex < demoMessages.length && currentSession?.status === 'running') {
				const message = demoMessages[messageIndex];
				startStreaming(message.role, message.content);
				messageIndex++;
				
				// Schedule next message
				setTimeout(() => {
					if (messageIndex < demoMessages.length) {
						sendNextMessage();
					} else {
						// End demo
						interviewStore.currentSession.update(session => 
							session ? { ...session, status: 'completed' } : null
						);
					}
				}, 3000 + message.content.length * 50); // Adjust timing based on content length
			}
		}

		// Start the demo
		interviewStore.currentSession.update(session => 
			session ? { ...session, status: 'running' } : null
		);
		
		setTimeout(sendNextMessage, 1000);
	}
</script>

<Card class="shadow-sm hover:shadow-md transition-shadow duration-200 {className} {uiState.isFullscreen ? 'fixed inset-4 z-50' : ''}">
	<div class="flex items-center justify-between mb-4">
		<div class="flex items-center space-x-2">
			<Icon name="play" class="w-5 h-5 text-green-600 dark:text-green-400" />
			<Heading tag="h3" class="text-lg font-semibold">实时面试对话</Heading>
			{#if isStreaming}
				<Spinner size="4" class="ml-2" />
			{/if}
		</div>
		<div class="flex items-center space-x-2">
			{#if currentSession}
				<Badge color={currentSession.status === 'running' ? 'green' : currentSession.status === 'paused' ? 'yellow' : currentSession.status === 'completed' ? 'blue' : 'gray'}>
					{currentSession.status === 'running' ? '进行中' : currentSession.status === 'paused' ? '已暂停' : currentSession.status === 'completed' ? '已完成' : '空闲'}
				</Badge>
			{/if}
			<Button size="xs" color="light" onclick={toggleThinking}>
				<Icon name={uiState.showThinking ? 'eye' : 'eye-slash'} class="w-4 h-4" />
			</Button>
			<Button size="xs" color="light" onclick={toggleFullscreen}>
				<Icon name={uiState.isFullscreen ? 'minimize' : 'maximize'} class="w-4 h-4" />
			</Button>
		</div>
	</div>

	<!-- 对话显示区域 -->
	<div 
		bind:this={scrollContainer}
		onscroll={handleScroll}
		class="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-700 overflow-y-auto {uiState.isFullscreen ? 'h-[calc(100vh-200px)]' : 'min-h-[400px] max-h-[600px]'}"
	>
		{#if messages.length > 0 || isStreaming}
			<div class="p-4 space-y-4">
				{#each messages as message}
					<div class="flex {message.role === 'interviewer' ? 'justify-start' : 'justify-end'}">
						<div class="max-w-[85%] {message.role === 'interviewer' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100' : 'bg-green-100 dark:bg-green-900/30 text-green-900 dark:text-green-100'} rounded-lg p-4 shadow-sm">
							<div class="flex items-center space-x-2 mb-2">
								<div class="flex items-center space-x-1">
									<Icon name={message.role === 'interviewer' ? 'user-tie' : 'user'} class="w-4 h-4" />
									<span class="text-sm font-medium">
										{message.role === 'interviewer' ? '面试官' : '候选人'}
									</span>
								</div>
								<Badge color="gray" class="text-xs">第 {message.turn} 轮</Badge>
								<span class="text-xs text-gray-500 dark:text-gray-400">
									{message.timestamp.toLocaleTimeString()}
								</span>
							</div>
							<div class="text-sm leading-relaxed whitespace-pre-wrap">
								{message.content}
							</div>
							{#if message.thinking && uiState.showThinking}
								<div class="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
									<div class="flex items-center space-x-1 mb-1">
										<Icon name="lightbulb" class="w-3 h-3 text-yellow-500" />
										<span class="text-xs font-medium text-gray-600 dark:text-gray-400">思考过程</span>
									</div>
									<div class="text-xs text-gray-600 dark:text-gray-400 italic">
										{message.thinking}
									</div>
								</div>
							{/if}
						</div>
					</div>
				{/each}

				<!-- 流式输出显示 -->
				{#if isStreaming && currentStreamingMessage}
					<div class="flex {currentStreamingRole === 'interviewer' ? 'justify-start' : 'justify-end'}">
						<div class="max-w-[85%] {currentStreamingRole === 'interviewer' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100' : 'bg-green-100 dark:bg-green-900/30 text-green-900 dark:text-green-100'} rounded-lg p-4 shadow-sm border-2 border-dashed border-blue-300 dark:border-blue-600">
							<div class="flex items-center space-x-2 mb-2">
								<div class="flex items-center space-x-1">
									<Icon name={currentStreamingRole === 'interviewer' ? 'user-tie' : 'user'} class="w-4 h-4" />
									<span class="text-sm font-medium">
										{currentStreamingRole === 'interviewer' ? '面试官' : '候选人'}
									</span>
								</div>
								<Spinner size="4" />
								<span class="text-xs text-gray-500 dark:text-gray-400">正在输入...</span>
							</div>
							<div class="text-sm leading-relaxed whitespace-pre-wrap">
								{currentStreamingMessage}<span class="animate-pulse">|</span>
							</div>
						</div>
					</div>
				{/if}
			</div>
		{:else}
			<div class="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400 p-6">
				<svg class="w-16 h-16 mb-4 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
				</svg>
				<P class="text-center mb-4">
					配置完成后开始面试模拟
				</P>
				<P class="text-xs text-center text-gray-400 mb-4">
					面试对话将在此处实时显示
				</P>
				{#if currentSession && currentSession.status === 'idle'}
					<Button size="small" color="blue" onclick={startDemoConversation}>
						<Icon name="play" class="w-4 h-4 mr-2" />
						开始演示对话
					</Button>
				{/if}
			</div>
		{/if}

		<!-- 自动滚动提示 -->
		{#if !autoScroll && messages.length > 0}
			<div class="sticky bottom-4 left-1/2 transform -translate-x-1/2 z-10">
				<Button size="small" color="blue" onclick={scrollToBottom} class="shadow-lg">
					<Icon name="arrow-down" class="w-4 h-4 mr-1" />
					滚动到底部
				</Button>
			</div>
		{/if}
	</div>

	<!-- 控制面板 -->
	{#if currentSession}
		<div class="mt-4 flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
			<div class="flex items-center space-x-4">
				<div class="text-sm">
					<span class="font-medium">进度:</span>
					<span class="text-gray-600 dark:text-gray-400">
						{messages.length} / {currentSession.maxTurns || 20} 轮
					</span>
				</div>
				<div class="text-sm">
					<span class="font-medium">状态:</span>
					<span class="text-gray-600 dark:text-gray-400">
						{currentSession.status === 'running' ? '运行中' : 
						 currentSession.status === 'paused' ? '已暂停' : 
						 currentSession.status === 'completed' ? '已完成' : '空闲'}
					</span>
				</div>
				{#if isStreaming}
					<div class="text-sm flex items-center space-x-1">
						<Spinner size="4" />
						<span class="text-gray-600 dark:text-gray-400">AI 思考中...</span>
					</div>
				{/if}
			</div>
			
			<div class="flex items-center space-x-2">
				{#if currentSession.status === 'running'}
					<Button color="yellow" size="small" onclick={pauseSimulation} disabled={isStreaming}>
						<Icon name="pause" class="w-4 h-4 mr-1" />
						暂停
					</Button>
				{:else if currentSession.status === 'paused'}
					<Button color="green" size="small" onclick={resumeSimulation}>
						<Icon name="play" class="w-4 h-4 mr-1" />
						继续
					</Button>
				{/if}
				<Button color="red" size="small" onclick={stopSimulation} disabled={isStreaming}>
					<Icon name="stop" class="w-4 h-4 mr-1" />
					停止
				</Button>
				{#if currentSession.status === 'completed' || messages.length > 0}
					<div class="relative export-dropdown">
						<Button color="blue" size="small" onclick={() => saveResults()}>
							<Icon name="download" class="w-4 h-4 mr-1" />
							保存
						</Button>
						
						{#if showExportOptions}
							<div class="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10 min-w-32">
								<div class="p-2 space-y-1">
									<button
										class="w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-700"
										onclick={() => exportResults('json')}
									>
										<Icon name="code" class="w-4 h-4 mr-2 inline" />
										JSON 格式
									</button>
									<button
										class="w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-700"
										onclick={() => exportResults('txt')}
									>
										<Icon name="document-text" class="w-4 h-4 mr-2 inline" />
										文本格式
									</button>
									<button
										class="w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-700"
										onclick={() => exportResults('md')}
									>
										<Icon name="document" class="w-4 h-4 mr-2 inline" />
										Markdown
									</button>
								</div>
							</div>
						{/if}
					</div>
				{/if}
			</div>
		</div>
	{/if}

	<!-- 快捷操作提示 -->
	{#if messages.length === 0 && !currentSession}
		<Alert color="blue" class="mt-4">
			<Icon name="info" class="w-4 h-4 mr-2" />
			<div class="text-sm">
				<p class="font-medium mb-1">使用提示:</p>
				<ul class="text-xs space-y-1 list-disc list-inside">
					<li>在配置面板选择 JD 和简历文件</li>
					<li>点击"开始面试"启动模拟</li>
					<li>支持实时流式对话显示</li>
					<li>可以随时暂停、继续或停止面试</li>
					<li>面试结束后可导出多种格式的记录</li>
				</ul>
			</div>
		</Alert>
	{/if}
</Card>