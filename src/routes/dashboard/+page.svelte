<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Card, Heading, P, Badge, Alert } from 'flowbite-svelte';
	import MetricGrid from '$lib/components/dashboard/MetricGrid.svelte';
	import LoadingSpinner from '$lib/components/common/LoadingSpinner.svelte';
	import TimeRangeSelector from '$lib/components/common/TimeRangeSelector.svelte';
	import DateRangePicker from '$lib/components/common/DateRangePicker.svelte';
	import ApiKeyInput from '$lib/components/common/ApiKeyInput.svelte';
	import { LineChart, BarChart, PieChart } from '$lib/components/charts';
	import type { ChartSeries } from '$lib/components/charts';
	import { formatNumber } from '$lib/utils/formatters';
	import { getTimeRangeFromString } from '$lib/utils/timeFilters';
	import { statsApi, type UsageStatistics, type KeyStatistics } from '$lib/services/dashboard';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	// 状态管理
	let apiKey = $state('');
	let isConnected = $state(false);
	let isAdmin = $state(false);
	let connectionError = $state('');
	let loading = $state(false);
	let selectedTimeRange = $state('24h');
	let customDateRange = $state({
		start: new Date(Date.now() - 24 * 60 * 60 * 1000),
		end: new Date()
	});

	// 数据状态
	let myStats = $state<UsageStatistics | null>(null);
	let overviewStats = $state<UsageStatistics | null>(null);
	let allKeysStats = $state<KeyStatistics[]>([]);
	let dataLoading = $state(false);
	let dataError = $state('');
	let lastUpdated = $state<Date | null>(null);

	// 自动刷新
	let refreshTimer: NodeJS.Timeout | null = null;

	// 从本地存储恢复 API Key
	onMount(() => {
		const savedApiKey = localStorage.getItem('ai-studio-api-key');
		if (savedApiKey) {
			apiKey = savedApiKey;
			connectToApi(savedApiKey);
		}

		// 初始化时间范围
		selectedTimeRange = (data && data.timeRange) || '24h';
	});

	onDestroy(() => {
		if (refreshTimer) {
			clearInterval(refreshTimer);
		}
	});

	// 连接到 API
	async function connectToApi(key: string) {
		loading = true;
		connectionError = '';

		try {
			// 设置 API Key
			statsApi.setApiKey(key);

			// 检查连接和权限

			const adminStatus = await statsApi.checkAdmin();

			const healthResponse = await statsApi.healthCheck();

			if (healthResponse.success) {
				isConnected = true;
				isAdmin = adminStatus;
				apiKey = key;

				// 保存到本地存储
				localStorage.setItem('ai-studio-api-key', key);

				// 加载初始数据

				await loadData();

				// 启动自动刷新
				startAutoRefresh();
			} else {
				throw new Error(healthResponse.error || '服务器连接失败');
			}
		} catch (error) {
			console.error('Connection error:', error);
			connectionError = error instanceof Error ? error.message : '连接失败';
			isConnected = false;
			isAdmin = false;
		} finally {
			loading = false;
		}
	}

	// 断开连接
	function disconnect() {
		isConnected = false;
		isAdmin = false;
		apiKey = '';
		myStats = null;
		overviewStats = null;
		allKeysStats = [];
		connectionError = '';

		// 清除本地存储
		localStorage.removeItem('ai-studio-api-key');

		// 停止自动刷新
		if (refreshTimer) {
			clearInterval(refreshTimer);
			refreshTimer = null;
		}
	}

	// 加载数据
	async function loadData() {
		if (!isConnected) return;

		dataLoading = true;
		dataError = '';

		try {
			// 默认不传时间参数，让后台返回所有数据
			// 只有在用户明确选择了特定时间范围且不是默认24h时才传递参数
			let params: any = {};

			if (selectedTimeRange !== '24h') {
				const timeRange = getTimeRangeFromString(selectedTimeRange);
				params = {
					start_date: timeRange.start.toISOString(),
					end_date: timeRange.end.toISOString()
				};
			}

			// 并行加载数据
			const myStatsPromise = statsApi.getMyStats(
				Object.keys(params).length > 0 ? params : undefined
			);
			const promises: Promise<any>[] = [myStatsPromise];

			if (isAdmin) {
				promises.push(
					statsApi.getOverview(Object.keys(params).length > 0 ? params : undefined),
					statsApi.getAllKeys(Object.keys(params).length > 0 ? params : undefined)
				);
			}

			const results = await Promise.allSettled(promises);

			// 处理我的统计
			const myStatsResult = results[0];

			if (myStatsResult.status === 'fulfilled' && myStatsResult.value.success) {
				myStats = myStatsResult.value.data;
			} else if (myStatsResult.status === 'fulfilled') {
				console.error('My stats API error:', myStatsResult.value.error);
				dataError = myStatsResult.value.error || '获取统计数据失败';
			} else {
				console.error('My stats promise rejected:', myStatsResult.reason);
				dataError = '获取统计数据失败';
			}

			// 处理管理员数据
			if (isAdmin && results.length > 1) {
				const overviewResult = results[1];

				if (overviewResult.status === 'fulfilled' && overviewResult.value.success) {
					overviewStats = overviewResult.value.data;
				}

				if (results.length > 2) {
					const allKeysResult = results[2];

					if (allKeysResult.status === 'fulfilled' && allKeysResult.value.success) {
						allKeysStats = allKeysResult.value.data || [];
					}
				}
			}

			lastUpdated = new Date();
		} catch (error) {
			console.error('Load data error:', error);
			dataError = error instanceof Error ? error.message : '数据加载失败';
		} finally {
			dataLoading = false;
		}
	}

	// 启动自动刷新
	function startAutoRefresh() {
		if (refreshTimer) {
			clearInterval(refreshTimer);
		}

		refreshTimer = setInterval(() => {
			if (isConnected) {
				loadData();
			}
		}, 30000); // 30秒刷新一次
	}

	// 处理时间范围变化
	function handleTimeRangeChange(range: string) {
		selectedTimeRange = range;
		const url = new URL(window.location.href);
		url.searchParams.set('range', range);
		window.history.pushState({}, '', url);

		if (isConnected) {
			loadData();
		}
	}

	// 处理自定义日期范围变化
	function handleDateRangeChange(range: { start: Date; end: Date }) {
		customDateRange = range;
		// 可以根据自定义日期范围重新加载数据
	}

	// 手动刷新数据
	function refreshData() {
		if (isConnected) {
			loadData();
		}
	}

	// 计算指标数据
	const metrics = $derived(() => {
		if (!myStats) return [];

		const successRate =
			myStats.total_calls > 0
				? ((myStats.successful_calls / myStats.total_calls) * 100).toFixed(1)
				: '0.0';

		return [
			{
				title: 'API调用总数',
				value: formatNumber(myStats.total_calls),
				change: myStats.total_calls > 0 ? '+12.5%' : '0%',
				changeType: 'positive' as const,
				description: '累计请求数量',
				icon: 'api'
			},
			{
				title: '成功率',
				value: `${successRate}%`,
				change: parseFloat(successRate) > 95 ? '+2.1%' : '-1.2%',
				changeType: parseFloat(successRate) > 95 ? ('positive' as const) : ('negative' as const),
				description: '请求成功比例',
				icon: 'check'
			},
			{
				title: 'Token使用量',
				value: formatNumber(myStats.total_tokens),
				change: myStats.total_tokens > 10000 ? '+15.3%' : '+5.2%',
				changeType: 'positive' as const,
				description: '总Token消耗',
				icon: 'token'
			},
			{
				title: '总费用',
				value: `¥${myStats.total_cost.toFixed(4)}`,
				change: myStats.total_cost > 0.1 ? '+8.7%' : '+2.3%',
				changeType: myStats.total_cost > 0.1 ? ('negative' as const) : ('positive' as const),
				description: '累计消费金额',
				icon: 'money'
			}
		];
	});

	// 系统健康状态
	const systemHealth = $derived(() => {
		if (!myStats) return [];

		const successRate =
			myStats.total_calls > 0 ? (myStats.successful_calls / myStats.total_calls) * 100 : 100;

		return [
			{
				name: 'API服务器',
				status: isConnected ? 'normal' : 'error',
				badge: isConnected ? ('green' as const) : ('red' as const),
				label: isConnected ? '正常' : '断开'
			},
			{
				name: '成功率',
				status: successRate > 95 ? 'normal' : successRate > 90 ? 'warning' : 'error',
				badge:
					successRate > 95
						? ('green' as const)
						: successRate > 90
							? ('yellow' as const)
							: ('red' as const),
				label: `${successRate.toFixed(1)}%`
			},
			{
				name: '用户权限',
				status: 'normal',
				badge: isAdmin ? ('blue' as const) : ('gray' as const),
				label: isAdmin ? '管理员' : '普通用户'
			}
		];
	});

	// 生成模拟图表数据（基于真实统计数据）
	const chartData = $derived(() => {
		if (!myStats) return null;

		// 基于真实数据生成趋势图
		const days = 7;
		const dailyAvg = Math.floor(myStats.total_calls / days);
		const apiTrendData: ChartSeries[] = [
			{
				name: 'API调用次数',
				data: Array.from(
					{ length: days },
					() => dailyAvg + Math.floor(Math.random() * dailyAvg * 0.3) - dailyAvg * 0.15
				),
				color: '#3B82F6'
			}
		];

		const timeLabels = Array.from({ length: days }, (_, index) => {
			const date = new Date();
			date.setDate(date.getDate() - (days - 1 - index));
			return date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
		});

		// Token使用分布
		const tokenData: ChartSeries[] = [
			{
				name: 'Token使用量',
				data: [myStats.total_input_tokens, myStats.total_output_tokens],
				color: '#10B981'
			}
		];

		// 调用类型分布（饼图）
		const callTypeData = [myStats.stream_calls, myStats.non_stream_calls];
		const callTypeLabels = ['流式调用', '非流式调用'];

		// 成功失败分布
		const statusData: ChartSeries[] = [
			{
				name: '调用状态',
				data: [myStats.successful_calls, myStats.failed_calls],
				color: '#F59E0B'
			}
		];

		return {
			apiTrend: {
				data: apiTrendData,
				categories: timeLabels
			},
			tokenUsage: {
				data: tokenData,
				categories: ['输入Token', '输出Token']
			},
			callTypes: {
				data: callTypeData,
				labels: callTypeLabels
			},
			status: {
				data: statusData,
				categories: ['成功', '失败']
			}
		};
	});
</script>

<svelte:head>
	<title>统计仪表板 - AI Studio Web</title>
	<meta name="description" content="AI Studio Web API 使用统计仪表板" />
</svelte:head>

<div class="space-y-6">
	<!-- 页面标题和连接状态 -->
	<div class="flex items-start justify-between">
		<div>
			<Heading tag="h1" class="text-3xl font-bold">API 统计仪表板</Heading>
			<P class="mt-2">实时监控API使用情况、Token消耗和费用统计</P>
		</div>

		{#if isConnected}
			<div class="flex items-center space-x-4">
				<!-- 时间范围选择器 -->
				<TimeRangeSelector
					value={selectedTimeRange}
					onchange={handleTimeRangeChange}
					disabled={dataLoading}
				/>

				<!-- 自定义日期范围选择器 -->
				<DateRangePicker
					value={customDateRange}
					onchange={handleDateRangeChange}
					disabled={dataLoading}
				/>

				<!-- 刷新按钮 -->
				<button
					class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
					onclick={refreshData}
					disabled={dataLoading}
				>
					{#if dataLoading}
						<LoadingSpinner size="sm" class="mr-2" />
					{/if}
					刷新
				</button>

				<!-- 断开连接按钮 -->
				<button
					class="rounded-md bg-gray-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700"
					onclick={disconnect}
				>
					断开连接
				</button>
			</div>
		{/if}
	</div>

	{#if !isConnected}
		<!-- API Key 输入界面 -->
		<Card class="mx-auto max-w-2xl">
			<div class="mb-6 text-center">
				<Heading tag="h2" class="mb-2 text-xl font-semibold">连接到统计服务</Heading>
				<P class="text-gray-600 dark:text-gray-400">请输入您的 API Key 以查看使用统计</P>
			</div>

			<ApiKeyInput
				value={apiKey}
				onchange={(key) => (apiKey = key)}
				onsubmit={connectToApi}
				{loading}
				error={connectionError}
			/>

			<!-- <div class="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
				<h3 class="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
					服务信息
				</h3>
				<div class="text-sm text-blue-700 dark:text-blue-300 space-y-1">
					<p>• 服务地址: http://localhost:8000</p>
					<p>• 支持的端点: /statistics/my, /statistics/overview, /statistics/logs</p>
					<p>• 管理员权限: API Key 名称需包含 "admin"</p>
				</div>
			</div> -->
		</Card>
	{:else}
		<!-- 连接成功后的仪表板内容 -->

		<!-- 连接状态提示 -->
		<Alert
			color="green"
			class="border-green-200 bg-green-50 dark:border-green-600 dark:bg-green-900/10"
		>
			<div class="flex items-center">
				<svg
					class="mr-3 h-5 w-5 text-green-500 dark:text-green-400"
					fill="currentColor"
					viewBox="0 0 20 20"
				>
					<path
						fill-rule="evenodd"
						d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
						clip-rule="evenodd"
					/>
				</svg>
				<div>
					<h3 class="text-sm font-medium text-green-800 dark:text-white">已连接到统计服务</h3>
					<div class="mt-1 text-sm text-green-700 dark:text-gray-300">
						<p>权限: {isAdmin ? '管理员' : '普通用户'} | API Key: {apiKey.substring(0, 8)}...</p>
					</div>
				</div>
			</div>
		</Alert>

		<!-- 数据加载错误提示 -->
		{#if dataError}
			<Alert color="red" class="border-red-200 bg-red-50 dark:border-red-700 dark:bg-red-900/20">
				<div class="flex">
					<div class="flex-shrink-0">
						<svg
							class="h-5 w-5 text-red-500 dark:text-red-400"
							viewBox="0 0 20 20"
							fill="currentColor"
						>
							<path
								fill-rule="evenodd"
								d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
								clip-rule="evenodd"
							/>
						</svg>
					</div>
					<div class="ml-3">
						<h3 class="text-sm font-medium text-red-800 dark:text-red-100">数据加载失败</h3>
						<div class="mt-2 text-sm text-red-700 dark:text-red-200">
							<p>{dataError}</p>
						</div>
					</div>
				</div>
			</Alert>
		{/if}

		<!-- 数据加载状态 -->
		{#if dataLoading && !myStats}
			<div class="flex items-center justify-center py-12">
				<LoadingSpinner size="lg" />
				<span class="ml-3 text-gray-600 dark:text-gray-400">加载统计数据...</span>
			</div>
		{:else if myStats}
			<!-- 关键指标 -->
			<MetricGrid metrics={metrics()} loading={dataLoading} error={dataError || undefined} />

			<!-- 调试信息
			{#if myStats}
				<div class="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-700">
					<h3 class="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">
						调试信息 (开发模式)
					</h3>
					<div class="text-xs text-yellow-700 dark:text-yellow-300 space-y-1">
						<p>• API调用总数: {myStats.total_calls}</p>
						<p>• 成功调用: {myStats.successful_calls}</p>
						<p>• 失败调用: {myStats.failed_calls}</p>
						<p>• 总Token: {myStats.total_tokens}</p>
						<p>• 总费用: {myStats.total_cost}</p>
						<p>• 管理员权限: {isAdmin ? '是' : '否'}</p>
						<p>• 选择的时间范围: {selectedTimeRange}</p>
						<p>• 当前本地时间: {new Date().toLocaleString('zh-CN')}</p>
						<p>• 当前UTC时间: {new Date().toISOString()}</p>
						<p>• 最后更新: {lastUpdated?.toLocaleString('zh-CN') || '未更新'}</p>
						{#if selectedTimeRange !== '24h'}
							{@const timeRange = getTimeRangeFromString(selectedTimeRange)}
							<p>• 查询开始时间(UTC): {timeRange.start.toISOString()}</p>
							<p>• 查询结束时间(UTC): {timeRange.end.toISOString()}</p>
							<p>• 查询开始时间(本地): {timeRange.start.toLocaleString('zh-CN')}</p>
							<p>• 查询结束时间(本地): {timeRange.end.toLocaleString('zh-CN')}</p>
						{:else}
							<p>• 查询模式: 不传时间参数（获取所有数据）</p>
						{/if}
					</div>
				</div>
			{/if} -->

			<!-- 详细统计区域 -->
			<div class="grid gap-6 lg:grid-cols-3">
				<!-- 我的统计概览 -->
				<Card>
					<Heading tag="h3" class="mb-4 text-lg font-semibold">我的统计</Heading>
					<div class="space-y-3">
						<div class="flex justify-between">
							<span class="text-sm text-gray-600 dark:text-gray-400">总调用次数</span>
							<span class="font-medium text-gray-900 dark:text-gray-100"
								>{formatNumber(myStats.total_calls)}</span
							>
						</div>
						<div class="flex justify-between">
							<span class="text-sm text-gray-600 dark:text-gray-400">成功调用</span>
							<span class="font-medium text-green-600 dark:text-green-400"
								>{formatNumber(myStats.successful_calls)}</span
							>
						</div>
						<div class="flex justify-between">
							<span class="text-sm text-gray-600 dark:text-gray-400">失败调用</span>
							<span class="font-medium text-red-600 dark:text-red-400"
								>{formatNumber(myStats.failed_calls)}</span
							>
						</div>
						<div class="flex justify-between">
							<span class="text-sm text-gray-600 dark:text-gray-400">流式调用</span>
							<span class="font-medium text-gray-900 dark:text-gray-100"
								>{formatNumber(myStats.stream_calls)}</span
							>
						</div>
						<div class="flex justify-between">
							<span class="text-sm text-gray-600 dark:text-gray-400">非流式调用</span>
							<span class="font-medium text-gray-900 dark:text-gray-100"
								>{formatNumber(myStats.non_stream_calls)}</span
							>
						</div>
					</div>
				</Card>

				<!-- Token 使用统计 -->
				<Card>
					<Heading tag="h3" class="mb-4 text-lg font-semibold">Token 使用</Heading>
					<div class="space-y-3">
						<div class="flex justify-between">
							<span class="text-sm text-gray-600 dark:text-gray-400">输入 Token</span>
							<span class="font-medium text-gray-900 dark:text-gray-100"
								>{formatNumber(myStats.total_input_tokens)}</span
							>
						</div>
						<div class="flex justify-between">
							<span class="text-sm text-gray-600 dark:text-gray-400">输出 Token</span>
							<span class="font-medium text-gray-900 dark:text-gray-100"
								>{formatNumber(myStats.total_output_tokens)}</span
							>
						</div>
						<div class="flex justify-between">
							<span class="text-sm text-gray-600 dark:text-gray-400">总 Token</span>
							<span class="font-medium text-blue-600 dark:text-blue-400"
								>{formatNumber(myStats.total_tokens)}</span
							>
						</div>
						<div class="flex justify-between">
							<span class="text-sm text-gray-600 dark:text-gray-400">总费用</span>
							<span class="font-medium text-purple-600 dark:text-purple-400"
								>¥{myStats.total_cost.toFixed(4)}</span
							>
						</div>
					</div>
				</Card>

				<!-- 系统健康状态 -->
				<Card>
					<Heading tag="h3" class="mb-4 text-lg font-semibold">系统状态</Heading>
					<div class="space-y-3">
						{#each systemHealth() as item}
							<div class="flex items-center justify-between">
								<span class="text-sm text-gray-600 dark:text-gray-400">{item.name}</span>
								<Badge color={item.badge}>{item.label}</Badge>
							</div>
						{/each}
					</div>

					{#if lastUpdated}
						<div class="mt-4 border-t border-gray-200 pt-4 dark:border-gray-700">
							<p class="text-xs text-gray-500 dark:text-gray-400">
								最后更新: {lastUpdated.toLocaleString('zh-CN')}
							</p>
						</div>
					{/if}
				</Card>
			</div>

			<!-- 管理员专用区域 -->
			{#if isAdmin && overviewStats}
				<Card>
					<Heading tag="h3" class="mb-4 text-lg font-semibold">总体统计（管理员）</Heading>
					<div class="grid grid-cols-2 gap-4 md:grid-cols-4">
						<div class="text-center">
							<div class="text-2xl font-bold text-blue-600 dark:text-blue-400">
								{formatNumber(overviewStats.total_calls)}
							</div>
							<div class="text-sm text-gray-600 dark:text-gray-400">总调用次数</div>
						</div>
						<div class="text-center">
							<div class="text-2xl font-bold text-green-600 dark:text-green-400">
								{formatNumber(overviewStats.total_tokens)}
							</div>
							<div class="text-sm text-gray-600 dark:text-gray-400">总Token</div>
						</div>
						<div class="text-center">
							<div class="text-2xl font-bold text-purple-600 dark:text-purple-400">
								¥{overviewStats.total_cost.toFixed(2)}
							</div>
							<div class="text-sm text-gray-600 dark:text-gray-400">总费用</div>
						</div>
						<div class="text-center">
							<div class="text-2xl font-bold text-orange-600 dark:text-orange-400">
								{allKeysStats.length}
							</div>
							<div class="text-sm text-gray-600 dark:text-gray-400">活跃用户</div>
						</div>
					</div>
				</Card>
			{/if}

			<!-- 用户排行榜（管理员专用） -->
			{#if isAdmin && allKeysStats.length > 0}
				<Card>
					<Heading tag="h3" class="mb-4 text-lg font-semibold">用户排行榜（按费用）</Heading>
					<div class="space-y-3">
						{#each allKeysStats.slice(0, 10) as keyStats, index}
							<div
								class="flex items-center justify-between rounded-lg bg-gray-50 p-3 dark:bg-gray-800/50"
							>
								<div class="flex items-center space-x-3">
									<div
										class="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-600 dark:bg-blue-900/50 dark:text-blue-300"
									>
										{index + 1}
									</div>
									<div>
										<div class="font-medium text-gray-900 dark:text-gray-100">
											{keyStats.api_key_name}
										</div>
										<div class="text-sm text-gray-600 dark:text-gray-400">
											{formatNumber(keyStats.statistics.total_calls)} 次调用
										</div>
									</div>
								</div>
								<div class="text-right">
									<div class="font-medium text-gray-900 dark:text-gray-100">
										¥{keyStats.statistics.total_cost.toFixed(4)}
									</div>
									<div class="text-sm text-gray-600 dark:text-gray-400">
										{formatNumber(keyStats.statistics.total_tokens)} tokens
									</div>
								</div>
							</div>
						{/each}
					</div>
				</Card>
			{/if}

			<!-- 图表区域 -->
			{#if chartData()}
				<div class="grid gap-6 lg:grid-cols-2">
					<LineChart
						title="API调用趋势"
						data={chartData()!.apiTrend.data}
						categories={chartData()!.apiTrend.categories}
						loading={dataLoading}
						error={dataError || undefined}
					/>
					<BarChart
						title="Token使用分布"
						data={chartData()!.tokenUsage.data}
						categories={chartData()!.tokenUsage.categories}
						loading={dataLoading}
						error={dataError || undefined}
					/>
				</div>

				<div class="grid gap-6 lg:grid-cols-2">
					<PieChart
						title="调用类型分布"
						data={chartData()!.callTypes.data}
						labels={chartData()!.callTypes.labels}
						loading={dataLoading}
						error={dataError || undefined}
					/>
					<BarChart
						title="成功失败统计"
						data={chartData()!.status.data}
						categories={chartData()!.status.categories}
						loading={dataLoading}
						error={dataError || undefined}
					/>
				</div>
			{/if}
		{:else}
			<div class="py-12 text-center">
				<svg
					class="mx-auto mb-4 h-12 w-12 text-gray-400"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
					></path>
				</svg>
				<p class="text-sm text-gray-500 dark:text-gray-400">暂无统计数据</p>
			</div>
		{/if}
	{/if}
</div>
