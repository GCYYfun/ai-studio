<script lang="ts">
	import { Card, Heading, P, Button, Badge, Modal, Textarea, Alert } from 'flowbite-svelte';
	import { ui } from '$lib/ui';
	import { onMount } from 'svelte';
	import type { TopicAnalysisResult } from '$lib/services/sim/types';

	const { Icon, Chart } = ui;

	// Props
	let { 
		class: className = '',
		analysisResult = $bindable<TopicAnalysisResult | null>(null),
		onExport = (format: 'json' | 'markdown' | 'pdf') => {},
		showTimeline = true,
		interactive = true
	} = $props();

	// Component state
	let expandedTopic = $state<string | null>(null);
	let selectedTimelineItem = $state<any | null>(null);
	let showExportModal = $state(false);
	let showTopicModal = $state(false);
	let selectedTopicDetail = $state<any | null>(null);
	let viewMode = $state<'overview' | 'detailed' | 'timeline'>('overview');

	// Chart data
	let topicDistributionData = $state<any>(null);
	let timelineData = $state<any[]>([]);

	// Computed properties
	let topicInsights = $derived.by(() => {
		if (!analysisResult) return null;
		
		const totalDialogue = analysisResult.topics.reduce((sum: number, topic: any) => sum + topic.dialogue.length, 0);
		const keyPointsCount = analysisResult.topics.reduce((sum: number, topic: any) => sum + topic.key_points.length, 0);
		const criticalInfoCount = analysisResult.topics.filter((topic: any) => topic.critical_info && topic.critical_info.trim()).length;
		
		return {
			totalTopics: analysisResult.topics.length,
			totalDialogue,
			keyPointsCount,
			criticalInfoCount,
			averageDialoguePerTopic: Math.round(totalDialogue / analysisResult.topics.length),
			topicNames: analysisResult.topics.map((t: any) => t.topic_name),
			mostDiscussedTopic: analysisResult.topics.reduce((max: any, topic: any) => 
				topic.dialogue.length > max.dialogue.length ? topic : max
			),
			topicsWithCriticalInfo: analysisResult.topics.filter((t: any) => t.critical_info && t.critical_info.trim())
		};
	});

	// Update chart data when analysis result changes
	$effect(() => {
		if (analysisResult) {
			updateChartData();
			updateTimelineData();
		}
	});

	function updateChartData() {
		if (!analysisResult) return;

		// Prepare pie chart data for topic distribution
		const chartData = analysisResult.topics.map((topic: any, index: number) => ({
			name: topic.topic_name,
			value: topic.dialogue.length,
			color: getTopicColor(index),
			percentage: Math.round((topic.dialogue.length / analysisResult.topics.reduce((sum: number, t: any) => sum + t.dialogue.length, 0)) * 100)
		}));

		topicDistributionData = {
			labels: chartData.map((d: any) => d.name),
			datasets: [{
				data: chartData.map((d: any) => d.value),
				backgroundColor: chartData.map((d: any) => d.color),
				borderWidth: 2,
				borderColor: '#ffffff'
			}]
		};
	}

	function updateTimelineData() {
		if (!analysisResult) return;

		// Create timeline data from dialogue
		const timeline: any[] = [];
		
		analysisResult.topics.forEach((topic: any, topicIndex: number) => {
			topic.dialogue.forEach((msg: any, msgIndex: number) => {
				timeline.push({
					id: `${topicIndex}-${msgIndex}`,
					topic: topic.topic_name,
					topicIndex,
					role: msg.role,
					content: msg.content,
					name: msg.name,
					timestamp: msg.timestamp,
					color: getTopicColor(topicIndex),
					isKeyPoint: topic.key_points.some((point: any) => 
						msg.content.toLowerCase().includes(point.toLowerCase().substring(0, 10))
					)
				});
			});
		});

		// Sort by timestamp if available
		timeline.sort((a, b) => {
			if (a.timestamp && b.timestamp) {
				return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
			}
			return 0;
		});

		timelineData = timeline;
	}

	function getTopicColor(index: number): string {
		const colors = [
			'#3B82F6', // blue
			'#10B981', // emerald
			'#F59E0B', // amber
			'#EF4444', // red
			'#8B5CF6', // violet
			'#06B6D4', // cyan
			'#84CC16', // lime
			'#F97316', // orange
			'#EC4899', // pink
			'#6366F1'  // indigo
		];
		return colors[index % colors.length];
	}

	function toggleTopic(topicName: string) {
		if (!interactive) return;
		expandedTopic = expandedTopic === topicName ? null : topicName;
	}

	function showTopicDetail(topic: any) {
		selectedTopicDetail = topic;
		showTopicModal = true;
	}

	function selectTimelineItem(item: any) {
		selectedTimelineItem = selectedTimelineItem?.id === item.id ? null : item;
	}

	function exportAnalysis(format: 'json' | 'markdown' | 'pdf') {
		onExport(format);
		showExportModal = false;
	}

	function generateMarkdownReport(): string {
		if (!analysisResult) return '';

		let markdown = `# 面试主题分析报告\n\n`;
		markdown += `**分析日期**: ${analysisResult.analysis_date}\n\n`;
		markdown += `## 整体概览\n\n${analysisResult.overall_summary}\n\n`;
		
		if (topicInsights) {
			markdown += `## 统计信息\n\n`;
			markdown += `- 主题总数: ${topicInsights.totalTopics}\n`;
			markdown += `- 对话轮次: ${topicInsights.totalDialogue}\n`;
			markdown += `- 关键要点: ${topicInsights.keyPointsCount}\n`;
			markdown += `- 风险提示: ${topicInsights.criticalInfoCount}\n`;
			markdown += `- 平均每主题对话: ${topicInsights.averageDialoguePerTopic} 轮\n\n`;
		}

		markdown += `## 主题详情\n\n`;
		analysisResult.topics.forEach((topic: any, index: number) => {
			markdown += `### ${index + 1}. ${topic.topic_name}\n\n`;
			markdown += `**概述**: ${topic.summary}\n\n`;
			
			if (topic.key_points.length > 0) {
				markdown += `**关键要点**:\n`;
				topic.key_points.forEach((point: any) => {
					markdown += `- ${point}\n`;
				});
				markdown += `\n`;
			}
			
			if (topic.critical_info) {
				markdown += `**⚠️ 关键信息**: ${topic.critical_info}\n\n`;
			}
			
			markdown += `**对话记录** (${topic.dialogue.length} 轮):\n\n`;
			topic.dialogue.forEach((msg: any, msgIndex: number) => {
				const speaker = msg.name || msg.role;
				markdown += `**${speaker}**: ${msg.content}\n\n`;
			});
			
			markdown += `---\n\n`;
		});

		return markdown;
	}

	function copyToClipboard(text: string) {
		navigator.clipboard.writeText(text).then(() => {
			// Could show a toast notification here
			console.log('Copied to clipboard');
		});
	}

	function formatTimestamp(timestamp: string): string {
		if (!timestamp) return '';
		try {
			return new Date(timestamp).toLocaleTimeString('zh-CN', {
				hour: '2-digit',
				minute: '2-digit',
				second: '2-digit'
			});
		} catch {
			return timestamp;
		}
	}

	function getDialogueStats(topic: any) {
		const interviewerCount = topic.dialogue.filter((msg: any) => msg.role === 'interviewer').length;
		const candidateCount = topic.dialogue.filter((msg: any) => msg.role === 'candidate').length;
		return { interviewerCount, candidateCount };
	}
</script>

<Card class="shadow-sm hover:shadow-md transition-shadow duration-200 {className}">
	<div class="flex items-center justify-between mb-4">
		<div class="flex items-center space-x-2">
			<Icon name="chart" class="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
			<Heading tag="h3" class="text-lg font-semibold">主题分析</Heading>
		</div>
		<div class="flex items-center space-x-2">
			<!-- View Mode Toggle -->
			<div class="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
				<button 
					class="px-2 py-1 text-xs rounded {viewMode === 'overview' ? 'bg-white dark:bg-gray-600 shadow-sm' : ''}"
					onclick={() => viewMode = 'overview'}
				>
					概览
				</button>
				<button 
					class="px-2 py-1 text-xs rounded {viewMode === 'detailed' ? 'bg-white dark:bg-gray-600 shadow-sm' : ''}"
					onclick={() => viewMode = 'detailed'}
				>
					详情
				</button>
				{#if showTimeline}
					<button 
						class="px-2 py-1 text-xs rounded {viewMode === 'timeline' ? 'bg-white dark:bg-gray-600 shadow-sm' : ''}"
						onclick={() => viewMode = 'timeline'}
					>
						时间线
					</button>
				{/if}
			</div>
			<Button color="alternative" size="small" onclick={() => showExportModal = true}>
				<Icon name="download" class="w-3 h-3 mr-1" />
				导出
			</Button>
		</div>
	</div>

	{#if !analysisResult}
		<!-- Empty State -->
		<div class="text-center py-12 text-gray-500 dark:text-gray-400">
			<Icon name="chart" class="w-16 h-16 mx-auto mb-4 opacity-40" />
			<P class="text-lg font-medium mb-2">暂无分析结果</P>
			<P class="text-sm">请先运行主题分析以查看结果</P>
		</div>
	{:else}
		<div class="space-y-4">
			<!-- Analysis Overview -->
			<div class="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-lg">
				<div class="flex items-center justify-between mb-3">
					<P class="text-sm font-medium text-indigo-700 dark:text-indigo-300">
						分析日期: {analysisResult.analysis_date}
					</P>
					{#if topicInsights}
						<div class="flex items-center space-x-4 text-xs text-indigo-600 dark:text-indigo-400">
							<span>{topicInsights.totalTopics} 个主题</span>
							<span>{topicInsights.totalDialogue} 轮对话</span>
							<span>{topicInsights.keyPointsCount} 个要点</span>
						</div>
					{/if}
				</div>
				<P class="text-sm text-gray-700 dark:text-gray-300">
					{analysisResult.overall_summary}
				</P>
			</div>

			<!-- Statistics Cards -->
			{#if topicInsights && viewMode === 'overview'}
				<div class="grid grid-cols-2 md:grid-cols-4 gap-3">
					<div class="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
						<P class="text-2xl font-bold text-blue-600 dark:text-blue-400">
							{topicInsights.totalTopics}
						</P>
						<P class="text-xs text-blue-500 dark:text-blue-300">主题总数</P>
					</div>
					<div class="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
						<P class="text-2xl font-bold text-green-600 dark:text-green-400">
							{topicInsights.totalDialogue}
						</P>
						<P class="text-xs text-green-500 dark:text-green-300">对话轮次</P>
					</div>
					<div class="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-center">
						<P class="text-2xl font-bold text-amber-600 dark:text-amber-400">
							{topicInsights.keyPointsCount}
						</P>
						<P class="text-xs text-amber-500 dark:text-amber-300">关键要点</P>
					</div>
					<div class="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-center">
						<P class="text-2xl font-bold text-red-600 dark:text-red-400">
							{topicInsights.criticalInfoCount}
						</P>
						<P class="text-xs text-red-500 dark:text-red-300">风险提示</P>
					</div>
				</div>
			{/if}

			<!-- Topic Distribution Chart -->
			{#if viewMode === 'overview' && topicDistributionData}
				<div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
					<div class="flex items-center justify-between mb-3">
						<P class="text-sm font-medium text-gray-700 dark:text-gray-300">主题分布</P>
						<P class="text-xs text-gray-500 dark:text-gray-400">按对话轮次统计</P>
					</div>
					
					<!-- Simple bar chart representation -->
					<div class="space-y-2">
						{#each analysisResult.topics as topic, index}
							{@const percentage = Math.round((topic.dialogue.length / topicInsights.totalDialogue) * 100)}
							<div class="flex items-center space-x-3">
								<div class="w-20 text-xs text-gray-600 dark:text-gray-400 truncate">
									{topic.topic_name}
								</div>
								<div class="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
									<div 
										class="h-2 rounded-full transition-all duration-500"
										style="width: {percentage}%; background-color: {getTopicColor(index)}"
									></div>
								</div>
								<div class="w-12 text-xs text-gray-500 dark:text-gray-400 text-right">
									{percentage}%
								</div>
								<div class="w-8 text-xs text-gray-400 dark:text-gray-500 text-right">
									{topic.dialogue.length}
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Detailed Topic View -->
			{#if viewMode === 'detailed'}
				<div class="space-y-3">
					{#each analysisResult.topics as topic, index}
						{@const stats = getDialogueStats(topic)}
						<div class="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
							<button 
								class="w-full p-4 text-left bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
								onclick={() => toggleTopic(topic.topic_name)}
							>
								<div class="flex items-center justify-between">
									<div class="flex-1">
										<div class="flex items-center space-x-3 mb-2">
											<div 
												class="w-3 h-3 rounded-full"
												style="background-color: {getTopicColor(index)}"
											></div>
											<h4 class="font-medium text-gray-900 dark:text-white">
												{topic.topic_name}
											</h4>
											<Badge color="gray" size="small">
												{topic.dialogue.length} 轮
											</Badge>
											{#if topic.critical_info}
												<Badge color="red" size="small">
													<Icon name="alert" class="w-3 h-3 mr-1" />
													风险
												</Badge>
											{/if}
										</div>
										<p class="text-sm text-gray-600 dark:text-gray-400">{topic.summary}</p>
									</div>
									<div class="flex items-center space-x-2">
										<div class="text-xs text-gray-500 dark:text-gray-400 text-right">
											<div>面试官: {stats.interviewerCount}</div>
											<div>候选人: {stats.candidateCount}</div>
										</div>
										<Icon 
											name="chevron-down" 
											class="w-4 h-4 text-gray-400 {expandedTopic === topic.topic_name ? 'rotate-180' : ''} transition-transform duration-200" 
										/>
									</div>
								</div>
							</button>
							
							{#if expandedTopic === topic.topic_name}
								<div class="p-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
									<div class="space-y-4">
										<!-- Key Points -->
										{#if topic.key_points.length > 0}
											<div>
												<P class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
													关键要点:
												</P>
												<div class="grid grid-cols-1 md:grid-cols-2 gap-2">
													{#each topic.key_points as point}
														<div class="flex items-start space-x-2">
															<Icon name="check" class="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
															<span class="text-sm text-gray-600 dark:text-gray-400">{point}</span>
														</div>
													{/each}
												</div>
											</div>
										{/if}

										<!-- Critical Information -->
										{#if topic.critical_info}
											<div>
												<P class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
													⚠️ 关键信息:
												</P>
												<div class="p-3 bg-red-50 dark:bg-red-900/20 rounded border-l-4 border-red-400">
													<P class="text-sm text-red-700 dark:text-red-300">
														{topic.critical_info}
													</P>
												</div>
											</div>
										{/if}

										<!-- Action Buttons -->
										<div class="flex space-x-2">
											<Button 
												color="blue" 
												size="xs" 
												onclick={() => showTopicDetail(topic)}
											>
												<Icon name="eye" class="w-3 h-3 mr-1" />
												查看对话
											</Button>
											<Button 
												color="alternative" 
												size="xs" 
												onclick={() => copyToClipboard(JSON.stringify(topic, null, 2))}
											>
												<Icon name="copy" class="w-3 h-3 mr-1" />
												复制数据
											</Button>
										</div>
									</div>
								</div>
							{/if}
						</div>
					{/each}
				</div>
			{/if}

			<!-- Timeline View -->
			{#if viewMode === 'timeline' && timelineData.length > 0}
				<div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
					<P class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
						对话时间线 ({timelineData.length} 条消息)
					</P>
					
					<div class="space-y-3 max-h-96 overflow-y-auto">
						{#each timelineData as item, index}
							<button
								class="w-full flex items-start space-x-3 p-3 text-left bg-white dark:bg-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors {selectedTimelineItem?.id === item.id ? 'ring-2 ring-blue-500' : ''}"
								onclick={() => selectTimelineItem(item)}
							>
								<!-- Timeline indicator -->
								<div class="flex flex-col items-center">
									<div 
										class="w-3 h-3 rounded-full border-2 border-white"
										style="background-color: {item.color}"
									></div>
									{#if index < timelineData.length - 1}
										<div class="w-0.5 h-8 bg-gray-300 dark:bg-gray-600 mt-1"></div>
									{/if}
								</div>
								
								<!-- Content -->
								<div class="flex-1 min-w-0">
									<div class="flex items-center space-x-2 mb-1">
										<Badge 
											color={item.role === 'interviewer' ? 'blue' : 'green'} 
											size="sm"
										>
											{item.name || item.role}
										</Badge>
										<Badge color="gray" size="small">{item.topic}</Badge>
										{#if item.isKeyPoint}
											<Badge color="yellow" size="small">
												<Icon name="star" class="w-2 h-2 mr-1" />
												要点
											</Badge>
										{/if}
										{#if item.timestamp}
											<span class="text-xs text-gray-500 dark:text-gray-400">
												{formatTimestamp(item.timestamp)}
											</span>
										{/if}
									</div>
									<p class="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
										{item.content}
									</p>
								</div>
							</button>
						{/each}
					</div>

					<!-- Selected timeline item detail -->
					{#if selectedTimelineItem}
						<div class="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-600">
							<div class="flex items-center justify-between mb-2">
								<div class="flex items-center space-x-2">
									<Badge 
										color={selectedTimelineItem.role === 'interviewer' ? 'blue' : 'green'}
									>
										{selectedTimelineItem.name || selectedTimelineItem.role}
									</Badge>
									<Badge color="gray">{selectedTimelineItem.topic}</Badge>
								</div>
								<Button 
									color="alternative" 
									size="xs" 
									onclick={() => selectedTimelineItem = null}
								>
									<Icon name="x" class="w-3 h-3" />
								</Button>
							</div>
							<p class="text-sm text-blue-700 dark:text-blue-300">
								{selectedTimelineItem.content}
							</p>
						</div>
					{/if}
				</div>
			{/if}

			<!-- Most Discussed Topic Highlight -->
			{#if topicInsights && viewMode === 'overview'}
				<div class="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border border-green-200 dark:border-green-600">
					<div class="flex items-center space-x-2 mb-2">
						<Icon name="trending-up" class="w-4 h-4 text-green-600 dark:text-green-400" />
						<P class="text-sm font-medium text-green-700 dark:text-green-300">
							讨论最多的主题
						</P>
					</div>
					<div class="flex items-center justify-between">
						<div>
							<P class="font-medium text-green-800 dark:text-green-200">
								{topicInsights.mostDiscussedTopic.topic_name}
							</P>
							<P class="text-sm text-green-600 dark:text-green-400">
								{topicInsights.mostDiscussedTopic.dialogue.length} 轮对话 • {topicInsights.mostDiscussedTopic.key_points.length} 个要点
							</P>
						</div>
						<Button 
							color="green" 
							size="sm" 
							onclick={() => showTopicDetail(topicInsights.mostDiscussedTopic)}
						>
							查看详情
						</Button>
					</div>
				</div>
			{/if}
		</div>
	{/if}
</Card>

<!-- Topic Detail Modal -->
<Modal bind:open={showTopicModal} size="xl" autoclose>
	{#if selectedTopicDetail}
		<div class="space-y-4">
			<div class="flex items-center space-x-2">
				<Icon name="chat" class="w-5 h-5 text-blue-600" />
				<Heading tag="h3" class="text-lg font-semibold">
					{selectedTopicDetail.topic_name} - 对话详情
				</Heading>
			</div>
			
			<!-- Topic Summary -->
			<div class="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
				<P class="text-sm text-gray-700 dark:text-gray-300">
					{selectedTopicDetail.summary}
				</P>
			</div>

			<!-- Dialogue -->
			<div class="space-y-3 max-h-96 overflow-y-auto">
				{#each selectedTopicDetail.dialogue as msg, index}
					<div class="flex items-start space-x-3">
						<div class="flex-shrink-0">
							<div class="w-8 h-8 rounded-full bg-{msg.role === 'interviewer' ? 'blue' : 'green'}-100 dark:bg-{msg.role === 'interviewer' ? 'blue' : 'green'}-900/20 flex items-center justify-center">
								<Icon 
									name={msg.role === 'interviewer' ? 'user-tie' : 'user'} 
									class="w-4 h-4 text-{msg.role === 'interviewer' ? 'blue' : 'green'}-600 dark:text-{msg.role === 'interviewer' ? 'blue' : 'green'}-400" 
								/>
							</div>
						</div>
						<div class="flex-1 min-w-0">
							<div class="flex items-center space-x-2 mb-1">
								<P class="text-sm font-medium text-gray-900 dark:text-white">
									{msg.name || msg.role}
								</P>
								{#if msg.timestamp}
									<P class="text-xs text-gray-500 dark:text-gray-400">
										{formatTimestamp(msg.timestamp)}
									</P>
								{/if}
							</div>
							<div class="p-3 bg-{msg.role === 'interviewer' ? 'blue' : 'green'}-50 dark:bg-{msg.role === 'interviewer' ? 'blue' : 'green'}-900/20 rounded-lg">
								<P class="text-sm text-gray-700 dark:text-gray-300">
									{msg.content}
								</P>
							</div>
						</div>
					</div>
				{/each}
			</div>
			
			<div class="flex justify-end space-x-2">
				<Button 
					color="alternative" 
					onclick={() => copyToClipboard(JSON.stringify(selectedTopicDetail, null, 2))}
				>
					<Icon name="copy" class="w-4 h-4 mr-2" />
					复制数据
				</Button>
				<Button color="blue" onclick={() => showTopicModal = false}>
					关闭
				</Button>
			</div>
		</div>
	{/if}
</Modal>

<!-- Export Modal -->
<Modal bind:open={showExportModal} size="md" autoclose>
	<div class="space-y-4">
		<div class="flex items-center space-x-2">
			<Icon name="download" class="w-5 h-5 text-indigo-600" />
			<Heading tag="h3" class="text-lg font-semibold">导出分析结果</Heading>
		</div>
		
		<div class="space-y-3">
			<Button 
				color="blue" 
				onclick={() => exportAnalysis('json')}
				class="w-full justify-start"
			>
				<Icon name="code" class="w-4 h-4 mr-2" />
				JSON 格式 (结构化数据)
			</Button>
			
			<Button 
				color="green" 
				onclick={() => exportAnalysis('markdown')}
				class="w-full justify-start"
			>
				<Icon name="document" class="w-4 h-4 mr-2" />
				Markdown 格式 (报告文档)
			</Button>
			
			<Button 
				color="red" 
				onclick={() => exportAnalysis('pdf')}
				class="w-full justify-start"
			>
				<Icon name="document-text" class="w-4 h-4 mr-2" />
				PDF 格式 (打印版本)
			</Button>
		</div>

		<!-- Preview -->
		{#if analysisResult}
			<div class="mt-4">
				<P class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
					Markdown 预览:
				</P>
				<Textarea 
					value={generateMarkdownReport()} 
					rows={8} 
					readonly 
					class="font-mono text-xs"
				/>
			</div>
		{/if}
		
		<div class="flex justify-end">
			<Button color="alternative" onclick={() => showExportModal = false}>
				取消
			</Button>
		</div>
	</div>
</Modal>