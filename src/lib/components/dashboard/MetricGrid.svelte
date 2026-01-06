<script lang="ts">
	import StatsCard from './StatsCard.svelte';
	
	interface Metric {
		title: string;
		value: string | number;
		change?: string;
		changeType?: 'positive' | 'negative' | 'neutral';
		icon?: string;
		description?: string;
		loading?: boolean;
		error?: string;
		trend?: 'up' | 'down' | 'stable';
		unit?: string;
	}
	
	interface Props {
		metrics: Metric[];
		columns?: 1 | 2 | 3 | 4;
		loading?: boolean;
		error?: string;
	}
	
	let {
		metrics,
		columns = 4,
		loading = false,
		error
	}: Props = $props();
	
	const gridClasses = {
		1: 'grid-cols-1',
		2: 'grid-cols-1 md:grid-cols-2',
		3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
		4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
	};
	
	// 如果整体加载中，创建占位符指标
	const displayMetrics = $derived(() => {
		if (loading && metrics.length === 0) {
			return Array(columns).fill(null).map((_, index) => ({
				title: '加载中...',
				value: 0,
				loading: true,
				icon: 'dashboard'
			}));
		}
		
		return metrics.map(metric => ({
			...metric,
			loading: loading || metric.loading,
			error: error || metric.error
		}));
	});
</script>

<div class="grid {gridClasses[columns]} gap-4">
	{#each displayMetrics() as metric}
		<StatsCard {...metric} />
	{/each}
</div>