<script lang="ts">
	import { Card, Button, Heading, P, Badge, Input, Select, Checkbox, Modal, Textarea } from 'flowbite-svelte';
	import { ui } from '$lib/ui';
	import { documentStore, historyStore } from '$lib/stores/interview.js';
	import type { UploadedDocument, InterviewRecord } from '$lib/types';
	import { interview } from '$lib/services/interviewApi.js';
	import { onMount } from 'svelte';

	const { Icon } = ui;

	// Props
	let { 
		class: className = '',
		mode = 'files', // 'files' | 'records'
		onSelectionChange = (selected: string[]) => {},
		onBatchProcess = (selected: string[]) => {}
	} = $props();

	// Store subscriptions
	let documents = $state<UploadedDocument[]>([]);
	let records = $state<InterviewRecord[]>([]);
	let selectedItems = $state<Set<string>>(new Set());

	documentStore.documents.subscribe(value => documents = value);
	historyStore.records.subscribe(value => records = value);

	// Component state
	let loading = $state(false);
	let showMetadataModal = $state(false);
	let selectedItemMetadata = $state<any>(null);
	let metadataTitle = $state('');

	// Filter state
	let filters = $state({
		search: '',
		jd: '',
		candidate: '',
		dateFrom: '',
		dateTo: '',
		fileType: '',
		status: ''
	});

	// Filter options
	const fileTypeOptions = [
		{ value: '', name: '全部类型' },
		{ value: 'jd', name: 'JD文件' },
		{ value: 'resume', name: '简历文件' },
		{ value: 'conversation', name: '面试记录' },
		{ value: 'report', name: '分析报告' }
	];

	const statusOptions = [
		{ value: '', name: '全部状态' },
		{ value: 'completed', name: '已完成' },
		{ value: 'in_progress', name: '进行中' },
		{ value: 'failed', name: '失败' }
	];

	// Load data on mount
	onMount(async () => {
		await loadData();
	});

	async function loadData() {
		loading = true;
		try {
			if (mode === 'files') {
				// Load all file types
				const [jdFiles, resumeFiles, conversationFiles, reportFiles] = await Promise.all([
					interview.getFiles('jd'),
					interview.getFiles('resume'),
					interview.getFiles('conversation'),
					interview.getFiles('report')
				]);

				const allFiles: UploadedDocument[] = [];
				if (jdFiles.success) allFiles.push(...jdFiles.data);
				if (resumeFiles.success) allFiles.push(...resumeFiles.data);
				if (conversationFiles.success) allFiles.push(...conversationFiles.data);
				if (reportFiles.success) allFiles.push(...reportFiles.data);

				documentStore.documents.set(allFiles);
			} else {
				// Load interview records
				const result = await interview.getHistory();
				if (result.success) {
					historyStore.records.set(result.data);
				}
			}
		} catch (error) {
			console.error('Failed to load data:', error);
		} finally {
			loading = false;
		}
	}

	// Get items based on mode
	let items = $derived(() => {
		return mode === 'files' ? documents : records;
	});

	// Apply filters
	let filteredItems = $derived(() => {
		let filtered: (UploadedDocument | InterviewRecord)[] = items();

		// Search filter
		if (filters.search) {
			const searchLower = filters.search.toLowerCase();
			filtered = filtered.filter(item => {
				const name = mode === 'files' 
					? (item as UploadedDocument).name 
					: (item as InterviewRecord).candidateName;
				return name.toLowerCase().includes(searchLower);
			});
		}

		// JD filter
		if (filters.jd) {
			const jdLower = filters.jd.toLowerCase();
			filtered = filtered.filter(item => {
				if (mode === 'files') {
					const doc = item as UploadedDocument;
					return doc.metadata?.jd?.toLowerCase().includes(jdLower) || 
						   doc.name.toLowerCase().includes(jdLower);
				} else {
					const record = item as InterviewRecord;
					return record.position.toLowerCase().includes(jdLower);
				}
			});
		}

		// Candidate filter
		if (filters.candidate) {
			const candidateLower = filters.candidate.toLowerCase();
			filtered = filtered.filter(item => {
				if (mode === 'files') {
					const doc = item as UploadedDocument;
					return doc.metadata?.candidate?.toLowerCase().includes(candidateLower) || 
						   doc.name.toLowerCase().includes(candidateLower);
				} else {
					const record = item as InterviewRecord;
					return record.candidateName.toLowerCase().includes(candidateLower);
				}
			});
		}

		// File type filter (files mode only)
		if (mode === 'files' && filters.fileType) {
			filtered = filtered.filter(item => {
				const doc = item as UploadedDocument;
				return doc.type === filters.fileType;
			});
		}

		// Status filter (records mode only)
		if (mode === 'records' && filters.status) {
			filtered = filtered.filter(item => {
				const record = item as InterviewRecord;
				return record.status === filters.status;
			});
		}

		// Date range filter
		if (filters.dateFrom || filters.dateTo) {
			filtered = filtered.filter(item => {
				const date = mode === 'files' 
					? new Date((item as UploadedDocument).uploadDate)
					: new Date((item as InterviewRecord).interviewDate);
				
				if (filters.dateFrom && date < new Date(filters.dateFrom)) return false;
				if (filters.dateTo && date > new Date(filters.dateTo)) return false;
				return true;
			});
		}

		return filtered;
	});

	// Selection functions
	function toggleItemSelection(itemId: string) {
		const newSelected = new Set(selectedItems);
		if (newSelected.has(itemId)) {
			newSelected.delete(itemId);
		} else {
			newSelected.add(itemId);
		}
		selectedItems = newSelected;
		onSelectionChange(Array.from(selectedItems));
	}

	function selectAll() {
		selectedItems = new Set(filteredItems().map((item: any) => item.id));
		onSelectionChange(Array.from(selectedItems));
	}

	function clearSelection() {
		selectedItems = new Set();
		onSelectionChange([]);
	}

	function selectByFilter() {
		// Select items that match current filters
		selectedItems = new Set(filteredItems().map((item: any) => item.id));
		onSelectionChange(Array.from(selectedItems));
	}

	// Filter functions
	function applyFilters() {
		// Filters are applied reactively through filteredItems
		console.log('Filters applied:', filters);
	}

	function resetFilters() {
		filters = {
			search: '',
			jd: '',
			candidate: '',
			dateFrom: '',
			dateTo: '',
			fileType: '',
			status: ''
		};
	}

	function processBatch() {
		const selectedItemIds = Array.from(selectedItems);
		if (selectedItemIds.length === 0) return;
		
		onBatchProcess(selectedItemIds);
	}

	// Metadata functions
	async function showItemMetadata(item: UploadedDocument | InterviewRecord) {
		if (mode === 'files') {
			const doc = item as UploadedDocument;
			try {
				// Try to load file content for metadata parsing
				const result = await interview.getFileContent(doc.path);
				if (result.success) {
					selectedItemMetadata = {
						...doc,
						content: result.data.content,
						contentType: result.data.type
					};
				} else {
					selectedItemMetadata = doc;
				}
				metadataTitle = `文件详情: ${doc.name}`;
			} catch (error) {
				selectedItemMetadata = doc;
				metadataTitle = `文件详情: ${doc.name}`;
			}
		} else {
			const record = item as InterviewRecord;
			selectedItemMetadata = record;
			metadataTitle = `面试记录: ${record.candidateName}`;
		}
		showMetadataModal = true;
	}

	// Utility functions
	function getItemIcon(item: UploadedDocument | InterviewRecord): string {
		if (mode === 'files') {
			const doc = item as UploadedDocument;
			switch (doc.type) {
				case 'jd': return 'briefcase';
				case 'resume': return 'user';
				case 'conversation': return 'chat';
				case 'report': return 'chart';
				default: return 'document';
			}
		} else {
			const record = item as InterviewRecord;
			switch (record.status) {
				case 'completed': return 'check-circle';
				case 'in_progress': return 'clock';
				case 'failed': return 'x-circle';
				default: return 'document';
			}
		}
	}

	function getItemColor(item: UploadedDocument | InterviewRecord): "gray" | "primary" | "secondary" | "red" | "orange" | "amber" | "yellow" | "lime" | "green" | "emerald" | "teal" | "cyan" | "sky" | "blue" | "indigo" | "violet" | "purple" | "fuchsia" | "pink" | "rose" {
		if (mode === 'files') {
			const doc = item as UploadedDocument;
			switch (doc.type) {
				case 'jd': return 'blue';
				case 'resume': return 'green';
				case 'conversation': return 'purple';
				case 'report': return 'orange';
				default: return 'gray';
			}
		} else {
			const record = item as InterviewRecord;
			switch (record.status) {
				case 'completed': return 'green';
				case 'in_progress': return 'yellow';
				case 'failed': return 'red';
				default: return 'gray';
			}
		}
	}

	function formatFileSize(bytes: number): string {
		if (bytes === 0) return '0 B';
		const k = 1024;
		const sizes = ['B', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
	}

	function formatDate(date: Date | string): string {
		const d = typeof date === 'string' ? new Date(date) : date;
		return d.toLocaleDateString('zh-CN', {
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function getItemDisplayName(item: UploadedDocument | InterviewRecord): string {
		return mode === 'files' 
			? (item as UploadedDocument).name 
			: (item as InterviewRecord).candidateName;
	}

	function getItemSubtitle(item: UploadedDocument | InterviewRecord): string {
		if (mode === 'files') {
			const doc = item as UploadedDocument;
			return `${doc.type} • ${formatFileSize(doc.size)} • ${formatDate(doc.uploadDate)}`;
		} else {
			const record = item as InterviewRecord;
			return `${record.position} • ${formatDate(record.interviewDate)}`;
		}
	}

	// Extract metadata from file content
	function parseFileMetadata(content: string, filename: string): any {
		const metadata: any = {
			filename,
			size: content.length,
			lines: content.split('\n').length
		};

		// Try to extract JD and candidate info from filename
		const nameMatch = filename.match(/(.+?)_(.+?)_interview/);
		if (nameMatch) {
			metadata.candidate = nameMatch[1];
			metadata.jd = nameMatch[2];
		}

		// Try to extract info from content
		if (content.includes('职位') || content.includes('JD')) {
			const jdMatch = content.match(/职位[：:]\s*(.+)/);
			if (jdMatch) metadata.jd = jdMatch[1].trim();
		}

		if (content.includes('候选人') || content.includes('姓名')) {
			const candidateMatch = content.match(/(?:候选人|姓名)[：:]\s*(.+)/);
			if (candidateMatch) metadata.candidate = candidateMatch[1].trim();
		}

		return metadata;
	}
</script>

<Card class="shadow-sm hover:shadow-md transition-shadow duration-200 {className}">
	<div class="flex items-center justify-between mb-4">
		<div class="flex items-center space-x-2">
			<Icon name="filter" class="w-5 h-5 text-teal-600 dark:text-teal-400" />
			<Heading tag="h3" class="text-lg font-semibold">
				交互式{mode === 'files' ? '文件' : '记录'}选择器
			</Heading>
		</div>
		<div class="flex items-center space-x-2">
			{#if loading}
				<div class="w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
			{/if}
			<Badge color="teal">
				已选择 {selectedItems.size} / {filteredItems().length}
			</Badge>
		</div>
	</div>
	
	<div class="space-y-4">
		<!-- 搜索和过滤条件 -->
		<div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
			<P class="text-sm text-gray-600 dark:text-gray-400 mb-3">过滤条件</P>
			
			<!-- 搜索框 -->
			<div class="mb-3">
				<Input 
					type="text" 
					bind:value={filters.search}
					placeholder="搜索名称..."
					class="w-full"
				/>
			</div>

			<!-- 过滤条件网格 -->
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
				<div>
					<label for="jd-filter" class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
						JD职位
					</label>
					<Input 
						id="jd-filter"
						type="text" 
						bind:value={filters.jd}
						placeholder="搜索职位..."
						size="sm"
					/>
				</div>
				
				<div>
					<label for="candidate-filter" class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
						候选人
					</label>
					<Input 
						id="candidate-filter"
						type="text" 
						bind:value={filters.candidate}
						placeholder="搜索候选人..."
						size="sm"
					/>
				</div>

				{#if mode === 'files'}
					<div>
						<label for="type-filter" class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
							文件类型
						</label>
						<Select 
							id="type-filter"
							bind:value={filters.fileType} 
							items={fileTypeOptions}
							size="sm"
						/>
					</div>
				{:else}
					<div>
						<label for="status-filter" class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
							状态
						</label>
						<Select 
							id="status-filter"
							bind:value={filters.status} 
							items={statusOptions}
							size="sm"
						/>
					</div>
				{/if}

				<div>
					<label for="date-from" class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
						日期范围
					</label>
					<div class="flex space-x-1">
						<Input 
							id="date-from"
							type="date" 
							bind:value={filters.dateFrom}
							size="sm"
							class="flex-1"
						/>
						<Input 
							id="date-to"
							type="date" 
							bind:value={filters.dateTo}
							size="sm"
							class="flex-1"
						/>
					</div>
				</div>
			</div>

			<!-- 过滤操作按钮 -->
			<div class="flex space-x-2 mt-3">
				<Button color="teal" size="small" onclick={applyFilters}>
					<Icon name="filter" class="w-3 h-3 mr-1" />
					应用过滤
				</Button>
				<Button color="alternative" size="small" onclick={resetFilters}>
					<Icon name="refresh" class="w-3 h-3 mr-1" />
					重置
				</Button>
				<Button color="blue" size="small" onclick={selectByFilter}>
					<Icon name="check" class="w-3 h-3 mr-1" />
					选择过滤结果
				</Button>
			</div>
		</div>

		<!-- 批量操作 -->
		<div class="flex items-center justify-between p-3 bg-teal-50 dark:bg-teal-900/20 rounded-lg">
			<div class="flex items-center space-x-3">
				<span class="text-sm font-medium text-teal-700 dark:text-teal-300">
					批量操作:
				</span>
				<Button color="teal" size="xs" onclick={selectAll}>
					<Icon name="check-all" class="w-3 h-3 mr-1" />
					全选
				</Button>
				<Button color="alternative" size="xs" onclick={clearSelection}>
					<Icon name="x" class="w-3 h-3 mr-1" />
					清空
				</Button>
			</div>
			<Button 
				color="teal" 
				size="sm" 
				onclick={processBatch}
				disabled={selectedItems.size === 0}
			>
				<Icon name="play" class="w-4 h-4 mr-1" />
				处理选中 ({selectedItems.size})
			</Button>
		</div>

		<!-- 项目列表 -->
		<div class="space-y-2 max-h-[500px] overflow-y-auto">
			{#if filteredItems().length > 0}
				{#each filteredItems() as item}
					<button 
						class="w-full flex items-center justify-between p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors duration-200 {selectedItems.has(item.id) ? 'ring-2 ring-teal-500 bg-teal-50 dark:bg-teal-900/20' : ''}"
						onclick={() => toggleItemSelection(item.id)}
					>
						<div class="flex items-center space-x-3">
							<!-- 选择框 -->
							<div class="flex-shrink-0">
								<Checkbox 
									checked={selectedItems.has(item.id)}
									onchange={() => toggleItemSelection(item.id)}
									class="text-teal-600 focus:ring-teal-500"
								/>
							</div>
							
							<!-- 图标 -->
							<Icon 
								name={getItemIcon(item)} 
								class="w-4 h-4 text-{getItemColor(item)}-500" 
							/>
							
							<!-- 内容 -->
							<div class="flex-1">
								<p class="text-sm font-medium text-gray-900 dark:text-white">
									{getItemDisplayName(item)}
								</p>
								<p class="text-xs text-gray-500 dark:text-gray-400">
									{getItemSubtitle(item)}
								</p>
								
								<!-- 元数据标签 -->
								{#if mode === 'files'}
									{@const doc = item as UploadedDocument}
									<div class="flex items-center space-x-1 mt-1">
										<Badge color={getItemColor(item)} size="small">
											{doc.type}
										</Badge>
										{#if doc.metadata?.jd}
											<Badge color="gray" size="small">
												{doc.metadata.jd}
											</Badge>
										{/if}
										{#if doc.metadata?.candidate}
											<Badge color="gray" size="small">
												{doc.metadata.candidate}
											</Badge>
										{/if}
									</div>
								{:else}
									{@const record = item as InterviewRecord}
									<div class="flex items-center space-x-1 mt-1">
										<Badge color={getItemColor(item)} size="small">
											{record.status}
										</Badge>
										<Badge color="gray" size="small">
											{record.position}
										</Badge>
										{#if record.tags}
											{#each record.tags.slice(0, 2) as tag}
												<Badge color="gray" size="small">
													{tag}
												</Badge>
											{/each}
										{/if}
									</div>
								{/if}
							</div>
						</div>

						<!-- 操作按钮 -->
						<div class="flex items-center space-x-2">
							<Button 
								color="alternative" 
								size="xs" 
								onclick={(e: Event) => {
									e.stopPropagation();
									showItemMetadata(item);
								}}
							>
								<Icon name="info" class="w-3 h-3 mr-1" />
								详情
							</Button>
						</div>
					</button>
				{/each}
			{:else}
				<div class="text-center py-8 text-gray-500 dark:text-gray-400">
					<Icon name="filter" class="w-12 h-12 mx-auto mb-2 opacity-40" />
					<P class="text-sm">没有找到匹配的{mode === 'files' ? '文件' : '记录'}</P>
					<P class="text-xs">尝试调整过滤条件</P>
				</div>
			{/if}
		</div>

		<!-- 选择摘要 -->
		{#if selectedItems.size > 0}
			<div class="p-3 bg-teal-50 dark:bg-teal-900/20 rounded-lg border border-teal-200 dark:border-teal-600">
				<div class="flex items-center justify-between">
					<div>
						<P class="text-sm font-medium text-teal-700 dark:text-teal-300 mb-1">
							已选择 {selectedItems.size} 个{mode === 'files' ? '文件' : '记录'}
						</P>
						<P class="text-xs text-teal-600 dark:text-teal-400">
							点击"处理选中"开始批量{mode === 'files' ? '分析' : '处理'}
						</P>
					</div>
					<div class="text-right">
						<P class="text-xs text-teal-600 dark:text-teal-400">
							总计: {filteredItems().length} 项
						</P>
						<P class="text-xs text-teal-500 dark:text-teal-500">
							选择率: {Math.round((selectedItems.size / filteredItems().length) * 100)}%
						</P>
					</div>
				</div>
			</div>
		{/if}
	</div>
</Card>

<!-- 元数据详情模态框 -->
<Modal bind:open={showMetadataModal} size="lg" autoclose>
	<div class="space-y-4">
		<div class="flex items-center space-x-2">
			<Icon name="info" class="w-5 h-5 text-blue-600" />
			<Heading tag="h3" class="text-lg font-semibold">{metadataTitle}</Heading>
		</div>
		
		{#if selectedItemMetadata}
			<div class="space-y-3">
				{#if mode === 'files'}
					{@const doc = selectedItemMetadata}
					<div class="grid grid-cols-2 gap-4">
						<div>
							<P class="text-sm font-medium text-gray-700 dark:text-gray-300">文件名</P>
							<P class="text-sm text-gray-600 dark:text-gray-400">{doc.name}</P>
						</div>
						<div>
							<P class="text-sm font-medium text-gray-700 dark:text-gray-300">文件类型</P>
							<Badge color={getItemColor(doc)} size="small">{doc.type}</Badge>
						</div>
						<div>
							<P class="text-sm font-medium text-gray-700 dark:text-gray-300">文件大小</P>
							<P class="text-sm text-gray-600 dark:text-gray-400">{formatFileSize(doc.size)}</P>
						</div>
						<div>
							<P class="text-sm font-medium text-gray-700 dark:text-gray-300">上传时间</P>
							<P class="text-sm text-gray-600 dark:text-gray-400">{formatDate(doc.uploadDate)}</P>
						</div>
						{#if doc.metadata}
							{#each Object.entries(doc.metadata) as [key, value]}
								<div>
									<P class="text-sm font-medium text-gray-700 dark:text-gray-300">{key}</P>
									<P class="text-sm text-gray-600 dark:text-gray-400">{value}</P>
								</div>
							{/each}
						{/if}
					</div>
					
					{#if doc.content}
						<div>
							<P class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">文件内容预览</P>
							<Textarea 
								value={typeof doc.content === 'string' ? doc.content : JSON.stringify(doc.content, null, 2)} 
								rows={8} 
								readonly 
								class="font-mono text-xs"
							/>
						</div>
					{/if}
				{:else}
					{@const record = selectedItemMetadata}
					<div class="grid grid-cols-2 gap-4">
						<div>
							<P class="text-sm font-medium text-gray-700 dark:text-gray-300">候选人</P>
							<P class="text-sm text-gray-600 dark:text-gray-400">{record.candidateName}</P>
						</div>
						<div>
							<P class="text-sm font-medium text-gray-700 dark:text-gray-300">职位</P>
							<P class="text-sm text-gray-600 dark:text-gray-400">{record.position}</P>
						</div>
						<div>
							<P class="text-sm font-medium text-gray-700 dark:text-gray-300">面试时间</P>
							<P class="text-sm text-gray-600 dark:text-gray-400">{formatDate(record.interviewDate)}</P>
						</div>
						<div>
							<P class="text-sm font-medium text-gray-700 dark:text-gray-300">状态</P>
							<Badge color={getItemColor(record)} size="small">{record.status}</Badge>
						</div>
						<div>
							<P class="text-sm font-medium text-gray-700 dark:text-gray-300">记录路径</P>
							<P class="text-sm text-gray-600 dark:text-gray-400 font-mono">{record.transcriptPath}</P>
						</div>
						{#if record.tags && record.tags.length > 0}
							<div>
								<P class="text-sm font-medium text-gray-700 dark:text-gray-300">标签</P>
								<div class="flex flex-wrap gap-1 mt-1">
									{#each record.tags as tag}
										<Badge color="gray" size="small">{tag}</Badge>
									{/each}
								</div>
							</div>
						{/if}
					</div>
					
					{#if record.analysisResults}
						<div>
							<P class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">分析结果</P>
							<div class="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
								<P class="text-xs text-gray-600 dark:text-gray-400">
									状态: {record.analysisResults.status}
								</P>
								{#if record.analysisResults.topicAnalysis}
									<P class="text-xs text-gray-600 dark:text-gray-400">
										主题分析: 已完成
									</P>
								{/if}
								{#if record.analysisResults.evaluation}
									<P class="text-xs text-gray-600 dark:text-gray-400">
										能力评估: 已完成
									</P>
								{/if}
							</div>
						</div>
					{/if}
				{/if}
			</div>
		{/if}
		
		<div class="flex justify-end">
			<Button color="alternative" onclick={() => showMetadataModal = false}>
				关闭
			</Button>
		</div>
	</div>
</Modal>