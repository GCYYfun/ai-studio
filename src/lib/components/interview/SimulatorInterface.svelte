<script lang="ts">
	import { onMount } from 'svelte';
	import { Card, Button, Heading, P, Select, Input, Textarea, Fileupload, Badge, Alert } from 'flowbite-svelte';
	import { ui } from '$lib/ui';
	import { interviewStore, documentStore, type InterviewConfig } from '$lib/stores/interview.js';
	import { FileManager } from '$lib/services/sim/storage/FileManager.js';
	import { InteractiveSelector } from '$lib/services/sim/storage/InteractiveSelector.js';
	import { InterviewController } from '$lib/services/sim/interview/InterviewController.js';
	import type { UploadedFile, InterviewSession } from '$lib/services/sim/types.js';

	const { Icon } = ui;

	// Props
	let { class: className = '' } = $props();

	// Services
	let fileManager: FileManager;
	let selector: InteractiveSelector;
	let controller: InterviewController;

	// Store subscriptions
	let currentConfig = $state<InterviewConfig | null>(null);
	let uiState = $state({ activePanel: 'config', showThinking: true, isFullscreen: false });
	let documents = $state<UploadedFile[]>([]);
	let selectedDocument = $state<UploadedFile | null>(null);

	// Subscribe to stores
	interviewStore.currentConfig.subscribe(value => currentConfig = value);
	interviewStore.uiState.subscribe(value => uiState = value);
	documentStore.documents.subscribe(value => documents = value);
	documentStore.selectedDocument.subscribe(value => selectedDocument = value);

	// Configuration form state
	let formData = $state({
		jd: '',
		resume: '',
		transcript: '',
		maxTurns: 20,
		interviewerModel: 'global.anthropic.claude-sonnet-4-5-20250929-v1:0',
		candidateModel: 'global.anthropic.claude-sonnet-4-5-20250929-v1:0',
		outputDir: 'data/generated',
		temp: false
	});

	// File management state
	let jdFiles = $state<UploadedFile[]>([]);
	let resumeFiles = $state<UploadedFile[]>([]);
	let transcriptFiles = $state<UploadedFile[]>([]);
	let selectedJD = $state<UploadedFile | null>(null);
	let selectedResume = $state<UploadedFile | null>(null);
	let selectedTranscript = $state<UploadedFile | null>(null);

	// UI state
	let isUploading = $state(false);
	let uploadError = $state<string | null>(null);
	let configValid = $state(false);

	// Available models
	const availableModels = [
		{ value: 'global.anthropic.claude-sonnet-4-5-20250929-v1:0', name: 'Claude 4.5 Sonnet' },
		{ value: 'deepseek-chat', name: 'DeepSeek' }
	];

	onMount(async () => {
		// Initialize services
		fileManager = new FileManager();
		selector = new InteractiveSelector();
		controller = new InterviewController({
			enableRealTimeUpdates: true,
			autoSave: true
		});
		
		try {
			await fileManager.initialize();
			await selector.initialize();
			await loadFiles();

			// Set up controller event listeners
			controller.addEventListener('status_change', (event) => {
				console.log('Interview status changed:', event.data.status);
			});

			controller.addEventListener('message', (event) => {
				// Update store with the entire session from controller
				// The controller already maintains the messages array, so we just sync it
				const controllerSession = controller.getCurrentSession();
				if (controllerSession) {
					interviewStore.currentSession.set({
						sessionId: controllerSession.sessionId,
						status: controllerSession.status,
						messages: controllerSession.messages
					});
				}
			});

			controller.addEventListener('progress', (event) => {
				console.log('Interview progress:', event.data.progress);
			});

			controller.addEventListener('error', (event) => {
				console.error('Interview error:', event.data.error);
				uploadError = event.data.error.message;
			});

		} catch (error) {
			console.error('Failed to initialize file services:', error);
			uploadError = 'Failed to initialize file services';
		}
	});

	// Load files from storage
	async function loadFiles() {
		try {
			const [jds, resumes, transcripts] = await Promise.all([
				fileManager.getFiles('jd'),
				fileManager.getFiles('resume'),
				fileManager.getFiles('conversation')
			]);
			
			jdFiles = jds;
			resumeFiles = resumes;
			transcriptFiles = transcripts;
			
			// Update document store
			documentStore.documents.set([...jds, ...resumes, ...transcripts]);
		} catch (error) {
			console.error('Failed to load files:', error);
			uploadError = 'Failed to load files from storage';
		}
	}

	// Handle file upload
	async function handleFileUpload(event: Event, type: 'jd' | 'resume' | 'conversation') {
		const input = event.target as HTMLInputElement;
		const files = input.files;
		
		if (!files || files.length === 0) return;

		isUploading = true;
		uploadError = null;

		try {
			for (const file of files) {
				const uploadedFile = await fileManager.uploadFile(file, type);
				
				// Add to appropriate array
				if (type === 'jd') {
					jdFiles = [...jdFiles, uploadedFile];
				} else if (type === 'resume') {
					resumeFiles = [...resumeFiles, uploadedFile];
				} else if (type === 'conversation') {
					transcriptFiles = [...transcriptFiles, uploadedFile];
				}
			}
			
			await loadFiles(); // Refresh all files
		} catch (error) {
			console.error('File upload failed:', error);
			uploadError = error instanceof Error ? error.message : 'File upload failed';
		} finally {
			isUploading = false;
			// Clear input
			input.value = '';
		}
	}

	// Handle file selection
	function selectFile(file: UploadedFile, type: 'jd' | 'resume' | 'conversation') {
		if (type === 'jd') {
			selectedJD = file;
			formData.jd = file.content;
		} else if (type === 'resume') {
			selectedResume = file;
			formData.resume = file.content;
		} else if (type === 'conversation') {
			selectedTranscript = file;
			formData.transcript = file.content;
		}
		
		validateConfig();
	}

	// Remove file selection
	function removeFileSelection(type: 'jd' | 'resume' | 'conversation') {
		if (type === 'jd') {
			selectedJD = null;
			formData.jd = '';
		} else if (type === 'resume') {
			selectedResume = null;
			formData.resume = '';
		} else if (type === 'conversation') {
			selectedTranscript = null;
			formData.transcript = '';
		}
		
		validateConfig();
	}

	// Validate configuration
	function validateConfig() {
		configValid = !!(formData.jd && formData.resume && formData.maxTurns > 0);
	}

	// Update configuration
	function updateConfig() {
		validateConfig();
		if (configValid) {
			interviewStore.currentConfig.set(formData);
		}
	}

	// Start simulation
	async function startSimulation() {
		if (!configValid) {
			uploadError = 'Please provide both JD and Resume to start simulation';
			return;
		}

		try {
			uploadError = null;
			
			// Initialize session with controller
			const session = await controller.initializeSession(formData);
			
			// Update store with session
			interviewStore.currentSession.set({
				sessionId: session.sessionId,
				status: session.status,
				messages: session.messages
			});

			// Update config store
			interviewStore.currentConfig.set(formData);

			// Switch to simulation panel
			interviewStore.uiState.update(state => ({ ...state, activePanel: 'simulation' }));

			// Start the actual simulation
			await controller.startSimulation();
			
			console.log('Simulation started successfully');
		} catch (error) {
			console.error('Failed to start simulation:', error);
			uploadError = error instanceof Error ? error.message : 'Failed to start simulation';
		}
	}

	// Reactive validation
	$effect(() => {
		validateConfig();
	});
</script>

<Card class="shadow-sm hover:shadow-md transition-shadow duration-200 {className}">
	<div class="flex items-center space-x-2 mb-4">
		<Icon name="cog" class="w-5 h-5 text-blue-600 dark:text-blue-400" />
		<Heading tag="h3" class="text-lg font-semibold">面试模拟器配置</Heading>
		{#if configValid}
			<Badge color="green" class="ml-auto">配置完成</Badge>
		{:else}
			<Badge color="yellow" class="ml-auto">配置中</Badge>
		{/if}
	</div>

	{#if uploadError}
		<Alert color="red" class="mb-4">
			<Icon name="exclamation-triangle" class="w-4 h-4 mr-2" />
			{uploadError}
			<button onclick={() => uploadError = null} class="ml-auto">
				<Icon name="close" class="w-4 h-4" />
			</button>
		</Alert>
	{/if}
	
	<div class="space-y-6">
		<!-- JD 文件选择 -->
		<div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
			<div class="flex items-center justify-between mb-3">
				<P class="text-sm font-medium text-gray-700 dark:text-gray-300">职位描述 (JD)</P>
				{#if selectedJD}
					<Badge color="green" class="text-xs">已选择</Badge>
				{:else}
					<Badge color="gray" class="text-xs">未选择</Badge>
				{/if}
			</div>
			
			{#if selectedJD}
				<div class="mb-3 p-3 bg-white dark:bg-gray-700 rounded border">
					<div class="flex items-center justify-between">
						<div class="flex items-center space-x-2">
							<Icon name="document" class="w-4 h-4 text-blue-600" />
							<span class="text-sm font-medium">{selectedJD.name}</span>
							<span class="text-xs text-gray-500">({(selectedJD.size / 1024).toFixed(1)} KB)</span>
						</div>
						<Button size="xs" color="red" onclick={() => removeFileSelection('jd')}>
							<Icon name="close" class="w-3 h-3" />
						</Button>
					</div>
					{#if selectedJD.metadata.position}
						<P class="text-xs text-gray-600 dark:text-gray-400 mt-1">
							职位: {selectedJD.metadata.position}
						</P>
					{/if}
				</div>
			{/if}

			<!-- JD 文件列表 -->
			{#if jdFiles.length > 0}
				<div class="mb-3">
					<P class="text-xs text-gray-600 dark:text-gray-400 mb-2">选择已上传的JD文件:</P>
					<div class="max-h-32 overflow-y-auto space-y-1">
						{#each jdFiles as file}
							<button
								class="w-full text-left p-2 text-sm rounded border hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors {selectedJD?.id === file.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-600'}"
								onclick={() => selectFile(file, 'jd')}
							>
								<div class="flex items-center justify-between">
									<span class="truncate">{file.name}</span>
									<span class="text-xs text-gray-500 ml-2">{file.metadata.position || 'Unknown'}</span>
								</div>
							</button>
						{/each}
					</div>
				</div>
			{/if}

			<!-- JD 文件上传 -->
			<div class="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center">
				<input
					type="file"
					accept=".pdf,.txt,.md"
					onchange={(e) => handleFileUpload(e, 'jd')}
					class="hidden"
					id="jd-upload"
					disabled={isUploading}
				/>
				<label for="jd-upload" class="cursor-pointer">
					<Icon name="upload" class="w-6 h-6 mx-auto mb-2 text-gray-400" />
					<P class="text-sm text-gray-500 dark:text-gray-400">
						{isUploading ? '上传中...' : '点击上传 JD 文件'}
					</P>
					<P class="text-xs text-gray-400 dark:text-gray-500 mt-1">
						支持 PDF、TXT、MD 格式
					</P>
				</label>
			</div>
		</div>

		<!-- 简历文件选择 -->
		<div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
			<div class="flex items-center justify-between mb-3">
				<P class="text-sm font-medium text-gray-700 dark:text-gray-300">候选人简历</P>
				{#if selectedResume}
					<Badge color="green" class="text-xs">已选择</Badge>
				{:else}
					<Badge color="gray" class="text-xs">未选择</Badge>
				{/if}
			</div>
			
			{#if selectedResume}
				<div class="mb-3 p-3 bg-white dark:bg-gray-700 rounded border">
					<div class="flex items-center justify-between">
						<div class="flex items-center space-x-2">
							<Icon name="user" class="w-4 h-4 text-green-600" />
							<span class="text-sm font-medium">{selectedResume.name}</span>
							<span class="text-xs text-gray-500">({(selectedResume.size / 1024).toFixed(1)} KB)</span>
						</div>
						<Button size="xs" color="red" onclick={() => removeFileSelection('resume')}>
							<Icon name="close" class="w-3 h-3" />
						</Button>
					</div>
					{#if selectedResume.metadata.candidateName}
						<P class="text-xs text-gray-600 dark:text-gray-400 mt-1">
							候选人: {selectedResume.metadata.candidateName}
						</P>
					{/if}
				</div>
			{/if}

			<!-- 简历文件列表 -->
			{#if resumeFiles.length > 0}
				<div class="mb-3">
					<P class="text-xs text-gray-600 dark:text-gray-400 mb-2">选择已上传的简历文件:</P>
					<div class="max-h-32 overflow-y-auto space-y-1">
						{#each resumeFiles as file}
							<button
								class="w-full text-left p-2 text-sm rounded border hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors {selectedResume?.id === file.id ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-gray-200 dark:border-gray-600'}"
								onclick={() => selectFile(file, 'resume')}
							>
								<div class="flex items-center justify-between">
									<span class="truncate">{file.name}</span>
									<span class="text-xs text-gray-500 ml-2">{file.metadata.candidateName || 'Unknown'}</span>
								</div>
							</button>
						{/each}
					</div>
				</div>
			{/if}

			<!-- 简历文件上传 -->
			<div class="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center">
				<input
					type="file"
					accept=".pdf,.txt,.md"
					onchange={(e) => handleFileUpload(e, 'resume')}
					class="hidden"
					id="resume-upload"
					disabled={isUploading}
				/>
				<label for="resume-upload" class="cursor-pointer">
					<Icon name="upload" class="w-6 h-6 mx-auto mb-2 text-gray-400" />
					<P class="text-sm text-gray-500 dark:text-gray-400">
						{isUploading ? '上传中...' : '点击上传简历文件'}
					</P>
					<P class="text-xs text-gray-400 dark:text-gray-500 mt-1">
						支持 PDF、TXT、MD 格式
					</P>
				</label>
			</div>
		</div>

		<!-- 参考面试记录 (可选) -->
		<div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
			<div class="flex items-center justify-between mb-3">
				<P class="text-sm font-medium text-gray-700 dark:text-gray-300">参考面试记录 (可选)</P>
				{#if selectedTranscript}
					<Badge color="blue" class="text-xs">已选择</Badge>
				{:else}
					<Badge color="gray" class="text-xs">未选择</Badge>
				{/if}
			</div>
			
			{#if selectedTranscript}
				<div class="mb-3 p-3 bg-white dark:bg-gray-700 rounded border">
					<div class="flex items-center justify-between">
						<div class="flex items-center space-x-2">
							<Icon name="chat" class="w-4 h-4 text-purple-600" />
							<span class="text-sm font-medium">{selectedTranscript.name}</span>
							<span class="text-xs text-gray-500">({(selectedTranscript.size / 1024).toFixed(1)} KB)</span>
						</div>
						<Button size="xs" color="red" onclick={() => removeFileSelection('conversation')}>
							<Icon name="close" class="w-3 h-3" />
						</Button>
					</div>
					{#if selectedTranscript.metadata.candidateName}
						<P class="text-xs text-gray-600 dark:text-gray-400 mt-1">
							候选人: {selectedTranscript.metadata.candidateName}
						</P>
					{/if}
				</div>
			{/if}

			<!-- 面试记录文件列表 -->
			{#if transcriptFiles.length > 0}
				<div class="mb-3">
					<P class="text-xs text-gray-600 dark:text-gray-400 mb-2">选择已上传的面试记录:</P>
					<div class="max-h-32 overflow-y-auto space-y-1">
						{#each transcriptFiles as file}
							<button
								class="w-full text-left p-2 text-sm rounded border hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors {selectedTranscript?.id === file.id ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' : 'border-gray-200 dark:border-gray-600'}"
								onclick={() => selectFile(file, 'conversation')}
							>
								<div class="flex items-center justify-between">
									<span class="truncate">{file.name}</span>
									<span class="text-xs text-gray-500 ml-2">{file.metadata.candidateName || 'Unknown'}</span>
								</div>
							</button>
						{/each}
					</div>
				</div>
			{/if}

			<!-- 面试记录上传 -->
			<div class="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center">
				<input
					type="file"
					accept=".pdf,.txt,.md"
					onchange={(e) => handleFileUpload(e, 'conversation')}
					class="hidden"
					id="transcript-upload"
					disabled={isUploading}
				/>
				<label for="transcript-upload" class="cursor-pointer">
					<Icon name="upload" class="w-6 h-6 mx-auto mb-2 text-gray-400" />
					<P class="text-sm text-gray-500 dark:text-gray-400">
						{isUploading ? '上传中...' : '点击上传面试记录 (可选)'}
					</P>
					<P class="text-xs text-gray-400 dark:text-gray-500 mt-1">
						支持 PDF、TXT、MD 格式
					</P>
				</label>
			</div>
		</div>
		
		<!-- 面试参数配置 -->
		<div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
			<P class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">面试参数</P>
			<div class="space-y-4">
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<label for="max-turns" class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">最大轮数</label>
						<Input 
							id="max-turns"
							type="number" 
							bind:value={formData.maxTurns}
							min="1"
							max="50"
							size="sm"
						/>
					</div>
					<div class="flex items-center space-x-2 pt-6">
						<input 
							type="checkbox" 
							bind:checked={formData.temp}
							id="temp-mode"
							class="rounded border-gray-300 dark:border-gray-600"
						/>
						<label for="temp-mode" class="text-xs font-medium text-gray-700 dark:text-gray-300">临时模式</label>
					</div>
				</div>
				
				<div>
					<label for="interviewer-model" class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">面试官模型</label>
					<Select 
						id="interviewer-model"
						bind:value={formData.interviewerModel}
						size="sm"
						items={availableModels}
					/>
				</div>
				
				<div>
					<label for="candidate-model" class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">候选人模型</label>
					<Select 
						id="candidate-model"
						bind:value={formData.candidateModel}
						size="sm"
						items={availableModels}
					/>
				</div>
			</div>
		</div>

		<!-- 控制按钮 -->
		<div class="flex space-x-2">
			<Button color="blue" onclick={updateConfig} class="flex-1" disabled={!configValid}>
				<Icon name="cog" class="w-4 h-4 mr-2" />
				更新配置
			</Button>
			<Button color="green" onclick={startSimulation} class="flex-1" disabled={!configValid}>
				<Icon name="play" class="w-4 h-4 mr-2" />
				开始面试
			</Button>
		</div>

		{#if !configValid}
			<Alert color="yellow" class="text-sm">
				<Icon name="info" class="w-4 h-4 mr-2" />
				请选择 JD 和简历文件后开始面试模拟
			</Alert>
		{/if}
	</div>
</Card>