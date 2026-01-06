<script lang="ts">
	import { Input, Button, Alert } from 'flowbite-svelte';
	import { EyeOutline, EyeSlashOutline } from 'flowbite-svelte-icons';
	
	interface Props {
		value?: string;
		onchange?: (apiKey: string) => void;
		onsubmit?: (apiKey: string) => void;
		loading?: boolean;
		error?: string;
		placeholder?: string;
		class?: string;
	}
	
	let {
		value = '',
		onchange,
		onsubmit,
		loading = false,
		error,
		placeholder = '请输入您的 API Key (sk-...)',
		class: className = ''
	}: Props = $props();
	
	let showKey = $state(false);
	let inputValue = $state('');
	
	// 同步外部值变化
	$effect(() => {
		inputValue = value;
	});
	
	function handleInput(event: Event) {
		const target = event.target as HTMLInputElement;
		inputValue = target.value;
		if (onchange) {
			onchange(inputValue);
		}
	}
	
	function handleSubmit() {
		if (onsubmit && inputValue.trim()) {
			onsubmit(inputValue.trim());
		}
	}
	
	function handleKeyPress(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			handleSubmit();
		}
	}
	
	function toggleShowKey() {
		showKey = !showKey;
	}
	
	// 验证 API Key 格式
	const isValidFormat = $derived(() => {
		return inputValue.trim().startsWith('sk-') && inputValue.trim().length > 10;
	});
</script>

<div class="space-y-3 {className}">
	<div class="relative">
		<div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
			<svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m0 0a2 2 0 012 2m-2-2a2 2 0 00-2 2m2-2V5a2 2 0 00-2-2H9a2 2 0 00-2 2v2m0 0a2 2 0 012 2m0 0a2 2 0 002-2m-2 0V5a2 2 0 012-2m0 0h6m-6 0H3"></path>
			</svg>
		</div>
		
		<Input
			type={showKey ? 'text' : 'password'}
			value={inputValue}
			oninput={handleInput}
			onkeypress={handleKeyPress}
			{placeholder}
			disabled={loading}
			class="pl-10 pr-20 {error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}"
		/>
		
		<div class="absolute inset-y-0 right-0 flex items-center pr-3 space-x-2">
			<button
				type="button"
				onclick={toggleShowKey}
				disabled={loading}
				class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
				title={showKey ? '隐藏 API Key' : '显示 API Key'}
			>
				{#if showKey}
					<EyeSlashOutline class="w-5 h-5" />
				{:else}
					<EyeOutline class="w-5 h-5" />
				{/if}
			</button>
			
			<Button
				size="xs"
				onclick={handleSubmit}
				disabled={loading || !isValidFormat}
				class="px-3"
			>
				{#if loading}
					<svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
						<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
						<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
					</svg>
				{:else}
					连接
				{/if}
			</Button>
		</div>
	</div>
	
	{#if error}
		<Alert color="red" class="text-sm bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700">
			<span class="font-medium text-red-800 dark:text-red-100">连接失败:</span> 
			<span class="text-red-700 dark:text-red-200">{error}</span>
		</Alert>
	{/if}
	
	{#if inputValue && !isValidFormat}
		<p class="text-sm text-yellow-600 dark:text-yellow-400">
			API Key 格式应为 sk- 开头，长度至少 10 个字符
		</p>
	{/if}
	
	<!-- <div class="text-xs text-gray-500 dark:text-gray-400">
		<p>• API Key 仅在本地存储，不会上传到服务器</p>
		<p>• 管理员 Key 名称需包含 "admin" 以获取完整权限</p>
	</div> -->
</div>