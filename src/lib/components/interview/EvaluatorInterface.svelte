<script lang="ts">
	import { Card, Button, Heading, P, Select, Input, Checkbox, Badge, Modal, Textarea, Alert } from 'flowbite-svelte';
	import { ui } from '$lib/ui';
	import { onMount } from 'svelte';
	import { EvaluationEngine } from '$lib/services/sim/evaluation/EvaluationEngine';
	import { FileManager } from '$lib/services/sim/storage/FileManager';
	import InteractiveSelector from './InteractiveSelector.svelte';
	import type { 
		EvaluatorConfig, 
		TopicAnalysisResult, 
		EvaluationResult,
		UploadedFile,
		InterviewRecord
	} from '$lib/services/sim/types';
	import { documentStore, historyStore } from '$lib/stores/interview';

	const { Icon } = ui;

	// Props
	let { 
		class: className = '',
		onAnalysisComplete = (result: { topicAnalysis?: TopicAnalysisResult; evaluation?: EvaluationResult }) => {},
		onBatchComplete = (results: any[]) => {}
	} = $props();

	// Services
	let evaluationEngine: EvaluationEngine;
	let fileManager: FileManager;

	// Component state
	let loading = $state(false);
	let error = $state<string | null>(null);
	let showError = $state(true);
	let progress = $state<{ step: string; progress: number } | null>(null);
	let showBatchModal = $state(false);
	let showRecordSelector = $state(false);
	let selectedRecords = $state<string[]>([]);
	let batchProgress = $state<{ current: number; total: number; currentItem: string } | null>(null);

	// Store subscriptions
	let availableRecords = $state<InterviewRecord[]>([]);
	let availableFiles = $state<UploadedFile[]>([]);

	// Evaluator configuration
	let evaluatorConfig = $state<EvaluatorConfig>({
		transcriptName: '',
		step: 'all',
		force: false,
		temp: false,
		stage: '1'
	});

	// Batch configuration
	let batchConfig = $state({
		concurrency: 3,
		includeTopicAnalysis: true,
		includeCapabilityEvaluation: true,
		outputFormat: 'json' as 'json' | 'markdown' | 'both'
	});

	// Step options
	const stepOptions = [
		{ value: 'all', name: '完整分析 (主题+评估)' },
		{ value: 'topic', name: '仅主题分析' },
		{ value: 'report', name: '仅能力评估' }
	];

	// Stage options
	const stageOptions = [
		{ value: '1', name: '一面' },
		{ value: '2', name: '二面' },
		{ value: '3', name: '三面' },
		{ value: 'final', name: '终面' }
	];

	// Handle error clearing when showError changes
	$effect(() => {
		if (!showError && error) {
			error = null;
		}
	});

	// Initialize services and load data
	onMount(async () => {
		try {
			evaluationEngine = new EvaluationEngine();
			fileManager = new FileManager();
			await fileManager.initialize(); // Initialize FileManager before using it
			await loadAvailableData();
		} catch (err) {
			console.error('Failed to initialize evaluator:', err);
			error = err instanceof Error ? err.message : '初始化失败';
		}
	});

	// Subscribe to stores
	documentStore.documents.subscribe(value => availableFiles = value);
	historyStore.records.subscribe(value => availableRecords = value);

	async function loadAvailableData() {
		try {
			// Load ALL files by calling getFiles without type parameter
			// This ensures we can find files regardless of their type classification
			const allFiles = await fileManager.getFiles();
			const records = await loadInterviewRecords();
			
			console.log('[EvaluatorInterface] Loaded files:', allFiles.length);
			console.log('[EvaluatorInterface] File details:', allFiles.map(f => ({ id: f.id, name: f.name, type: f.type })));
			
			// Replace (not append) the documents and records
			documentStore.documents.set(allFiles);
			historyStore.records.set(records);
		} catch (err) {
			console.error('Failed to load data:', err);
			error = err instanceof Error ? err.message : '加载数据失败';
		}
	}

	async function loadInterviewRecords(): Promise<InterviewRecord[]> {
		// Mock implementation - in real app this would load from storage
		return [
			{
				id: 'record_1',
				candidateName: '张三',
				position: '前端工程师',
				interviewDate: new Date('2024-01-08'),
				status: 'completed',
				transcriptPath: 'conversations/zhangsan_frontend_interview.txt',
				tags: ['技术面试', '一面']
			},
			{
				id: 'record_2',
				candidateName: '李四',
				position: '后端工程师',
				interviewDate: new Date('2024-01-07'),
				status: 'completed',
				transcriptPath: 'conversations/lisi_backend_interview.txt',
				tags: ['技术面试', '二面']
			}
		];
	}

	async function startEvaluation() {
		if (!evaluatorConfig.transcriptName.trim()) {
			error = '请输入面试记录名称';
			return;
		}

		loading = true;
		error = null;
		progress = null;

		try {
			// Find the transcript file with more flexible matching
			const searchTerm = evaluatorConfig.transcriptName.trim().toLowerCase();
			console.log('[EvaluatorInterface] Searching for:', searchTerm);
			console.log('[EvaluatorInterface] Available files:', availableFiles.map(f => ({ id: f.id, name: f.name })));
			
			const transcriptFile = availableFiles.find(f => {
				const nameMatch = f.name.toLowerCase().includes(searchTerm);
				const idMatch = f.id === evaluatorConfig.transcriptName;
				return nameMatch || idMatch;
			});

			if (!transcriptFile) {
				// Provide helpful error message with available files
				const fileList = availableFiles.slice(0, 5).map(f => f.name).join(', ');
				throw new Error(
					`未找到面试记录: "${evaluatorConfig.transcriptName}"\n\n` +
					`可用文件 (${availableFiles.length} 个): ${fileList}${availableFiles.length > 5 ? '...' : ''}\n\n` +
					`提示: 请点击"浏览记录"按钮选择文件，或输入完整的文件名`
				);
			}

			console.log('[EvaluatorInterface] Found file:', transcriptFile.name);

			// Load transcript content
			const transcriptFileData = await fileManager.getFile(transcriptFile.id);
			if (!transcriptFileData) {
				throw new Error(`无法加载面试记录内容: ${transcriptFile.id}`);
			}
			const transcriptContent = transcriptFileData.content;
			
			console.log('[EvaluatorInterface] Loaded content length:', transcriptContent.length);
			
			// Parse context from file metadata
			const context = {
				jd: transcriptFile.metadata?.jd || transcriptFile.metadata?.position || '职位描述',
				resume: transcriptFile.metadata?.candidate || transcriptFile.metadata?.candidateName || '候选人简历',
				transcript: transcriptContent
			};

			// Run evaluation with progress tracking
			const result = await evaluationEngine.evaluateInterview(
				transcriptContent,
				context,
				{
					step: evaluatorConfig.step,
					stage: evaluatorConfig.stage,
					force: evaluatorConfig.force,
					temp: evaluatorConfig.temp,
					onProgress: (step, prog) => {
						progress = { step, progress: prog };
					},
					onStatusChange: (status) => {
						console.log('Evaluation status:', status);
					}
				}
			);

			console.log('[EvaluatorInterface] Evaluation complete:', result);

			// Notify parent component
			onAnalysisComplete(result);

			// Reset form
			if (!evaluatorConfig.temp) {
				evaluatorConfig.transcriptName = '';
			}

		} catch (err) {
			console.error('Evaluation failed:', err);
			error = err instanceof Error ? err.message : '评估失败';
		} finally {
			loading = false;
			progress = null;
		}
	}

	function openBatchEvaluation() {
		showBatchModal = true;
	}

	function openRecordSelector() {
		showRecordSelector = true;
	}

	function onRecordSelectionChange(selected: string[]) {
		selectedRecords = selected;
	}

	async function startBatchEvaluation() {
		if (selectedRecords.length === 0) {
			error = '请选择要处理的记录';
			return;
		}

		loading = true;
		error = null;
		batchProgress = { current: 0, total: selectedRecords.length, currentItem: '' };
		showBatchModal = false;

		try {
			const batchItems = selectedRecords.map(recordId => {
				const record = availableRecords.find(r => r.id === recordId);
				const file = availableFiles.find(f => f.id === recordId || f.name.includes(recordId));
				
				if (!record || !file) {
					throw new Error(`未找到记录或文件: ${recordId}`);
				}

				return {
					transcript: file.content || '',
					context: {
						jd: record.position,
						resume: record.candidateName,
						transcript: file.content || ''
					},
					name: record.candidateName
				};
			});

			const results = await evaluationEngine.batchEvaluate(
				batchItems,
				{
					step: evaluatorConfig.step,
					stage: evaluatorConfig.stage,
					concurrency: batchConfig.concurrency,
					onItemComplete: (index, total, result) => {
						batchProgress = {
							current: index + 1,
							total,
							currentItem: result.name || `项目 ${index + 1}`
						};
					},
					onStatusChange: (status) => {
						console.log('Batch evaluation status:', status);
					}
				}
			);

			// Notify parent component
			onBatchComplete(results);

		} catch (err) {
			console.error('Batch evaluation failed:', err);
			error = err instanceof Error ? err.message : '批量评估失败';
		} finally {
			loading = false;
			batchProgress = null;
		}
	}

	function selectRecordFromList(record: InterviewRecord) {
		evaluatorConfig.transcriptName = record.transcriptPath;
		evaluatorConfig.stage = record.tags?.includes('二面') ? '2' : 
							   record.tags?.includes('三面') ? '3' : 
							   record.tags?.includes('终面') ? 'final' : '1';
		showRecordSelector = false;
	}

	function clearError() {
		error = null;
	}
</script>

<Card class="shadow-sm hover:shadow-md transition-shadow duration-200 {className}">
	<div class="flex items-center space-x-2 mb-4">
		<Icon name="chart" class="w-5 h-5 text-purple-600 dark:text-purple-400" />
		<Heading tag="h3" class="text-lg font-semibold">评估器配置</Heading>
	</div>
	
	<!-- Error Alert -->
	{#if error}
		<Alert color="red" class="mb-4" dismissable bind:alertStatus={showError}>
			<Icon name="x-circle" class="w-4 h-4 mr-2" />
			{error}
		</Alert>
	{/if}

	<!-- Progress Indicator -->
	{#if progress}
		<div class="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
			<div class="flex items-center justify-between mb-2">
				<P class="text-sm font-medium text-blue-700 dark:text-blue-300">
					{progress.step === 'topic_analysis' ? '主题分析中...' : 
					 progress.step === 'capability_evaluation' ? '能力评估中...' : '处理中...'}
				</P>
				<P class="text-sm text-blue-600 dark:text-blue-400">{progress.progress}%</P>
			</div>
			<div class="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
				<div 
					class="bg-blue-600 h-2 rounded-full transition-all duration-300" 
					style="width: {progress.progress}%"
				></div>
			</div>
		</div>
	{/if}

	<!-- Batch Progress -->
	{#if batchProgress}
		<div class="mb-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
			<div class="flex items-center justify-between mb-2">
				<P class="text-sm font-medium text-green-700 dark:text-green-300">
					批量处理中: {batchProgress.currentItem}
				</P>
				<P class="text-sm text-green-600 dark:text-green-400">
					{batchProgress.current} / {batchProgress.total}
				</P>
			</div>
			<div class="w-full bg-green-200 dark:bg-green-800 rounded-full h-2">
				<div 
					class="bg-green-600 h-2 rounded-full transition-all duration-300" 
					style="width: {(batchProgress.current / batchProgress.total) * 100}%"
				></div>
			</div>
		</div>
	{/if}
	
	<div class="space-y-4">
		<!-- 面试记录选择 -->
		<div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
			<div class="flex items-center justify-between mb-3">
				<P class="text-sm font-medium text-gray-700 dark:text-gray-300">面试记录选择</P>
				<Button color="alternative" size="xs" onclick={openRecordSelector}>
					<Icon name="search" class="w-3 h-3 mr-1" />
					浏览记录
				</Button>
			</div>
			
			<div class="space-y-3">
				<div>
					<label for="transcript-name" class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
						记录名称或路径
					</label>
					<Input 
						id="transcript-name"
						type="text" 
						bind:value={evaluatorConfig.transcriptName}
						placeholder="输入面试记录名称或选择文件"
						class="w-full"
						disabled={loading}
					/>
				</div>

				<!-- 快速选择文件列表 -->
				{#if availableFiles.length > 0}
					<div>
						<div class="flex items-center justify-between mb-2">
							<P class="text-xs font-medium text-gray-700 dark:text-gray-300">可用文件 ({availableFiles.length})</P>
							<Button color="alternative" size="xs" onclick={loadAvailableData}>
								<Icon name="refresh" class="w-3 h-3" />
							</Button>
						</div>
						<div class="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded p-2">
							{#each availableFiles as file}
								<button 
									class="flex items-center justify-between p-2 text-left bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
									onclick={() => {
										evaluatorConfig.transcriptName = file.name;
									}}
									disabled={loading}
								>
									<div class="flex-1 min-w-0">
										<P class="text-xs font-medium text-gray-900 dark:text-white truncate">
											{file.name}
										</P>
										<P class="text-xs text-gray-500 dark:text-gray-400">
											{file.metadata?.candidateName || '未知候选人'} • 
											{file.metadata?.position || '未知职位'}
										</P>
									</div>
									<div class="flex items-center space-x-2 ml-2">
										<Badge color={file.type === 'conversation' ? 'purple' : 'gray'} size="small">
											{file.type}
										</Badge>
										<Badge color="blue" size="small">
											{(file.size / 1024).toFixed(1)} KB
										</Badge>
									</div>
								</button>
							{/each}
						</div>
					</div>
				{:else}
					<div class="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-600">
						<P class="text-sm text-yellow-700 dark:text-yellow-300">
							<Icon name="exclamation-triangle" class="w-4 h-4 inline mr-1" />
							没有找到可用的文件。请先上传面试记录文件。
						</P>
					</div>
				{/if}
			</div>
		</div>

		<!-- 评估配置 -->
		<div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
			<P class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">评估配置</P>
			
			<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
				<div>
					<label for="eval-step" class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
						评估步骤
					</label>
					<Select 
						id="eval-step"
						bind:value={evaluatorConfig.step}
						items={stepOptions}
						disabled={loading}
					/>
				</div>
				
				<div>
					<label for="interview-stage" class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
						面试阶段
					</label>
					<Select 
						id="interview-stage"
						bind:value={evaluatorConfig.stage}
						items={stageOptions}
						disabled={loading}
					/>
				</div>
			</div>

			<div class="flex items-center space-x-4 mt-3">
				<div class="flex items-center space-x-2">
					<Checkbox 
						bind:checked={evaluatorConfig.force}
						id="force-regen"
						disabled={loading}
					/>
					<label for="force-regen" class="text-xs font-medium text-gray-700 dark:text-gray-300">
						强制重新生成
					</label>
				</div>
				<div class="flex items-center space-x-2">
					<Checkbox 
						bind:checked={evaluatorConfig.temp}
						id="temp-eval"
						disabled={loading}
					/>
					<label for="temp-eval" class="text-xs font-medium text-gray-700 dark:text-gray-300">
						临时模式
					</label>
				</div>
			</div>
		</div>

		<!-- 批量处理选项 -->
		<div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
			<div class="flex items-center justify-between mb-3">
				<P class="text-sm font-medium text-gray-700 dark:text-gray-300">批量处理</P>
				{#if selectedRecords.length > 0}
					<Badge color="purple">{selectedRecords.length} 项已选择</Badge>
				{/if}
			</div>
			
			<P class="text-xs text-gray-500 dark:text-gray-400 mb-3">
				选择多个面试记录进行批量分析，提高处理效率
			</P>
			
			<div class="flex space-x-2">
				<Button 
					color="alternative" 
					onclick={openBatchEvaluation}
					disabled={loading}
					class="flex-1"
				>
					<Icon name="document" class="w-4 h-4 mr-2" />
					配置批量处理
				</Button>
				
				{#if selectedRecords.length > 0}
					<Button 
						color="purple" 
						onclick={startBatchEvaluation}
						disabled={loading}
					>
						<Icon name="play" class="w-4 h-4 mr-2" />
						开始批量处理
					</Button>
				{/if}
			</div>
		</div>

		<!-- 控制按钮 -->
		<div class="flex space-x-2">
			<Button 
				color="purple" 
				onclick={startEvaluation} 
				disabled={loading || !evaluatorConfig.transcriptName.trim()}
				class="flex-1"
			>
				{#if loading}
					<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
				{:else}
					<Icon name="chart" class="w-4 h-4 mr-2" />
				{/if}
				开始评估
			</Button>
		</div>

		<!-- 状态信息 -->
		<div class="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-600">
			<div class="flex items-center justify-between text-sm">
				<div class="flex items-center space-x-4">
					<span class="text-blue-700 dark:text-blue-300">
						<Icon name="document" class="w-4 h-4 inline mr-1" />
						{availableFiles.length} 个文件
					</span>
					{#if availableFiles.filter(f => f.type === 'conversation').length > 0}
						<span class="text-blue-700 dark:text-blue-300">
							({availableFiles.filter(f => f.type === 'conversation').length} 个面试记录)
						</span>
					{/if}
				</div>
				<Button color="blue" size="xs" onclick={loadAvailableData}>
					<Icon name="refresh" class="w-3 h-3 mr-1" />
					刷新
				</Button>
			</div>
		</div>
	</div>
</Card>

<!-- 记录选择器模态框 -->
<Modal bind:open={showRecordSelector} size="xl" autoclose>
	<div class="space-y-4">
		<div class="flex items-center space-x-2">
			<Icon name="search" class="w-5 h-5 text-purple-600" />
			<Heading tag="h3" class="text-lg font-semibold">选择面试记录</Heading>
		</div>
		
		<InteractiveSelector 
			mode="records"
			onSelectionChange={(selected: string[]) => {
				// For single selection in this context
				if (selected.length > 0) {
					const record = availableRecords.find(r => r.id === selected[0]);
					if (record) {
						selectRecordFromList(record);
					}
				}
			}}
		/>
	</div>
</Modal>

<!-- 批量处理配置模态框 -->
<Modal bind:open={showBatchModal} size="lg" autoclose>
	<div class="space-y-4">
		<div class="flex items-center space-x-2">
			<Icon name="document" class="w-5 h-5 text-purple-600" />
			<Heading tag="h3" class="text-lg font-semibold">批量处理配置</Heading>
		</div>
		
		<!-- 记录选择 -->
		<div>
			<P class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">选择要处理的记录</P>
			<InteractiveSelector 
				mode="records"
				onSelectionChange={onRecordSelectionChange}
			/>
		</div>

		<!-- 批量配置选项 -->
		<div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
			<P class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">处理选项</P>
			
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div>
					<label for="batch-concurrency" class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
						并发数量
					</label>
					<Select 
						id="batch-concurrency"
						bind:value={batchConfig.concurrency}
						items={[
							{ value: 1, name: '1 (顺序处理)' },
							{ value: 2, name: '2 (低并发)' },
							{ value: 3, name: '3 (推荐)' },
							{ value: 5, name: '5 (高并发)' }
						]}
					/>
				</div>
				
				<div>
					<label for="batch-output" class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
						输出格式
					</label>
					<Select 
						id="batch-output"
						bind:value={batchConfig.outputFormat}
						items={[
							{ value: 'json', name: 'JSON 格式' },
							{ value: 'markdown', name: 'Markdown 格式' },
							{ value: 'both', name: '两种格式' }
						]}
					/>
				</div>
			</div>

			<div class="flex items-center space-x-4 mt-3">
				<div class="flex items-center space-x-2">
					<Checkbox 
						bind:checked={batchConfig.includeTopicAnalysis}
						id="batch-topic"
					/>
					<label for="batch-topic" class="text-xs font-medium text-gray-700 dark:text-gray-300">
						包含主题分析
					</label>
				</div>
				<div class="flex items-center space-x-2">
					<Checkbox 
						bind:checked={batchConfig.includeCapabilityEvaluation}
						id="batch-capability"
					/>
					<label for="batch-capability" class="text-xs font-medium text-gray-700 dark:text-gray-300">
						包含能力评估
					</label>
				</div>
			</div>
		</div>

		<!-- 预估信息 -->
		{#if selectedRecords.length > 0}
			<div class="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
				<P class="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">
					处理预估
				</P>
				<div class="text-xs text-blue-600 dark:text-blue-400 space-y-1">
					<div>选中记录: {selectedRecords.length} 个</div>
					<div>并发数量: {batchConfig.concurrency}</div>
					<div>预计时间: {Math.ceil(selectedRecords.length / batchConfig.concurrency * 2)} - {Math.ceil(selectedRecords.length / batchConfig.concurrency * 5)} 分钟</div>
				</div>
			</div>
		{/if}
		
		<div class="flex justify-end space-x-2">
			<Button color="alternative" onclick={() => showBatchModal = false}>
				取消
			</Button>
			<Button 
				color="purple" 
				onclick={startBatchEvaluation}
				disabled={selectedRecords.length === 0}
			>
				开始批量处理
			</Button>
		</div>
	</div>
</Modal>