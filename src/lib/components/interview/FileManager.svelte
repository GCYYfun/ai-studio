<script lang="ts">
	import { Card, Button, Heading, P, Modal, Textarea, Input, Select, Badge, Spinner } from 'flowbite-svelte';
	import { ui } from '$lib/ui';
	import { documentStore } from '$lib/stores/interview.js';
	import type { UploadedFile } from '$lib/services/sim/types.js';
	import { interview } from '$lib/services/interviewApi.js';
	import { onMount } from 'svelte';

	const { Icon } = ui;

	// Props
	let { class: className = '' } = $props();

	// Store subscriptions
	let documents = $state<UploadedFile[]>([]);
	let selectedDocument = $state<UploadedFile | null>(null);
	let uploadProgress = $state<{[fileId: string]: number}>({});

	documentStore.documents.subscribe(value => documents = value);
	documentStore.selectedDocument.subscribe(value => selectedDocument = value);
	documentStore.uploadProgress.subscribe(value => uploadProgress = value);

	// Component state
	let fileInput: HTMLInputElement;
	let dragOver = $state(false);
	let loading = $state(false);
	let selectedFileType = $state<'jd' | 'resume' | 'conversation'>('jd');
	let showPreviewModal = $state(false);
	let previewContent = $state('');
	let previewTitle = $state('');
	let showUploadModal = $state(false);
	let pendingFiles = $state<File[]>([]);
	let uploadError = $state<string>('');

	// File type options
	const fileTypeOptions = [
		{ value: 'jd', name: 'JD文件' },
		{ value: 'resume', name: '简历文件' },
		{ value: 'conversation', name: '面试记录' }
	];

	// Load documents on mount
	onMount(async () => {
		await loadDocuments();
	});

	// File management functions
	async function loadDocuments() {
		loading = true;
		try {
			// Load all file types
			const [jdFiles, resumeFiles, conversationFiles] = await Promise.all([
				interview.getFiles('jd'),
				interview.getFiles('resume'),
				interview.getFiles('conversation')
			]);

			const allFiles: UploadedFile[] = [];
			
			if (jdFiles.success) allFiles.push(...jdFiles.data);
			if (resumeFiles.success) allFiles.push(...resumeFiles.data);
			if (conversationFiles.success) allFiles.push(...conversationFiles.data);

			documentStore.documents.set(allFiles);
		} catch (error) {
			console.error('Failed to load documents:', error);
		} finally {
			loading = false;
		}
	}

	function handleFileInputClick() {
		fileInput?.click();
	}

	function handleFileSelect(event: Event) {
		const target = event.target as HTMLInputElement;
		const files = target.files;
		if (files && files.length > 0) {
			pendingFiles = Array.from(files);
			showUploadModal = true;
		}
	}

	function handleDragOver(event: DragEvent) {
		event.preventDefault();
		dragOver = true;
	}

	function handleDragLeave(event: DragEvent) {
		event.preventDefault();
		dragOver = false;
	}

	function handleDrop(event: DragEvent) {
		event.preventDefault();
		dragOver = false;
		
		const files = event.dataTransfer?.files;
		if (files && files.length > 0) {
			pendingFiles = Array.from(files);
			showUploadModal = true;
		}
	}

	async function uploadFiles() {
		if (pendingFiles.length === 0) return;

		showUploadModal = false;
		uploadError = ''; // Clear previous errors
		
		for (const file of pendingFiles) {
			const fileId = `${file.name}_${Date.now()}`;
			
			try {
				// Update progress
				documentStore.uploadProgress.update(progress => ({
					...progress,
					[fileId]: 0
				}));

				// Validate file
				if (!validateFile(file)) {
					throw new Error(`文件 ${file.name} 格式不支持或文件过大（最大10MB）`);
				}

				// Simulate upload progress
				const progressInterval = setInterval(() => {
					documentStore.uploadProgress.update(progress => {
						const currentProgress = progress[fileId] || 0;
						if (currentProgress < 90) {
							return {
								...progress,
								[fileId]: currentProgress + 10
							};
						}
						return progress;
					});
				}, 200);

				console.log(`📤 Uploading file: ${file.name}`);
				
				// Upload file
				const result = await interview.uploadFile(file, selectedFileType);
				
				console.log(`Upload result for ${file.name}:`, result);
				
				clearInterval(progressInterval);

				if (result.success) {
					// Complete progress
					documentStore.uploadProgress.update(progress => ({
						...progress,
						[fileId]: 100
					}));

					// Add to documents
					documentStore.documents.update(docs => [...docs, result.data]);

					console.log(`✅ Successfully uploaded: ${file.name}`);

					// Clean up progress after delay
					setTimeout(() => {
						documentStore.uploadProgress.update(progress => {
							const newProgress = { ...progress };
							delete newProgress[fileId];
							return newProgress;
						});
					}, 2000);
				} else {
					throw new Error(result.error || '上传失败，请重试');
				}
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : '未知错误';
				console.error(`❌ Failed to upload ${file.name}:`, error);
				
				// Set error message for user
				uploadError = `上传 ${file.name} 失败: ${errorMessage}`;
				
				// Clean up progress
				documentStore.uploadProgress.update(progress => {
					const newProgress = { ...progress };
					delete newProgress[fileId];
					return newProgress;
				});
				
				// Show error to user
				alert(`上传失败: ${errorMessage}`);
			}
		}

		pendingFiles = [];
	}

	function validateFile(file: File): boolean {
		// Check file type
		const allowedTypes = ['application/pdf', 'text/plain', 'text/markdown'];
		const allowedExtensions = ['.pdf', '.txt', '.md'];
		
		const hasValidType = allowedTypes.includes(file.type);
		const hasValidExtension = allowedExtensions.some(ext => 
			file.name.toLowerCase().endsWith(ext)
		);

		if (!hasValidType && !hasValidExtension) {
			return false;
		}

		// Check file size (10MB limit)
		const maxSize = 10 * 1024 * 1024;
		if (file.size > maxSize) {
			return false;
		}

		return true;
	}

	function selectDocument(doc: UploadedFile) {
		documentStore.selectedDocument.set(doc);
	}

	async function previewDocument(doc: UploadedFile) {
		try {
			const result = await interview.getFileContent(`files/${doc.id}`);
			if (result.success) {
				previewTitle = doc.name;
				previewContent = typeof result.data.content === 'string' 
					? result.data.content 
					: JSON.stringify(result.data.content, null, 2);
				showPreviewModal = true;
			}
		} catch (error) {
			console.error('Failed to preview document:', error);
		}
	}

	async function deleteDocument(docId: string) {
		if (!confirm('确定要删除这个文件吗？')) return;

		try {
			// Call API to delete from database
			const result = await interview.deleteFile(docId);
			
			if (result.success) {
				// Remove from store only after successful deletion
				documentStore.documents.update(docs => 
					docs.filter(doc => doc.id !== docId)
				);

				// Clear selection if deleted document was selected
				if (selectedDocument?.id === docId) {
					documentStore.selectedDocument.set(null);
				}
				
				console.log('✅ File deleted successfully');
			} else {
				throw new Error(result.error || 'Failed to delete file');
			}
		} catch (error) {
			console.error('❌ Failed to delete document:', error);
			alert('删除文件失败，请重试');
		}
	}

	function getFileIcon(type: string): string {
		switch (type) {
			case 'jd': return 'briefcase';
			case 'resume': return 'user';
			case 'conversation': return 'chat';
			case 'report': return 'chart';
			default: return 'document';
		}
	}

	function getFileTypeColor(type: string): "gray" | "primary" | "secondary" | "red" | "orange" | "amber" | "yellow" | "lime" | "green" | "emerald" | "teal" | "cyan" | "sky" | "blue" | "indigo" | "violet" | "purple" | "fuchsia" | "pink" | "rose" {
		switch (type) {
			case 'jd': return 'blue';
			case 'resume': return 'green';
			case 'conversation': return 'purple';
			case 'report': return 'orange';
			default: return 'gray';
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

	// Group documents by type
	let documentsByType = $derived(() => {
		const groups = {
			jd: documents.filter(doc => doc.type === 'jd'),
			resume: documents.filter(doc => doc.type === 'resume'),
			conversation: documents.filter(doc => doc.type === 'conversation'),
			report: documents.filter(doc => doc.type === 'report')
		};
		return groups;
	});

	// Filter documents by type
	let filteredDocuments = $derived(() => {
		return documents;
	});
</script>

<Card class="shadow-sm hover:shadow-md transition-shadow duration-200 {className}">
	<div class="flex items-center justify-between mb-4">
		<div class="flex items-center space-x-2">
			<Icon name="folder" class="w-5 h-5 text-orange-600 dark:text-orange-400" />
			<Heading tag="h3" class="text-lg font-semibold">文件管理</Heading>
		</div>
		{#if loading}
			<Spinner size="4" />
		{/if}
	</div>
	
	<div class="space-y-4">
		<!-- 文件上传区域 -->
		<div 
			role="button"
			tabindex="0"
			class="border-2 border-dashed rounded-lg p-4 transition-colors duration-200 {dragOver ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600'}"
			ondragover={handleDragOver}
			ondragleave={handleDragLeave}
			ondrop={handleDrop}
			onkeydown={(e) => e.key === 'Enter' && handleFileInputClick()}
		>
			<div class="text-center">
				<Icon name="upload" class="w-8 h-8 mx-auto mb-2 text-gray-400" />
				<P class="text-sm text-gray-500 dark:text-gray-400 mb-2">
					拖拽文件到此处或点击上传
				</P>
				<Button color="alternative" size="small" onclick={handleFileInputClick}>
					选择文件
				</Button>
				<P class="text-xs text-gray-400 dark:text-gray-500 mt-2">
					支持 PDF、TXT、MD 格式，最大 10MB
				</P>
			</div>
			<input 
				bind:this={fileInput}
				type="file" 
				multiple 
				accept=".pdf,.txt,.md"
				class="hidden"
				onchange={handleFileSelect}
			/>
		</div>

		<!-- 文件分类标签 -->
		<div class="grid grid-cols-4 gap-2">
			<div class="text-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
				<Icon name="briefcase" class="w-4 h-4 mx-auto mb-1 text-blue-600" />
				<P class="text-xs font-medium text-blue-700 dark:text-blue-300">JD文件</P>
				<P class="text-xs text-blue-600 dark:text-blue-400">{documentsByType().jd.length}</P>
			</div>
			<div class="text-center p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
				<Icon name="user" class="w-4 h-4 mx-auto mb-1 text-green-600" />
				<P class="text-xs font-medium text-green-700 dark:text-green-300">简历</P>
				<P class="text-xs text-green-600 dark:text-green-400">{documentsByType().resume.length}</P>
			</div>
			<div class="text-center p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
				<Icon name="chat" class="w-4 h-4 mx-auto mb-1 text-purple-600" />
				<P class="text-xs font-medium text-purple-700 dark:text-purple-300">面试记录</P>
				<P class="text-xs text-purple-600 dark:text-purple-400">{documentsByType().conversation.length}</P>
			</div>
			<div class="text-center p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
				<Icon name="chart" class="w-4 h-4 mx-auto mb-1 text-orange-600" />
				<P class="text-xs font-medium text-orange-700 dark:text-orange-300">报告</P>
				<P class="text-xs text-orange-600 dark:text-orange-400">{documentsByType().report.length}</P>
			</div>
		</div>

		<!-- 上传进度 -->
		{#if Object.keys(uploadProgress).length > 0}
			<div class="space-y-2">
				{#each Object.entries(uploadProgress) as [fileId, progress]}
					<div class="flex items-center space-x-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
						<Icon name="upload" class="w-4 h-4 text-blue-600" />
						<div class="flex-1">
							<div class="flex justify-between text-sm">
								<span class="text-blue-700 dark:text-blue-300">上传中...</span>
								<span class="text-blue-600 dark:text-blue-400">{progress}%</span>
							</div>
							<div class="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-1.5 mt-1">
								<div 
									class="bg-blue-600 h-1.5 rounded-full transition-all duration-300" 
									style="width: {progress}%"
								></div>
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}

		<!-- 错误提示 -->
		{#if uploadError}
			<div class="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-600">
				<div class="flex items-center space-x-2">
					<Icon name="x-circle" class="w-4 h-4 text-red-600" />
					<P class="text-sm text-red-700 dark:text-red-300">{uploadError}</P>
					<button 
						class="ml-auto text-red-600 hover:text-red-800"
						onclick={() => uploadError = ''}
					>
						<Icon name="x" class="w-4 h-4" />
					</button>
				</div>
			</div>
		{/if}

		<!-- 文件列表 -->
		<div class="space-y-2 max-h-[400px] overflow-y-auto">
			{#if filteredDocuments().length > 0}
				{#each filteredDocuments() as doc}
					<button 
						class="flex items-center justify-between p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors duration-200 {selectedDocument?.id === doc.id ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20' : ''}"
						onclick={() => selectDocument(doc)}
					>
						<div class="flex items-center space-x-3">
							<Icon name={getFileIcon(doc.type)} class="w-4 h-4 text-{getFileTypeColor(doc.type)}-500" />
							<div>
								<p class="text-sm font-medium text-gray-900 dark:text-white">{doc.name}</p>
								<div class="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
									<Badge color={getFileTypeColor(doc.type)} size="small">{doc.type}</Badge>
									<span>•</span>
									<span>{formatFileSize(doc.size)}</span>
									<span>•</span>
									<span>{formatDate(doc.uploadedAt)}</span>
								</div>
							</div>
						</div>
						<div class="flex items-center space-x-2">
							<Button 
								color="alternative" 
								size="xs" 
								onclick={(e: Event) => {
									e.stopPropagation();
									previewDocument(doc);
								}}
							>
								<Icon name="eye" class="w-3 h-3 mr-1" />
								预览
							</Button>
							<Button 
								color="red" 
								size="xs" 
								onclick={(e: Event) => {
									e.stopPropagation();
									deleteDocument(doc.id);
								}}
							>
								<Icon name="trash" class="w-3 h-3" />
							</Button>
						</div>
					</button>
				{/each}
			{:else}
				<div class="text-center py-8 text-gray-500 dark:text-gray-400">
					<Icon name="folder" class="w-12 h-12 mx-auto mb-2 opacity-40" />
					<P class="text-sm">暂无文件</P>
					<P class="text-xs">上传文件开始使用</P>
				</div>
			{/if}
		</div>

		<!-- 选中文件预览 -->
		{#if selectedDocument}
			<div class="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-600">
				<div class="flex items-center justify-between">
					<div>
						<P class="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">
							已选择: {selectedDocument.name}
						</P>
						<P class="text-xs text-blue-600 dark:text-blue-400">
							{selectedDocument.type} • {formatFileSize(selectedDocument.size)}
						</P>
					</div>
					<Button 
						color="blue" 
						size="xs"
						onclick={() => previewDocument(selectedDocument!)}
					>
						<Icon name="eye" class="w-3 h-3 mr-1" />
						查看详情
					</Button>
				</div>
			</div>
		{/if}
	</div>
</Card>

<!-- 上传确认模态框 -->
<Modal bind:open={showUploadModal} size="md" autoclose={false}>
	<div class="space-y-4">
		<div class="flex items-center space-x-2">
			<Icon name="upload" class="w-5 h-5 text-blue-600" />
			<Heading tag="h3" class="text-lg font-semibold">上传文件</Heading>
		</div>
		
		<div class="space-y-3">
			<div>
				<label for="file-type" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
					文件类型
				</label>
				<Select id="file-type" bind:value={selectedFileType} items={fileTypeOptions} />
			</div>
			
			<div>
				<P class="text-sm text-gray-600 dark:text-gray-400 mb-2">待上传文件:</P>
				<div class="space-y-2">
					{#each pendingFiles as file}
						<div class="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
							<div class="flex items-center space-x-2">
								<Icon name="document" class="w-4 h-4 text-gray-500" />
								<span class="text-sm">{file.name}</span>
							</div>
							<span class="text-xs text-gray-500">{formatFileSize(file.size)}</span>
						</div>
					{/each}
				</div>
			</div>
		</div>
		
		<div class="flex justify-end space-x-2">
			<Button color="alternative" onclick={() => { showUploadModal = false; pendingFiles = []; }}>
				取消
			</Button>
			<Button color="blue" onclick={uploadFiles}>
				<Icon name="upload" class="w-4 h-4 mr-1" />
				上传
			</Button>
		</div>
	</div>
</Modal>

<!-- 文件预览模态框 -->
<Modal bind:open={showPreviewModal} size="xl" autoclose>
	<div class="space-y-4">
		<div class="flex items-center space-x-2">
			<Icon name="eye" class="w-5 h-5 text-blue-600" />
			<Heading tag="h3" class="text-lg font-semibold">文件预览</Heading>
		</div>
		
		<div>
			<P class="text-sm text-gray-600 dark:text-gray-400 mb-2">{previewTitle}</P>
			<Textarea 
				value={previewContent} 
				rows={15} 
				readonly 
				class="font-mono text-sm"
			/>
		</div>
		
		<div class="flex justify-end">
			<Button color="alternative" onclick={() => showPreviewModal = false}>
				关闭
			</Button>
		</div>
	</div>
</Modal>