<script lang="ts">
	import { onMount } from 'svelte';
	import { Heading, P, Badge } from 'flowbite-svelte';
	import { ui } from '$lib/ui';
	import { interviewStore } from '$lib/stores/interview.js';
	import { 
		SimulatorInterface, 
		EvaluatorInterface, 
		FileManager, 
		SimulationDisplay, 
		TopicAnalysis, 
		CapabilityAssessment,
		ApiKeyConfig
	} from '$lib/components/interview';

	const { Icon } = ui;

	// 页面状态
	let mounted = $state(false);
	let uiState = $state({ activePanel: 'config', showThinking: true, isFullscreen: false });

	// Subscribe to store
	interviewStore.uiState.subscribe(value => uiState = value);

	onMount(() => {
		mounted = true;
	});

	// 面板切换函数
	function setActivePanel(panel: 'config' | 'simulation' | 'analysis') {
		interviewStore.uiState.update(state => ({ ...state, activePanel: panel }));
	}
</script>

<svelte:head>
	<title>面试模拟 - AI Studio Web</title>
	<meta name="description" content="AI Studio Web 智能面试模拟和深度分析功能" />
</svelte:head>

<div class="space-y-6">
	<!-- 页面标题 -->
	<div>
		<Heading tag="h1" class="text-3xl font-bold">
			面试模拟
		</Heading>
		<P class="mt-2">
			智能面试模拟和深度分析功能，提供专业的面试体验和评估工具
		</P>
	</div>

	<!-- 功能状态指示器 -->
	<div class="flex items-center space-x-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-600">
		<div class="flex items-center space-x-2">
			<div class="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
			<span class="text-sm font-medium text-blue-700 dark:text-blue-300">系统就绪</span>
		</div>
		<Badge color="blue" class="px-3 py-1">Beta 版本</Badge>
	</div>

	<!-- API Key 配置 -->
	<ApiKeyConfig />
	<!-- 移动端标签页导航 -->
	<div class="lg:hidden mb-6">
		<div class="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
			<button
				class="flex-1 flex items-center justify-center space-x-2 py-2 px-3 rounded-md text-sm font-medium transition-colors duration-200 {uiState.activePanel === 'config' ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}"
				onclick={() => setActivePanel('config')}
			>
				<Icon name="cog" class="w-4 h-4" />
				<span>配置</span>
			</button>
			<button
				class="flex-1 flex items-center justify-center space-x-2 py-2 px-3 rounded-md text-sm font-medium transition-colors duration-200 {uiState.activePanel === 'simulation' ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}"
				onclick={() => setActivePanel('simulation')}
			>
				<Icon name="play" class="w-4 h-4" />
				<span>模拟</span>
			</button>
			<button
				class="flex-1 flex items-center justify-center space-x-2 py-2 px-3 rounded-md text-sm font-medium transition-colors duration-200 {uiState.activePanel === 'analysis' ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}"
				onclick={() => setActivePanel('analysis')}
			>
				<Icon name="chart" class="w-4 h-4" />
				<span>分析</span>
			</button>
		</div>
	</div>

	<!-- 主要内容区域 -->
	<div class="grid lg:grid-cols-3 gap-6">
		<!-- 配置面板 -->
		<div class="lg:col-span-1 {uiState.activePanel === 'config' ? 'block' : 'hidden lg:block'}">
			<div class="space-y-6">
				<SimulatorInterface />
				<EvaluatorInterface />
				<FileManager />
			</div>
		</div>

		<!-- 模拟显示面板 -->
		<div class="lg:col-span-1 {uiState.activePanel === 'simulation' ? 'block' : 'hidden lg:block'}">
			<SimulationDisplay />
		</div>

		<!-- 分析结果面板 -->
		<div class="lg:col-span-1 {uiState.activePanel === 'analysis' ? 'block' : 'hidden lg:block'}">
			<div class="space-y-6">
				<TopicAnalysis />
				<CapabilityAssessment />
			</div>
		</div>
	</div>

	<!-- 底部状态栏 -->
	<div class="mt-8 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
		<div class="flex items-center justify-between">
			<div class="flex items-center space-x-4">
				<div class="flex items-center space-x-2">
					<div class="w-2 h-2 bg-green-500 rounded-full"></div>
					<span class="text-sm text-gray-600 dark:text-gray-400">系统状态: 正常</span>
				</div>
				<div class="text-sm text-gray-500 dark:text-gray-400">
					当前面板: {uiState.activePanel === 'config' ? '配置' : uiState.activePanel === 'simulation' ? '模拟' : '分析'}
				</div>
			</div>
			<div class="text-xs text-gray-400 dark:text-gray-500">
				面试模拟 v1.0.0
			</div>
		</div>
	</div>
</div>