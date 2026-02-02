<script lang="ts">
	import { onMount } from 'svelte';
	import { historyManagementService, type HistoryRecord, type HistoryFilter, type HistoryStatistics } from '$lib/services/sim/history/HistoryManagementService';
	import { Button, Input, Select, Badge, Card, Modal } from 'flowbite-svelte';
	import { SearchOutline, FilterOutline, TrashBinOutline, DownloadOutline, ChartLineUpOutline } from 'flowbite-svelte-icons';

	// State
	let records: HistoryRecord[] = [];
	let filteredRecords: HistoryRecord[] = [];
	let selectedRecords: Set<string> = new Set();
	let statistics: HistoryStatistics | null = null;
	let loading = false;
	let error: string | null = null;

	// Filter state
	let searchQuery = '';
	let statusFilter: 'all' | 'completed' | 'in_progress' | 'failed' = 'all';
	let selectedTags: string[] = [];
	let availableTags: string[] = [];
	let dateRangeStart = '';
	let dateRangeEnd = '';
	let minRating: number | undefined = undefined;
	let maxRating: number | undefined = undefined;

	// UI state
	let showFilters = false;
	let showStatistics = false;
	let showDeleteConfirm = false;
	let showCompareModal = false;
	let selectedRecord: HistoryRecord | null = null;

	// Sort state
	let sortBy: 'date' | 'name' | 'rating' | 'position' = 'date';
	let sortOrder: 'asc' | 'desc' = 'desc';

	onMount(async () => {
		await initialize();
	});

	async function initialize() {
		loading = true;
		error = null;

		try {
			await historyManagementService.initialize();
			await loadRecords();
			await loadStatistics();
			availableTags = await historyManagementService.getAllTags();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to initialize history';
			console.error('History initialization error:', err);
		} finally {
			loading = false;
		}
	}

	async function loadRecords() {
		records = await historyManagementService.getAllRecords();
		applyFilters();
	}

	async function loadStatistics() {
		statistics = await historyManagementService.getStatistics();
	}

	function applyFilters() {
		const filter: HistoryFilter = {};

		if (searchQuery) {
			filter.search = searchQuery;
		}

		if (statusFilter !== 'all') {
			filter.status = statusFilter;
		}

		if (selectedTags.length > 0) {
			filter.tags = selectedTags;
		}

		if (dateRangeStart && dateRangeEnd) {
			filter.dateRange = [new Date(dateRangeStart), new Date(dateRangeEnd)];
		}

		if (minRating !== undefined) {
			filter.minRating = minRating;
		}

		if (maxRating !== undefined) {
			filter.maxRating = maxRating;
		}

		historyManagementService.filterRecords(filter).then(filtered => {
			filteredRecords = sortRecords(filtered);
		});
	}

	function sortRecords(recordsToSort: HistoryRecord[]): HistoryRecord[] {
		return [...recordsToSort].sort((a, b) => {
			let comparison = 0;

			switch (sortBy) {
				case 'date':
					comparison = a.interviewDate.getTime() - b.interviewDate.getTime();
					break;
				case 'name':
					comparison = a.candidateName.localeCompare(b.candidateName);
					break;
				case 'rating':
					comparison = (a.metadata.overallRating || 0) - (b.metadata.overallRating || 0);
					break;
				case 'position':
					comparison = a.position.localeCompare(b.position);
					break;
			}

			return sortOrder === 'desc' ? -comparison : comparison;
		});
	}

	function toggleRecordSelection(id: string) {
		if (selectedRecords.has(id)) {
			selectedRecords.delete(id);
		} else {
			selectedRecords.add(id);
		}
		selectedRecords = selectedRecords;
	}

	function selectAll() {
		selectedRecords = new Set(filteredRecords.map(r => r.id));
	}

	function deselectAll() {
		selectedRecords = new Set();
	}

	async function deleteSelected() {
		if (selectedRecords.size === 0) return;

		loading = true;
		try {
			const deletedCount = await historyManagementService.deleteRecords(Array.from(selectedRecords));
			await loadRecords();
			await loadStatistics();
			selectedRecords = new Set();
			showDeleteConfirm = false;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to delete records';
		} finally {
			loading = false;
		}
	}

	async function exportRecords(format: 'json' | 'csv' | 'txt') {
		const recordsToExport = selectedRecords.size > 0
			? filteredRecords.filter(r => selectedRecords.has(r.id))
			: filteredRecords;

		const content = historyManagementService.exportRecords(recordsToExport, format);
		
		// Create download
		const blob = new Blob([content], { 
			type: format === 'json' ? 'application/json' : 'text/plain' 
		});
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `interview_history_${new Date().toISOString().split('T')[0]}.${format}`;
		a.click();
		URL.revokeObjectURL(url);
	}

	function viewRecord(record: HistoryRecord) {
		selectedRecord = record;
	}

	function getStatusColor(status: string): string {
		switch (status) {
			case 'completed': return 'green';
			case 'in_progress': return 'yellow';
			case 'failed': return 'red';
			default: return 'gray';
		}
	}

	function getRatingColor(rating: number): string {
		if (rating >= 8) return 'green';
		if (rating >= 6) return 'yellow';
		if (rating >= 4) return 'orange';
		return 'red';
	}

	$: applyFilters();
</script>

<div class="history-manager p-4">
	<!-- Header -->
	<div class="flex justify-between items-center mb-6">
		<div>
			<h2 class="text-2xl font-bold">面试历史记录</h2>
			<p class="text-gray-600 dark:text-gray-400">
				共 {filteredRecords.length} 条记录
				{#if selectedRecords.size > 0}
					(已选择 {selectedRecords.size} 条)
				{/if}
			</p>
		</div>

		<div class="flex gap-2">
			<Button color="light" on:click={() => showStatistics = !showStatistics}>
				<ChartLineUpOutline class="w-4 h-4 mr-2" />
				统计信息
			</Button>
			<Button color="light" on:click={() => showFilters = !showFilters}>
				<FilterOutline class="w-4 h-4 mr-2" />
				过滤器
			</Button>
		</div>
	</div>

	<!-- Statistics Panel -->
	{#if showStatistics && statistics}
		<Card class="mb-4">
			<h3 class="text-lg font-semibold mb-4">统计信息</h3>
			<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
				<div>
					<p class="text-sm text-gray-600 dark:text-gray-400">总记录数</p>
					<p class="text-2xl font-bold">{statistics.totalRecords}</p>
				</div>
				<div>
					<p class="text-sm text-gray-600 dark:text-gray-400">已完成</p>
					<p class="text-2xl font-bold text-green-600">{statistics.completedRecords}</p>
				</div>
				<div>
					<p class="text-sm text-gray-600 dark:text-gray-400">平均评分</p>
					<p class="text-2xl font-bold">{statistics.averageRating.toFixed(2)}</p>
				</div>
				<div>
					<p class="text-sm text-gray-600 dark:text-gray-400">平均置信度</p>
					<p class="text-2xl font-bold">{statistics.averageConfidence.toFixed(2)}</p>
				</div>
			</div>
		</Card>
	{/if}

	<!-- Filters Panel -->
	{#if showFilters}
		<Card class="mb-4">
			<h3 class="text-lg font-semibold mb-4">过滤条件</h3>
			<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
				<div>
					<label class="block text-sm font-medium mb-2">搜索</label>
					<Input
						type="text"
						placeholder="搜索候选人、职位..."
						bind:value={searchQuery}
					/>
				</div>

				<div>
					<label class="block text-sm font-medium mb-2">状态</label>
					<Select bind:value={statusFilter}>
						<option value="all">全部</option>
						<option value="completed">已完成</option>
						<option value="in_progress">进行中</option>
						<option value="failed">失败</option>
					</Select>
				</div>

				<div>
					<label class="block text-sm font-medium mb-2">排序</label>
					<div class="flex gap-2">
						<Select bind:value={sortBy} class="flex-1">
							<option value="date">日期</option>
							<option value="name">姓名</option>
							<option value="rating">评分</option>
							<option value="position">职位</option>
						</Select>
						<Select bind:value={sortOrder} class="w-24">
							<option value="desc">降序</option>
							<option value="asc">升序</option>
						</Select>
					</div>
				</div>

				<div>
					<label class="block text-sm font-medium mb-2">开始日期</label>
					<Input type="date" bind:value={dateRangeStart} />
				</div>

				<div>
					<label class="block text-sm font-medium mb-2">结束日期</label>
					<Input type="date" bind:value={dateRangeEnd} />
				</div>

				<div>
					<label class="block text-sm font-medium mb-2">评分范围</label>
					<div class="flex gap-2">
						<Input
							type="number"
							placeholder="最低"
							min="0"
							max="10"
							bind:value={minRating}
						/>
						<Input
							type="number"
							placeholder="最高"
							min="0"
							max="10"
							bind:value={maxRating}
						/>
					</div>
				</div>
			</div>
		</Card>
	{/if}

	<!-- Actions Bar -->
	<div class="flex justify-between items-center mb-4">
		<div class="flex gap-2">
			<Button size="sm" color="light" on:click={selectAll}>全选</Button>
			<Button size="sm" color="light" on:click={deselectAll}>取消全选</Button>
			{#if selectedRecords.size > 0}
				<Button size="sm" color="red" on:click={() => showDeleteConfirm = true}>
					<TrashBinOutline class="w-4 h-4 mr-2" />
					删除选中
				</Button>
			{/if}
		</div>

		<div class="flex gap-2">
			<Button size="sm" color="light" on:click={() => exportRecords('json')}>
				<DownloadOutline class="w-4 h-4 mr-2" />
				导出 JSON
			</Button>
			<Button size="sm" color="light" on:click={() => exportRecords('csv')}>
				<DownloadOutline class="w-4 h-4 mr-2" />
				导出 CSV
			</Button>
		</div>
	</div>

	<!-- Records List -->
	{#if loading}
		<div class="text-center py-8">
			<p class="text-gray-600 dark:text-gray-400">加载中...</p>
		</div>
	{:else if error}
		<div class="text-center py-8">
			<p class="text-red-600">{error}</p>
		</div>
	{:else if filteredRecords.length === 0}
		<div class="text-center py-8">
			<p class="text-gray-600 dark:text-gray-400">没有找到记录</p>
		</div>
	{:else}
		<div class="space-y-4">
			{#each filteredRecords as record (record.id)}
				<Card class="hover:shadow-lg transition-shadow">
					<div class="flex items-start gap-4">
						<input
							type="checkbox"
							checked={selectedRecords.has(record.id)}
							on:change={() => toggleRecordSelection(record.id)}
							class="mt-1"
						/>

						<div class="flex-1">
							<div class="flex justify-between items-start mb-2">
								<div>
									<h3 class="text-lg font-semibold">{record.candidateName}</h3>
									<p class="text-sm text-gray-600 dark:text-gray-400">{record.position}</p>
								</div>

								<div class="flex gap-2">
									<Badge color={getStatusColor(record.status)}>
										{record.status}
									</Badge>
									{#if record.metadata.overallRating}
										<Badge color={getRatingColor(record.metadata.overallRating)}>
											评分: {record.metadata.overallRating.toFixed(1)}
										</Badge>
									{/if}
								</div>
							</div>

							<div class="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm mb-2">
								<div>
									<span class="text-gray-600 dark:text-gray-400">面试日期:</span>
									<span class="ml-1">{new Date(record.interviewDate).toLocaleDateString()}</span>
								</div>
								{#if record.metadata.totalTurns}
									<div>
										<span class="text-gray-600 dark:text-gray-400">总轮数:</span>
										<span class="ml-1">{record.metadata.totalTurns}</span>
									</div>
								{/if}
								{#if record.metadata.confidence}
									<div>
										<span class="text-gray-600 dark:text-gray-400">置信度:</span>
										<span class="ml-1">{record.metadata.confidence.toFixed(2)}</span>
									</div>
								{/if}
								{#if record.metadata.duration}
									<div>
										<span class="text-gray-600 dark:text-gray-400">时长:</span>
										<span class="ml-1">{Math.round(record.metadata.duration / 60000)}分钟</span>
									</div>
								{/if}
							</div>

							{#if record.tags.length > 0}
								<div class="flex gap-2 flex-wrap mb-2">
									{#each record.tags as tag}
										<Badge color="blue" class="text-xs">{tag}</Badge>
									{/each}
								</div>
							{/if}

							{#if record.notes}
								<p class="text-sm text-gray-600 dark:text-gray-400 mb-2">{record.notes}</p>
							{/if}

							<div class="flex gap-2">
								<Button size="xs" color="light" on:click={() => viewRecord(record)}>
									查看详情
								</Button>
								{#if record.analysisResult}
									<Button size="xs" color="light">
										查看分析
									</Button>
								{/if}
							</div>
						</div>
					</div>
				</Card>
			{/each}
		</div>
	{/if}
</div>

<!-- Delete Confirmation Modal -->
<Modal bind:open={showDeleteConfirm} size="xs" autoclose>
	<div class="text-center">
		<TrashBinOutline class="mx-auto mb-4 text-gray-400 w-12 h-12 dark:text-gray-200" />
		<h3 class="mb-5 text-lg font-normal text-gray-500 dark:text-gray-400">
			确定要删除选中的 {selectedRecords.size} 条记录吗？
		</h3>
		<div class="flex justify-center gap-4">
			<Button color="red" on:click={deleteSelected}>确定删除</Button>
			<Button color="alternative" on:click={() => showDeleteConfirm = false}>取消</Button>
		</div>
	</div>
</Modal>

<style>
	.history-manager {
		max-width: 1200px;
		margin: 0 auto;
	}
</style>
