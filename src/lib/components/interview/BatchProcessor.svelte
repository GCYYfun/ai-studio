<script lang="ts">
	import { onMount } from 'svelte';
	import { batchEvaluationService, type BatchEvaluationConfig, type BatchProgress, type BatchSummary } from '$lib/services/sim/evaluation/BatchEvaluationService';
	import { InteractiveSelector } from '$lib/services/sim/storage/InteractiveSelector';
	import type { UploadedFile } from '$lib/services/sim/types';
	import { Button, Input, Select, Card, Badge, Modal } from 'flowbite-svelte';
	import { PlayOutline, StopOutline, DownloadOutline, CheckCircleOutline, CloseCircleOutline } from 'flowbite-svelte-icons';

	// Props using Svelte 5 $props()
	let { onComplete }: { onComplete?: (summary: BatchSummary) => void } = $props();

	// State using Svelte 5 runes
	let selector: InteractiveSelector;
	let availableFiles = $state<UploadedFile[]>([]);
	let selectedFiles = $state<UploadedFile[]>([]);
	let isProcessing = $state(false);
	let progress = $state<BatchProgress | null>(null);
	let summary = $state<BatchSummary | null>(null);
	let error = $state<string | null>(null);

	// Configuration
	let step = $state<'all' | 'topic' | 'report'>('all');
	let stage = $state('1');
	let concurrency = $state(3);
	let skipErrors = $state(true);
	let saveResults = $state(true);

	// Filter state
	let searchQuery = $state('');
	let jdFilter = $state('');
	let candidateFilter = $state('');
	let fileTypeFilter = $state('conversation');

	// UI state
	let showConfig = $state(true);
	let showResults = $state(false);

	onMount(async () => {
		await initialize();
	});

	async function initialize() {
		try {
			selector = new InteractiveSelector();
			await selector.initialize();
			await loadFiles();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to initialize';
			console.error('Batch processor initialization error:', err);
		}
	}

	async function loadFiles() {
		try {
			availableFiles = await selector.scan('conversation');
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load files';
		}
	}

	async function applyFilters() {
		try {
			const filtered = await selector.advancedFilter({
				search: searchQuery || undefined,
				jd: jdFilter || undefined,
				candidate: candidateFilter || undefined,
				fileType: fileTypeFilter || undefined
			});
			availableFiles = filtered;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to apply filters';
		}
	}

	function toggleFileSelection(file: UploadedFile) {
		const index = selectedFiles.findIndex(f => f.id === file.id);
		if (index >= 0) {
			selectedFiles = selectedFiles.filter(f => f.id !== file.id);
		} else {
			selectedFiles = [...selectedFiles, file];
		}
	}

	function selectAll() {
		selectedFiles = [...availableFiles];
	}

	function deselectAll() {
		selectedFiles = [];
	}

	async function startBatchProcessing() {
		if (selectedFiles.length === 0) {
			error = '请至少选择一个文件';
			return;
		}

		isProcessing = true;
		error = null;
		progress = null;
		summary = null;
		showResults = false;

		const config: BatchEvaluationConfig = {
			files: selectedFiles,
			step,
			stage,
			concurrency,
			skipErrors,
			saveResults
		};

		try {
			await batchEvaluationService.initialize();
			
			summary = await batchEvaluationService.processBatch(config, (p) => {
				progress = p;
			});

			showResults = true;
			
			if (onComplete) {
				onComplete(summary);
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Batch processing failed';
			console.error('Batch processing error:', err);
		} finally {
			isProcessing = false;
		}
	}

	function cancelProcessing() {
		batchEvaluationService.cancelBatch();
		isProcessing = false;
		progress = null;
	}

	function exportResults(format: 'json' | 'csv' | 'txt') {
		if (!summary) return;

		const content = batchEvaluationService.exportBatchResults(summary, format);
		
		// Create download
		const blob = new Blob([content], { 
			type: format === 'json' ? 'application/json' : 'text/plain' 
		});
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `batch_results_${summary.batchId}.${format}`;
		a.click();
		URL.revokeObjectURL(url);
	}

	function reset() {
		summary = null;
		progress = null;
		error = null;
		showResults = false;
		selectedFiles = [];
	}
</script>

<div class="batch-processor p-4">
	<h2 class="text-2xl font-bold mb-6">批量评估处理</h2>

	{#if error}
		<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
			{error}
		</div>
	{/if}

	<!-- Configuration Panel -->
	{#if showConfig && !isProcessing && !showResults}
		<Card class="mb-4">
			<h3 class="text-lg font-semibold mb-4">配置选项</h3>
			
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
				<div>
					<label class="block text-sm font-medium mb-2">处理步骤</label>
					<Select bind:value={step}>
						<option value="all">全部 (主题分析 + 能力评估)</option>
						<option value="topic">仅主题分析</option>
						<option value="report">仅能力评估</option>
					</Select>
				</div>

				<div>
					<label class="block text-sm font-medium mb-2">面试阶段</label>
					<Select bind:value={stage}>
						<option value="1">第一轮</option>
						<option value="2">第二轮</option>
						<option value="3">第三轮</option>
					</Select>
				</div>

				<div>
					<label class="block text-sm font-medium mb-2">并发数</label>
					<Input type="number" min="1" max="10" bind:value={concurrency} />
				</div>

				<div class="flex items-center gap-4">
					<label class="flex items-center gap-2">
						<input type="checkbox" bind:checked={skipErrors} />
						<span class="text-sm">跳过错误</span>
					</label>
					<label class="flex items-center gap-2">
						<input type="checkbox" bind:checked={saveResults} />
						<span class="text-sm">保存结果</span>
					</label>
				</div>
			</div>
		</Card>

		<!-- File Selection -->
		<Card class="mb-4">
			<h3 class="text-lg font-semibold mb-4">文件选择</h3>
			
			<!-- Filters -->
			<div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
				<Input
					type="text"
					placeholder="搜索..."
					bind:value={searchQuery}
					oninput={applyFilters}
				/>
				<Input
					type="text"
					placeholder="JD筛选..."
					bind:value={jdFilter}
					oninput={applyFilters}
				/>
				<Input
					type="text"
					placeholder="候选人筛选..."
					bind:value={candidateFilter}
					oninput={applyFilters}
				/>
			</div>

			<!-- Selection Actions -->
			<div class="flex justify-between items-center mb-4">
				<div class="flex gap-2">
					<Button size="sm" color="light" onclick={selectAll}>全选</Button>
					<Button size="sm" color="light" onclick={deselectAll}>取消全选</Button>
				</div>
				<p class="text-sm text-gray-600 dark:text-gray-400">
					已选择 {selectedFiles.length} / {availableFiles.length} 个文件
				</p>
			</div>

			<!-- File List -->
			<div class="max-h-96 overflow-y-auto space-y-2">
				{#each availableFiles as file (file.id)}
					<div
						class="flex items-center gap-3 p-3 border rounded hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
						onclick={() => toggleFileSelection(file)}
						role="button"
						tabindex="0"
					>
						<input
							type="checkbox"
							checked={selectedFiles.some(f => f.id === file.id)}
							onchange={() => toggleFileSelection(file)}
						/>
						<div class="flex-1">
							<p class="font-medium">{file.name}</p>
							<p class="text-sm text-gray-600 dark:text-gray-400">
								{file.metadata.candidateName || 'Unknown'} - {file.metadata.position || 'Unknown'}
							</p>
						</div>
						<Badge color="blue">{file.type}</Badge>
					</div>
				{/each}
			</div>
		</Card>

		<!-- Start Button -->
		<div class="flex justify-end gap-2">
			<Button color="green" onclick={startBatchProcessing} disabled={selectedFiles.length === 0}>
				<PlayOutline class="w-4 h-4 mr-2" />
				开始批量处理
			</Button>
		</div>
	{/if}

	<!-- Processing Progress -->
	{#if isProcessing && progress}
		<Card class="mb-4">
			<h3 class="text-lg font-semibold mb-4">处理进度</h3>
			
			<div class="mb-4">
				<div class="flex justify-between text-sm mb-2">
					<span>进度: {progress.completed + progress.failed} / {progress.total}</span>
					<span>{progress.percentage}%</span>
				</div>
				<div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
					<div 
						class="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
						style="width: {progress.percentage}%"
					></div>
				</div>
			</div>

			{#if progress.current}
				<p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
					当前处理: {progress.current}
				</p>
			{/if}

			<div class="grid grid-cols-3 gap-4 mb-4">
				<div class="text-center">
					<p class="text-2xl font-bold text-blue-600">{progress.total}</p>
					<p class="text-sm text-gray-600 dark:text-gray-400">总数</p>
				</div>
				<div class="text-center">
					<p class="text-2xl font-bold text-green-600">{progress.completed}</p>
					<p class="text-sm text-gray-600 dark:text-gray-400">成功</p>
				</div>
				<div class="text-center">
					<p class="text-2xl font-bold text-red-600">{progress.failed}</p>
					<p class="text-sm text-gray-600 dark:text-gray-400">失败</p>
				</div>
			</div>

			<Button color="red" onclick={cancelProcessing}>
				<StopOutline class="w-4 h-4 mr-2" />
				取消处理
			</Button>
		</Card>
	{/if}

	<!-- Results Summary -->
	{#if showResults && summary}
		<Card class="mb-4">
			<h3 class="text-lg font-semibold mb-4">处理结果</h3>
			
			<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
				<div class="text-center">
					<p class="text-2xl font-bold">{summary.totalFiles}</p>
					<p class="text-sm text-gray-600 dark:text-gray-400">总文件数</p>
				</div>
				<div class="text-center">
					<p class="text-2xl font-bold text-green-600">{summary.successCount}</p>
					<p class="text-sm text-gray-600 dark:text-gray-400">成功</p>
				</div>
				<div class="text-center">
					<p class="text-2xl font-bold text-red-600">{summary.failureCount}</p>
					<p class="text-sm text-gray-600 dark:text-gray-400">失败</p>
				</div>
				<div class="text-center">
					<p class="text-2xl font-bold">{Math.round(summary.totalDuration / 1000)}s</p>
					<p class="text-sm text-gray-600 dark:text-gray-400">总耗时</p>
				</div>
			</div>

			<!-- Statistics -->
			<div class="bg-gray-50 dark:bg-gray-800 p-4 rounded mb-4">
				<h4 class="font-semibold mb-2">统计信息</h4>
				<div class="grid grid-cols-2 gap-2 text-sm">
					<div>主题分析数: {summary.statistics.topicAnalysisCount}</div>
					<div>能力评估数: {summary.statistics.evaluationCount}</div>
					{#if summary.statistics.averageOverallRating}
						<div>平均评分: {summary.statistics.averageOverallRating.toFixed(2)}</div>
					{/if}
					{#if summary.statistics.averageConfidence}
						<div>平均置信度: {summary.statistics.averageConfidence.toFixed(2)}</div>
					{/if}
				</div>
			</div>

			<!-- Detailed Results -->
			<div class="mb-4">
				<h4 class="font-semibold mb-2">详细结果</h4>
				<div class="max-h-96 overflow-y-auto space-y-2">
					{#each summary.results as result (result.fileId)}
						<div class="flex items-center gap-3 p-3 border rounded">
							{#if result.success}
								<CheckCircleOutline class="w-5 h-5 text-green-600" />
							{:else}
								<CloseCircleOutline class="w-5 h-5 text-red-600" />
							{/if}
							<div class="flex-1">
								<p class="font-medium">{result.fileName}</p>
								{#if result.error}
									<p class="text-sm text-red-600">{result.error}</p>
								{:else if result.result?.evaluation}
									<p class="text-sm text-gray-600 dark:text-gray-400">
										评分: {result.result.evaluation.overall_rating.toFixed(1)} | 
										置信度: {result.result.evaluation.overall_confidence.toFixed(2)}
									</p>
								{/if}
							</div>
							<span class="text-sm text-gray-600 dark:text-gray-400">
								{Math.round(result.duration / 1000)}s
							</span>
						</div>
					{/each}
				</div>
			</div>

			<!-- Export Actions -->
			<div class="flex justify-between">
				<Button color="light" onclick={reset}>
					处理新批次
				</Button>
				<div class="flex gap-2">
					<Button color="light" onclick={() => exportResults('json')}>
						<DownloadOutline class="w-4 h-4 mr-2" />
						导出 JSON
					</Button>
					<Button color="light" onclick={() => exportResults('csv')}>
						<DownloadOutline class="w-4 h-4 mr-2" />
						导出 CSV
					</Button>
					<Button color="light" onclick={() => exportResults('txt')}>
						<DownloadOutline class="w-4 h-4 mr-2" />
						导出 TXT
					</Button>
				</div>
			</div>
		</Card>
	{/if}
</div>

<style>
	.batch-processor {
		max-width: 1200px;
		margin: 0 auto;
	}
</style>
