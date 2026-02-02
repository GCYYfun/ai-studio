<script lang="ts">
	import { Card, Heading, P, Button, Badge, Modal, Textarea, Alert, Progressbar } from 'flowbite-svelte';
	import { ui } from '$lib/ui';
	import { onMount } from 'svelte';
	import type { EvaluationResult, DimensionScore } from '$lib/services/sim/types';

	const { Icon, Chart } = ui;

	// Props
	let { 
		class: className = '',
		evaluationResult = $bindable<EvaluationResult | null>(null),
		onExport = (format: 'json' | 'markdown' | 'pdf') => {},
		showConfidenceDetails = true,
		interactive = true
	} = $props();

	// Component state
	let selectedDimension = $state<string | null>(null);
	let showExportModal = $state(false);
	let showFollowUpModal = $state(false);
	let showDimensionModal = $state(false);
	let selectedDimensionDetail = $state<{ name: string; data: DimensionScore } | null>(null);
	let viewMode = $state<'overview' | 'detailed' | 'comparison'>('overview');

	// Chart data
	let radarChartData = $state<any>(null);
	let confidenceChartData = $state<any>(null);

	// Computed properties
	let evaluationInsights = $derived.by(() => {
		if (!evaluationResult) return null;
		
		const dimensions = Object.entries(evaluationResult.dimensions);
		const scores = dimensions.map(([_, data]: [string, any]) => data.score);
		const confidences = dimensions.map(([_, data]: [string, any]) => data.confidence_score);
		
		const averageScore = scores.reduce((sum: number, score: number) => sum + score, 0) / scores.length;
		const averageConfidence = confidences.reduce((sum: number, conf: number) => sum + conf, 0) / confidences.length;
		
		const topDimensions = dimensions
			.sort(([, a]: [string, any], [, b]: [string, any]) => b.score - a.score)
			.slice(0, 3)
			.map(([name, data]: [string, any]) => ({ name, score: data.score }));
		
		const lowConfidenceDimensions = dimensions
			.filter(([, data]: [string, any]) => data.confidence_score < 70)
			.map(([name, data]: [string, any]) => ({ name, confidence: data.confidence_score }));

		const highScoreDimensions = dimensions
			.filter(([, data]: [string, any]) => data.score >= 8)
			.map(([name, data]: [string, any]) => ({ name, score: data.score }));

		const needsImprovementDimensions = dimensions
			.filter(([, data]: [string, any]) => data.score < 6)
			.map(([name, data]: [string, any]) => ({ name, score: data.score }));

		return {
			averageScore: Math.round(averageScore * 100) / 100,
			averageConfidence: Math.round(averageConfidence * 100) / 100,
			topDimensions,
			lowConfidenceDimensions,
			highScoreDimensions,
			needsImprovementDimensions,
			dimensionCount: dimensions.length,
			followUpQuestionsCount: Object.keys(evaluationResult.suggested_follow_up_questions).length
		};
	});

	// Update chart data when evaluation result changes
	$effect(() => {
		if (evaluationResult) {
			updateRadarChartData();
			updateConfidenceChartData();
		}
	});

	function updateRadarChartData() {
		if (!evaluationResult) return;

		const dimensions = Object.entries(evaluationResult.dimensions);
		const labels = dimensions.map(([name, _]: [string, any]) => name);
		const scores = dimensions.map(([_, data]: [string, any]) => data.score);
		const confidences = dimensions.map(([_, data]: [string, any]) => data.confidence_score);

		radarChartData = {
			labels,
			datasets: [
				{
					label: '能力评分',
					data: scores,
					borderColor: 'rgb(59, 130, 246)',
					backgroundColor: 'rgba(59, 130, 246, 0.2)',
					borderWidth: 2,
					pointBackgroundColor: 'rgb(59, 130, 246)',
					pointBorderColor: '#fff',
					pointHoverBackgroundColor: '#fff',
					pointHoverBorderColor: 'rgb(59, 130, 246)'
				},
				{
					label: '置信度',
					data: confidences,
					borderColor: 'rgb(16, 185, 129)',
					backgroundColor: 'rgba(16, 185, 129, 0.1)',
					borderWidth: 1,
					borderDash: [5, 5],
					pointBackgroundColor: 'rgb(16, 185, 129)',
					pointBorderColor: '#fff'
				}
			]
		};
	}

	function updateConfidenceChartData() {
		if (!evaluationResult) return;

		const dimensions = Object.entries(evaluationResult.dimensions);
		const labels = dimensions.map(([name, _]: [string, any]) => name);
		const confidences = dimensions.map(([_, data]: [string, any]) => data.confidence_score);

		confidenceChartData = {
			labels,
			datasets: [{
				label: '置信度',
				data: confidences,
				backgroundColor: confidences.map(conf => 
					conf >= 80 ? 'rgba(16, 185, 129, 0.8)' :
					conf >= 60 ? 'rgba(245, 158, 11, 0.8)' :
					'rgba(239, 68, 68, 0.8)'
				),
				borderColor: confidences.map(conf => 
					conf >= 80 ? 'rgb(16, 185, 129)' :
					conf >= 60 ? 'rgb(245, 158, 11)' :
					'rgb(239, 68, 68)'
				),
				borderWidth: 1
			}]
		};
	}

	function selectDimension(dimension: string) {
		if (!interactive) return;
		selectedDimension = selectedDimension === dimension ? null : dimension;
	}

	function showDimensionDetail(dimensionName: string, dimensionData: DimensionScore) {
		selectedDimensionDetail = { name: dimensionName, data: dimensionData };
		showDimensionModal = true;
	}

	function exportEvaluation(format: 'json' | 'markdown' | 'pdf') {
		onExport(format);
		showExportModal = false;
	}

	function getScoreColor(score: number): string {
		if (score >= 8) return 'text-green-600 dark:text-green-400';
		if (score >= 6) return 'text-yellow-600 dark:text-yellow-400';
		return 'text-red-600 dark:text-red-400';
	}

	function getScoreBgColor(score: number): string {
		if (score >= 8) return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
		if (score >= 6) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300';
		return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
	}

	function getConfidenceColor(confidence: number): string {
		if (confidence >= 80) return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
		if (confidence >= 60) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300';
		return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
	}

	function getRecommendationColor(recommendation: string): "green" | "blue" | "yellow" | "red" | "gray" {
		const rec = recommendation.toLowerCase();
		if (rec.includes('强烈推荐') || rec.includes('优秀')) return 'green';
		if (rec.includes('推荐') || rec.includes('合适')) return 'blue';
		if (rec.includes('考虑') || rec.includes('一般')) return 'yellow';
		if (rec.includes('不推荐') || rec.includes('不合适')) return 'red';
		return 'gray';
	}

	function generateMarkdownReport(): string {
		if (!evaluationResult) return '';

		let markdown = `# 六维能力评估报告\n\n`;
		markdown += `**候选人**: ${evaluationResult.candidate_name}\n`;
		markdown += `**职位**: ${evaluationResult.position}\n`;
		markdown += `**评估日期**: ${evaluationResult.evaluation_date}\n`;
		markdown += `**综合评分**: ${evaluationResult.overall_rating}/10\n`;
		markdown += `**整体置信度**: ${evaluationResult.overall_confidence}/100\n\n`;

		markdown += `## 评估摘要\n\n${evaluationResult.summary}\n\n`;

		markdown += `## 六维能力详情\n\n`;
		Object.entries(evaluationResult.dimensions).forEach(([dimension, data]: [string, any]) => {
			markdown += `### ${dimension}\n\n`;
			markdown += `- **评分**: ${data.score}/10\n`;
			markdown += `- **置信度**: ${data.confidence_score}/100\n`;
			markdown += `- **评估**: ${data.assessment}\n`;
			if (data.missing_info) {
				markdown += `- **缺失信息**: ${data.missing_info}\n`;
			}
			markdown += `- **置信度说明**: ${data.confidence_justification}\n\n`;
		});

		markdown += `## 优势与不足\n\n`;
		markdown += `### 主要优势\n\n`;
		evaluationResult.strengths.forEach((strength: any) => {
			markdown += `- ${strength}\n`;
		});

		markdown += `\n### 待改进方面\n\n`;
		evaluationResult.weaknesses.forEach((weakness: any) => {
			markdown += `- ${weakness}\n`;
		});

		if (Object.keys(evaluationResult.suggested_follow_up_questions).length > 0) {
			markdown += `\n## 建议追问问题\n\n`;
			Object.entries(evaluationResult.suggested_follow_up_questions).forEach(([dimension, question]) => {
				markdown += `**${dimension}**: ${question}\n\n`;
			});
		}

		markdown += `## 录用建议\n\n${evaluationResult.hiring_recommendation}\n`;

		return markdown;
	}

	function copyToClipboard(text: string) {
		navigator.clipboard.writeText(text).then(() => {
			console.log('Copied to clipboard');
		});
	}

	function formatDate(dateStr: string): string {
		try {
			return new Date(dateStr).toLocaleDateString('zh-CN', {
				year: 'numeric',
				month: '2-digit',
				day: '2-digit'
			});
		} catch {
			return dateStr;
		}
	}
</script>

<Card class="shadow-sm hover:shadow-md transition-shadow duration-200 {className}">
	<div class="flex items-center justify-between mb-4">
		<div class="flex items-center space-x-2">
			<Icon name="user" class="w-5 h-5 text-blue-600 dark:text-blue-400" />
			<Heading tag="h3" class="text-lg font-semibold">六维能力评估</Heading>
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
				<button 
					class="px-2 py-1 text-xs rounded {viewMode === 'comparison' ? 'bg-white dark:bg-gray-600 shadow-sm' : ''}"
					onclick={() => viewMode = 'comparison'}
				>
					对比
				</button>
			</div>
			<Button color="alternative" size="small" onclick={() => showExportModal = true}>
				<Icon name="download" class="w-3 h-3 mr-1" />
				导出
			</Button>
		</div>
	</div>

	{#if !evaluationResult}
		<!-- Empty State -->
		<div class="text-center py-12 text-gray-500 dark:text-gray-400">
			<Icon name="user" class="w-16 h-16 mx-auto mb-4 opacity-40" />
			<P class="text-lg font-medium mb-2">暂无评估结果</P>
			<P class="text-sm">请先运行能力评估以查看结果</P>
		</div>
	{:else}
		<div class="space-y-4">
			<!-- Candidate Basic Information -->
			<div class="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg">
				<div class="flex items-center justify-between mb-3">
					<div class="flex items-center space-x-3">
						<h4 class="font-medium text-blue-700 dark:text-blue-300">
							{evaluationResult.candidate_name}
						</h4>
						<Badge color="blue">{evaluationResult.position}</Badge>
						<Badge color={getRecommendationColor(evaluationResult.hiring_recommendation)}>
							{evaluationResult.hiring_recommendation.includes('推荐') ? '推荐' : 
							 evaluationResult.hiring_recommendation.includes('考虑') ? '考虑' : '待定'}
						</Badge>
					</div>
					<div class="text-xs text-blue-600 dark:text-blue-400">
						{formatDate(evaluationResult.evaluation_date)}
					</div>
				</div>
				
				<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
					<div class="text-center">
						<P class="text-2xl font-bold text-blue-600 dark:text-blue-400">
							{evaluationResult.overall_rating}
						</P>
						<P class="text-xs text-blue-500 dark:text-blue-300">综合评分</P>
					</div>
					<div class="text-center">
						<P class="text-2xl font-bold text-green-600 dark:text-green-400">
							{evaluationResult.overall_confidence}
						</P>
						<P class="text-xs text-green-500 dark:text-green-300">整体置信度</P>
					</div>
					{#if evaluationInsights}
						<div class="text-center">
							<P class="text-2xl font-bold text-purple-600 dark:text-purple-400">
								{evaluationInsights.highScoreDimensions.length}
							</P>
							<P class="text-xs text-purple-500 dark:text-purple-300">优势维度</P>
						</div>
						<div class="text-center">
							<P class="text-2xl font-bold text-amber-600 dark:text-amber-400">
								{evaluationInsights.followUpQuestionsCount}
							</P>
							<P class="text-xs text-amber-500 dark:text-amber-300">追问建议</P>
						</div>
					{/if}
				</div>
			</div>

			<!-- Radar Chart Placeholder -->
			{#if viewMode === 'overview'}
				<div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
					<div class="flex items-center justify-between mb-3">
						<P class="text-sm font-medium text-gray-700 dark:text-gray-300">六维能力雷达图</P>
						<P class="text-xs text-gray-500 dark:text-gray-400">评分 vs 置信度</P>
					</div>
					
					<!-- Simple radar chart representation -->
					<div class="relative w-full h-64 bg-white dark:bg-gray-700 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center">
						<div class="text-center text-gray-500 dark:text-gray-400">
							<div class="w-16 h-16 mx-auto mb-2 border-2 border-gray-300 dark:border-gray-600 rounded-full flex items-center justify-center">
								<Icon name="chart" class="w-8 h-8 opacity-40" />
							</div>
							<P class="text-sm">雷达图可视化</P>
							<P class="text-xs">展示六维能力评分分布</P>
						</div>
					</div>
				</div>
			{/if}

			<!-- Detailed Dimensions View -->
			{#if viewMode === 'detailed'}
				<div class="space-y-3">
					{#each Object.entries(evaluationResult.dimensions) as [dimension, data], index}
						<div class="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
							<button 
								class="w-full p-4 text-left bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
								onclick={() => selectDimension(dimension)}
							>
								<div class="flex items-center justify-between">
									<div class="flex-1">
										<div class="flex items-center space-x-3 mb-2">
											<h4 class="font-medium text-gray-900 dark:text-white">
												{dimension}
											</h4>
											<Badge class={getScoreBgColor(data.score)} size="small">
												{data.score}/10
											</Badge>
											<Badge class={getConfidenceColor(data.confidence_score)} size="small">
												置信度: {data.confidence_score}%
											</Badge>
											{#if data.missing_info}
												<Badge color="yellow" size="small">
													<Icon name="alert" class="w-3 h-3 mr-1" />
													需补充
												</Badge>
											{/if}
										</div>
										<p class="text-sm text-gray-600 dark:text-gray-400">
											{data.assessment}
										</p>
									</div>
									<div class="flex items-center space-x-2">
										<Button 
											color="blue" 
											size="xs" 
											onclick={(e: Event) => {
												e.stopPropagation();
												showDimensionDetail(dimension, data);
											}}
										>
											详情
										</Button>
										<Icon 
											name="chevron-down" 
											class="w-4 h-4 text-gray-400 {selectedDimension === dimension ? 'rotate-180' : ''} transition-transform duration-200" 
										/>
									</div>
								</div>
							</button>
							
							{#if selectedDimension === dimension}
								<div class="p-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
									<div class="space-y-3">
										<!-- Score Progress Bar -->
										<div>
											<div class="flex items-center justify-between mb-1">
												<P class="text-sm font-medium text-gray-700 dark:text-gray-300">
													评分进度
												</P>
												<P class="text-sm text-gray-600 dark:text-gray-400">
													{data.score}/10
												</P>
											</div>
											<Progressbar 
												progress={data.score * 10} 
												color={data.score >= 8 ? 'green' : data.score >= 6 ? 'yellow' : 'red'}
												size="h-2"
											/>
										</div>

										<!-- Confidence Progress Bar -->
										<div>
											<div class="flex items-center justify-between mb-1">
												<P class="text-sm font-medium text-gray-700 dark:text-gray-300">
													置信度
												</P>
												<P class="text-sm text-gray-600 dark:text-gray-400">
													{data.confidence_score}%
												</P>
											</div>
											<Progressbar 
												progress={data.confidence_score} 
												color={data.confidence_score >= 80 ? 'green' : data.confidence_score >= 60 ? 'yellow' : 'red'}
												size="h-2"
											/>
										</div>

										<!-- Missing Information -->
										{#if data.missing_info}
											<div class="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded border-l-4 border-yellow-400">
												<P class="text-sm font-medium text-yellow-700 dark:text-yellow-300 mb-1">
													缺失信息:
												</P>
												<P class="text-sm text-yellow-600 dark:text-yellow-400">
													{data.missing_info}
												</P>
											</div>
										{/if}

										<!-- Confidence Justification -->
										<div class="p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
											<P class="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">
												置信度说明:
											</P>
											<P class="text-sm text-blue-600 dark:text-blue-400">
												{data.confidence_justification}
											</P>
										</div>
									</div>
								</div>
							{/if}
						</div>
					{/each}
				</div>
			{/if}

			<!-- Comparison View -->
			{#if viewMode === 'comparison'}
				<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
					{#each Object.entries(evaluationResult.dimensions) as [dimension, data]}
						<div class="p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
							<div class="flex items-center justify-between mb-3">
								<span class="font-medium text-gray-900 dark:text-white text-sm">
									{dimension}
								</span>
								<div class="flex items-center space-x-2">
									<Badge class={getScoreBgColor(data.score)} size="small">
										{data.score}
									</Badge>
									<Badge class={getConfidenceColor(data.confidence_score)} size="small">
										{data.confidence_score}%
									</Badge>
								</div>
							</div>
							
							<!-- Score vs Confidence Comparison -->
							<div class="space-y-2">
								<div class="flex items-center space-x-2">
									<span class="text-xs text-gray-500 dark:text-gray-400 w-12">评分</span>
									<div class="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
										<div 
											class="h-2 rounded-full bg-blue-500"
											style="width: {data.score * 10}%"
										></div>
									</div>
									<span class="text-xs text-gray-600 dark:text-gray-400 w-8">
										{data.score}
									</span>
								</div>
								<div class="flex items-center space-x-2">
									<span class="text-xs text-gray-500 dark:text-gray-400 w-12">置信</span>
									<div class="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
										<div 
											class="h-2 rounded-full bg-green-500"
											style="width: {data.confidence_score}%"
										></div>
									</div>
									<span class="text-xs text-gray-600 dark:text-gray-400 w-8">
										{data.confidence_score}
									</span>
								</div>
							</div>
						</div>
					{/each}
				</div>
			{/if}

			<!-- Strengths and Weaknesses -->
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div class="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
					<h4 class="font-medium text-green-700 dark:text-green-300 mb-3 flex items-center">
						<Icon name="star" class="w-4 h-4 mr-2" />
						主要优势 ({evaluationResult.strengths.length})
					</h4>
					<div class="space-y-2">
						{#each evaluationResult.strengths as strength, index}
							<div class="flex items-start space-x-2">
								<span class="text-xs text-green-500 dark:text-green-400 mt-1">
									{index + 1}.
								</span>
								<span class="text-sm text-green-600 dark:text-green-400 flex-1">
									{strength}
								</span>
							</div>
						{/each}
					</div>
				</div>
				
				<div class="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
					<h4 class="font-medium text-orange-700 dark:text-orange-300 mb-3 flex items-center">
						<Icon name="alert" class="w-4 h-4 mr-2" />
						待改进方面 ({evaluationResult.weaknesses.length})
					</h4>
					<div class="space-y-2">
						{#each evaluationResult.weaknesses as weakness, index}
							<div class="flex items-start space-x-2">
								<span class="text-xs text-orange-500 dark:text-orange-400 mt-1">
									{index + 1}.
								</span>
								<span class="text-sm text-orange-600 dark:text-orange-400 flex-1">
									{weakness}
								</span>
							</div>
						{/each}
					</div>
				</div>
			</div>

			<!-- Follow-up Questions -->
			{#if Object.keys(evaluationResult.suggested_follow_up_questions).length > 0}
				<div class="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
					<div class="flex items-center justify-between mb-3">
						<h4 class="font-medium text-amber-700 dark:text-amber-300 flex items-center">
							<Icon name="question" class="w-4 h-4 mr-2" />
							建议追问问题 ({Object.keys(evaluationResult.suggested_follow_up_questions).length})
						</h4>
						<Button 
							color="amber" 
							size="sm" 
							onclick={() => showFollowUpModal = true}
						>
							查看全部
						</Button>
					</div>
					<div class="space-y-2">
						{#each Object.entries(evaluationResult.suggested_follow_up_questions).slice(0, 2) as [dimension, question]}
							<div class="p-2 bg-white dark:bg-amber-900/10 rounded border-l-4 border-amber-400">
								<P class="text-xs font-medium text-amber-700 dark:text-amber-300 mb-1">
									{dimension}:
								</P>
								<P class="text-sm text-amber-600 dark:text-amber-400">
									{question}
								</P>
							</div>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Hiring Recommendation -->
			<div class="p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg border border-purple-200 dark:border-purple-600">
				<div class="flex items-center justify-between mb-2">
					<h4 class="font-medium text-purple-700 dark:text-purple-300 flex items-center">
						<Icon name="check-circle" class="w-4 h-4 mr-2" />
						录用建议
					</h4>
					<Badge color={getRecommendationColor(evaluationResult.hiring_recommendation)}>
						{evaluationResult.hiring_recommendation.includes('强烈') ? '强烈推荐' :
						 evaluationResult.hiring_recommendation.includes('推荐') ? '推荐' :
						 evaluationResult.hiring_recommendation.includes('考虑') ? '考虑' : '待定'}
					</Badge>
				</div>
				<p class="text-sm text-purple-600 dark:text-purple-400">
					{evaluationResult.hiring_recommendation}
				</p>
			</div>

			<!-- Summary -->
			<div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
				<h4 class="font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
					<Icon name="document-text" class="w-4 h-4 mr-2" />
					评估总结
				</h4>
				<p class="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
					{evaluationResult.summary}
				</p>
			</div>
		</div>
	{/if}
</Card>

<!-- Dimension Detail Modal -->
<Modal bind:open={showDimensionModal} size="lg" autoclose>
	{#if selectedDimensionDetail}
		<div class="space-y-4">
			<div class="flex items-center space-x-2">
				<Icon name="user" class="w-5 h-5 text-blue-600" />
				<Heading tag="h3" class="text-lg font-semibold">
					{selectedDimensionDetail.name} - 详细分析
				</Heading>
			</div>
			
			<!-- Score and Confidence -->
			<div class="grid grid-cols-2 gap-4">
				<div class="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
					<P class="text-2xl font-bold text-blue-600 dark:text-blue-400">
						{selectedDimensionDetail.data.score}
					</P>
					<P class="text-sm text-blue-500 dark:text-blue-300">评分 (满分10)</P>
				</div>
				<div class="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
					<P class="text-2xl font-bold text-green-600 dark:text-green-400">
						{selectedDimensionDetail.data.confidence_score}%
					</P>
					<P class="text-sm text-green-500 dark:text-green-300">置信度</P>
				</div>
			</div>

			<!-- Assessment -->
			<div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
				<P class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">评估详情:</P>
				<P class="text-sm text-gray-600 dark:text-gray-400">
					{selectedDimensionDetail.data.assessment}
				</P>
			</div>

			<!-- Missing Information -->
			{#if selectedDimensionDetail.data.missing_info}
				<div class="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-600">
					<P class="text-sm font-medium text-yellow-700 dark:text-yellow-300 mb-2">缺失信息:</P>
					<P class="text-sm text-yellow-600 dark:text-yellow-400">
						{selectedDimensionDetail.data.missing_info}
					</P>
				</div>
			{/if}

			<!-- Confidence Justification -->
			<div class="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-600">
				<P class="text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">置信度说明:</P>
				<P class="text-sm text-blue-600 dark:text-blue-400">
					{selectedDimensionDetail.data.confidence_justification}
				</P>
			</div>
			
			<div class="flex justify-end space-x-2">
				<Button 
					color="alternative" 
					onclick={() => copyToClipboard(JSON.stringify(selectedDimensionDetail, null, 2))}
				>
					<Icon name="copy" class="w-4 h-4 mr-2" />
					复制数据
				</Button>
				<Button color="blue" onclick={() => showDimensionModal = false}>
					关闭
				</Button>
			</div>
		</div>
	{/if}
</Modal>

<!-- Follow-up Questions Modal -->
<Modal bind:open={showFollowUpModal} size="lg" autoclose>
	{#if evaluationResult}
		<div class="space-y-4">
			<div class="flex items-center space-x-2">
				<Icon name="question" class="w-5 h-5 text-amber-600" />
				<Heading tag="h3" class="text-lg font-semibold">建议追问问题</Heading>
			</div>
			
			<div class="space-y-3">
				{#each Object.entries(evaluationResult.suggested_follow_up_questions) as [dimension, question]}
					<div class="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-600">
						<div class="flex items-center justify-between mb-2">
							<P class="font-medium text-amber-700 dark:text-amber-300">
								{dimension}
							</P>
							<Badge color="amber" size="small">追问建议</Badge>
						</div>
						<P class="text-sm text-amber-600 dark:text-amber-400">
							{question}
						</P>
					</div>
				{/each}
			</div>
			
			<div class="flex justify-end space-x-2">
				<Button 
					color="alternative" 
					onclick={() => copyToClipboard(Object.entries(evaluationResult.suggested_follow_up_questions).map(([d, q]) => `${d}: ${q}`).join('\n\n'))}
				>
					<Icon name="copy" class="w-4 h-4 mr-2" />
					复制全部
				</Button>
				<Button color="amber" onclick={() => showFollowUpModal = false}>
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
			<Icon name="download" class="w-5 h-5 text-blue-600" />
			<Heading tag="h3" class="text-lg font-semibold">导出评估结果</Heading>
		</div>
		
		<div class="space-y-3">
			<Button 
				color="blue" 
				onclick={() => exportEvaluation('json')}
				class="w-full justify-start"
			>
				<Icon name="code" class="w-4 h-4 mr-2" />
				JSON 格式 (结构化数据)
			</Button>
			
			<Button 
				color="green" 
				onclick={() => exportEvaluation('markdown')}
				class="w-full justify-start"
			>
				<Icon name="document" class="w-4 h-4 mr-2" />
				Markdown 格式 (报告文档)
			</Button>
			
			<Button 
				color="red" 
				onclick={() => exportEvaluation('pdf')}
				class="w-full justify-start"
			>
				<Icon name="document-text" class="w-4 h-4 mr-2" />
				PDF 格式 (打印版本)
			</Button>
		</div>

		<!-- Preview -->
		{#if evaluationResult}
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