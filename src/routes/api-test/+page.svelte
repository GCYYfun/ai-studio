<script lang="ts">
	import { onMount } from 'svelte';
	import { apiConnection, apiService, api } from '$lib';
	import { LoadingSpinner } from '$lib';
	import type { APIResponse } from '$lib/types';

	// 状态管理
	let connectionStatus = 'checking';
	let connectionError = '';
	let testResults: Array<{
		name: string;
		status: 'pending' | 'success' | 'error';
		result?: any;
		error?: string;
		duration?: number;
	}> = [];

	// API配置
	let apiBaseUrl = 'http://localhost:3001';
	let customEndpoint = '/health';
	let testData = '{"test": "data"}';

	// 测试函数
	async function checkConnection() {
		connectionStatus = 'checking';
		connectionError = '';
		
		try {
			const connected = await apiConnection.checkConnection();
			connectionStatus = connected ? 'connected' : 'disconnected';
			
			if (!connected) {
				// 获取连接状态以显示错误信息
				apiConnection.subscribe(state => {
					connectionError = state.error || '连接失败';
				})();
			}
		} catch (error) {
			connectionStatus = 'error';
			connectionError = error instanceof Error ? error.message : '未知错误';
		}
	}

	async function runTest(testName: string, testFn: () => Promise<any>) {
		const testIndex = testResults.findIndex(t => t.name === testName);
		if (testIndex >= 0) {
			testResults[testIndex].status = 'pending';
		} else {
			testResults.push({ name: testName, status: 'pending' });
		}
		testResults = [...testResults];

		const startTime = Date.now();
		
		try {
			const result = await testFn();
			const duration = Date.now() - startTime;
			
			const index = testResults.findIndex(t => t.name === testName);
			testResults[index] = {
				name: testName,
				status: 'success',
				result,
				duration
			};
		} catch (error) {
			const duration = Date.now() - startTime;
			
			const index = testResults.findIndex(t => t.name === testName);
			testResults[index] = {
				name: testName,
				status: 'error',
				error: error instanceof Error ? error.message : '未知错误',
				duration
			};
		}
		
		testResults = [...testResults];
	}

	// 具体的测试用例
	async function testHealthCheck() {
		return runTest('健康检查', async () => {
			const response = await api.healthCheck();
			return response;
		});
	}

	async function testDashboardStats() {
		return runTest('仪表板统计', async () => {
			const response = await api.getDashboardStats();
			return response;
		});
	}

	async function testRealtimeStats() {
		return runTest('实时统计', async () => {
			const response = await api.getRealtimeStats();
			return response;
		});
	}

	async function testCustomEndpoint() {
		return runTest('自定义端点', async () => {
			const { apiClient } = await import('$lib');
			const response = await apiClient.get(customEndpoint);
			return response;
		});
	}

	async function testPostRequest() {
		return runTest('POST请求', async () => {
			let data;
			try {
				data = JSON.parse(testData);
			} catch {
				data = { test: 'data' };
			}
			
			const { apiClient } = await import('$lib');
			const response = await apiClient.post('/test', data);
			return response;
		});
	}

	async function testCacheSystem() {
		return runTest('缓存系统', async () => {
			// 测试缓存功能
			const { cache } = await import('$lib');
			
			// 设置测试数据
			cache.set('test-key', { message: 'test cache' }, 5000);
			
			// 获取数据
			const cached = cache.get('test-key');
			
			// 获取缓存统计
			const stats = cache.stats();
			
			return {
				cached,
				stats,
				hasKey: cache.has('test-key')
			};
		});
	}

	async function testErrorHandling() {
		return runTest('错误处理', async () => {
			try {
				// 故意请求一个不存在的端点
				const { apiClient } = await import('$lib');
				const response = await apiClient.get('/non-existent-endpoint');
				return response;
			} catch (error) {
				// 测试错误恢复
				const apiError = {
					code: 'network_error' as any,
					message: 'Test error',
					details: error,
					retryable: true
				};
				
				const { apiClient } = await import('$lib');
				const recovery = apiClient.getErrorRecovery(apiError);
				return { error: apiError, recovery };
			}
		});
	}

	async function runAllTests() {
		testResults = [];
		
		await Promise.allSettled([
			testHealthCheck(),
			testDashboardStats(),
			testRealtimeStats(),
			testCustomEndpoint(),
			testPostRequest(),
			testCacheSystem(),
			testErrorHandling()
		]);
	}

	function updateApiConfig() {
		// 更新API配置
		import('$lib').then(({ apiClient }) => {
			apiClient.updateConfig({
				baseURL: apiBaseUrl
			});
		});
		
		// 重新检查连接
		checkConnection();
	}

	function clearResults() {
		testResults = [];
	}

	// 组件挂载时检查连接
	onMount(() => {
		checkConnection();
	});
</script>

<svelte:head>
	<title>API测试页面 - AI Studio Web</title>
</svelte:head>

<div class="max-w-6xl mx-auto p-6 space-y-8">
	<div>
		<h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">API基础设施测试</h1>
		<p class="text-gray-600 dark:text-gray-400">测试API客户端、缓存系统和错误处理功能</p>
	</div>

	<!-- API配置 -->
	<div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
		<h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">API配置</h2>
		
		<div class="grid md:grid-cols-2 gap-4 mb-4">
			<div>
				<label for="api-base-url" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
					API基础URL
				</label>
				<input
					id="api-base-url"
					type="text"
					bind:value={apiBaseUrl}
					class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
					placeholder="http://localhost:3001"
				/>
			</div>
			
			<div>
				<label for="custom-endpoint" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
					自定义端点
				</label>
				<input
					id="custom-endpoint"
					type="text"
					bind:value={customEndpoint}
					class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
					placeholder="/health"
				/>
			</div>
		</div>

		<div class="mb-4">
			<label for="test-data" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
				测试数据 (JSON)
			</label>
			<textarea
				id="test-data"
				bind:value={testData}
				rows="3"
				class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
				placeholder={'{"test": "data"}'}
			></textarea>
		</div>

		<button
			onclick={updateApiConfig}
			class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
		>
			更新配置
		</button>
	</div>

	<!-- 连接状态 -->
	<div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
		<h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">连接状态</h2>
		
		<div class="flex items-center gap-4 mb-4">
			<div class="flex items-center gap-2">
				{#if connectionStatus === 'checking'}
					<LoadingSpinner size="sm" />
					<span class="text-gray-600 dark:text-gray-400">检查中...</span>
				{:else if connectionStatus === 'connected'}
					<div class="w-3 h-3 bg-green-500 rounded-full"></div>
					<span class="text-green-600 dark:text-green-400">已连接</span>
				{:else if connectionStatus === 'disconnected'}
					<div class="w-3 h-3 bg-red-500 rounded-full"></div>
					<span class="text-red-600 dark:text-red-400">未连接</span>
				{:else}
					<div class="w-3 h-3 bg-yellow-500 rounded-full"></div>
					<span class="text-yellow-600 dark:text-yellow-400">错误</span>
				{/if}
			</div>
			
			<button
				onclick={checkConnection}
				class="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
			>
				重新检查
			</button>
		</div>

		{#if connectionError}
			<div class="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
				<p class="text-sm text-red-600 dark:text-red-400">{connectionError}</p>
			</div>
		{/if}
	</div>

	<!-- 测试控制 -->
	<div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
		<h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">测试控制</h2>
		
		<div class="flex flex-wrap gap-3 mb-4">
			<button
				onclick={runAllTests}
				class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
			>
				运行所有测试
			</button>
			
			<button
				onclick={testHealthCheck}
				class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
			>
				健康检查
			</button>
			
			<button
				onclick={testCacheSystem}
				class="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
			>
				缓存测试
			</button>
			
			<button
				onclick={testErrorHandling}
				class="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
			>
				错误处理
			</button>
			
			<button
				onclick={clearResults}
				class="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
			>
				清除结果
			</button>
		</div>
	</div>

	<!-- 测试结果 -->
	{#if testResults.length > 0}
		<div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
			<h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">测试结果</h2>
			
			<div class="space-y-4">
				{#each testResults as test}
					<div class="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
						<div class="flex items-center justify-between mb-2">
							<h3 class="font-medium text-gray-900 dark:text-white">{test.name}</h3>
							<div class="flex items-center gap-2">
								{#if test.duration}
									<span class="text-xs text-gray-500 dark:text-gray-400">{test.duration}ms</span>
								{/if}
								
								{#if test.status === 'pending'}
									<LoadingSpinner size="sm" />
								{:else if test.status === 'success'}
									<div class="w-2 h-2 bg-green-500 rounded-full"></div>
								{:else if test.status === 'error'}
									<div class="w-2 h-2 bg-red-500 rounded-full"></div>
								{/if}
							</div>
						</div>
						
						{#if test.error}
							<div class="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm">
								<p class="text-red-600 dark:text-red-400">{test.error}</p>
							</div>
						{:else if test.result}
							<div class="p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded">
								<pre class="text-xs text-gray-600 dark:text-gray-400 overflow-x-auto">{JSON.stringify(test.result, null, 2)}</pre>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>