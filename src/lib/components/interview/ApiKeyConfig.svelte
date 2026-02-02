<script lang="ts">
	import { apiKeyManager } from '$lib/services/sim/config/ApiKeyManager';
	import { Button, Input, Card, Alert, Modal } from 'flowbite-svelte';
	import { LockSolid, CheckCircleOutline, ExclamationCircleOutline } from 'flowbite-svelte-icons';

	// Props
	let { 
		onConfigured 
	}: { 
		onConfigured?: () => void 
	} = $props();

	// State
	let apiKey = $state('');
	let loading = $state(false);
	let error = $state<string | null>(null);
	let success = $state(false);
	let showModal = $state(false);

	// Check if already configured
	let isConfigured = $state(apiKeyManager.isConfigured());
	let maskedKey = $state(apiKeyManager.getMaskedApiKey());

	async function handleSubmit() {
		if (!apiKey.trim()) {
			error = '请输入API Key';
			return;
		}

		loading = true;
		error = null;
		success = false;

		try {
			const result = await apiKeyManager.setApiKey(apiKey.trim());

			if (result.success) {
				success = true;
				isConfigured = true;
				maskedKey = apiKeyManager.getMaskedApiKey();
				
				// Clear input
				apiKey = '';
				
				// Close modal after short delay
				setTimeout(() => {
					showModal = false;
					if (onConfigured) {
						onConfigured();
					}
				}, 1500);
			} else {
				error = result.error || 'API Key验证失败';
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'API Key配置失败';
		} finally {
			loading = false;
		}
	}

	function handleDisconnect() {
		apiKeyManager.clearApiKey();
		isConfigured = false;
		maskedKey = '';
		apiKey = '';
		error = null;
		success = false;
	}

	function openModal() {
		showModal = true;
		error = null;
		success = false;
	}
</script>

<div class="api-key-config">
	{#if isConfigured}
		<!-- Configured State -->
		<div class="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
			<CheckCircleOutline class="w-5 h-5 text-green-600 dark:text-green-400" />
			<div class="flex-1">
				<p class="text-sm font-medium text-green-800 dark:text-green-300">
					API Key 已配置
				</p>
				<p class="text-xs text-green-600 dark:text-green-400">
					{maskedKey}
				</p>
			</div>
			<div class="flex gap-2">
				<Button size="xs" color="light" onclick={openModal}>
					更换
				</Button>
				<Button size="xs" color="red" onclick={handleDisconnect}>
					断开
				</Button>
			</div>
		</div>
	{:else}
		<!-- Not Configured State -->
		<div class="flex items-center gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
			<ExclamationCircleOutline class="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
			<div class="flex-1">
				<p class="text-sm font-medium text-yellow-800 dark:text-yellow-300">
					需要配置 MengLong API Key
				</p>
				<p class="text-xs text-yellow-600 dark:text-yellow-400">
					请配置API Key以使用面试模拟和评估功能
				</p>
			</div>
			<Button size="xs" color="yellow" onclick={openModal}>
				<LockSolid class="w-4 h-4 mr-1" />
				配置
			</Button>
		</div>
	{/if}
</div>

<!-- Configuration Modal -->
<Modal bind:open={showModal} size="md" autoclose={false}>
	<div class="space-y-4">
		<div class="text-center">
			<LockSolid class="w-12 h-12 mx-auto mb-4 text-blue-600 dark:text-blue-400" />
			<h3 class="text-xl font-semibold mb-2">配置 MengLong API Key</h3>
			<p class="text-sm text-gray-600 dark:text-gray-400">
				请输入您的 MengLong API Key 以使用AI功能
			</p>
		</div>

		{#if error}
			<Alert color="red" class="mb-4">
				<ExclamationCircleOutline class="w-4 h-4 mr-2" />
				{error}
			</Alert>
		{/if}

		{#if success}
			<Alert color="green" class="mb-4">
				<CheckCircleOutline class="w-4 h-4 mr-2" />
				API Key 配置成功！
			</Alert>
		{/if}

		<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
			<div class="mb-4">
				<label for="apiKey" class="block text-sm font-medium mb-2">
					API Key
				</label>
				<Input
					id="apiKey"
					type="password"
					placeholder="请输入您的 API Key"
					bind:value={apiKey}
					disabled={loading || success}
					required
				/>
				<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
					您的API Key将安全地存储在浏览器本地
				</p>
			</div>

			<div class="flex justify-end gap-2">
				<Button 
					color="alternative" 
					onclick={() => showModal = false}
					disabled={loading}
				>
					取消
				</Button>
				<Button 
					type="submit"
					color="blue"
					disabled={loading || success || !apiKey.trim()}
				>
					{#if loading}
						<span class="mr-2">验证中...</span>
					{:else if success}
						<CheckCircleOutline class="w-4 h-4 mr-2" />
						已配置
					{:else}
						配置
					{/if}
				</Button>
			</div>
		</form>

		<div class="pt-4 border-t border-gray-200 dark:border-gray-700">
			<p class="text-xs text-gray-500 dark:text-gray-400">
				<strong>提示：</strong> 如果您还没有API Key，请联系管理员获取。
			</p>
		</div>
	</div>
</Modal>

<style>
	.api-key-config {
		width: 100%;
	}
</style>
