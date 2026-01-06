<script lang="ts">
	import { Select } from 'flowbite-svelte';
	import { ChevronDownOutline } from 'flowbite-svelte-icons';
	
	interface TimeRangeOption {
		value: string;
		label: string;
		description?: string;
	}
	
	interface Props {
		value: string;
		options?: TimeRangeOption[];
		onchange?: (value: string) => void;
		disabled?: boolean;
		class?: string;
	}
	
	let {
		value = '24h',
		options = [
			{ value: '1h', label: '最近1小时', description: '过去1小时的数据' },
			{ value: '6h', label: '最近6小时', description: '过去6小时的数据' },
			{ value: '24h', label: '最近24小时', description: '过去24小时的数据' },
			{ value: '7d', label: '最近7天', description: '过去7天的数据' },
			{ value: '30d', label: '最近30天', description: '过去30天的数据' },
			{ value: '90d', label: '最近90天', description: '过去90天的数据' }
		],
		onchange,
		disabled = false,
		class: className = ''
	}: Props = $props();
	
	function handleChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		const newValue = target.value;
		if (onchange) {
			onchange(newValue);
		}
	}
	
	// 获取当前选中选项的描述
	const selectedOption = $derived(() => 
		options.find(option => option.value === value)
	);
</script>

<div class="relative {className}">
	<Select
		{value}
		{disabled}
		onchange={handleChange}
		class="min-w-[140px] text-sm"
		placeholder="选择时间范围"
	>
		{#each options as option}
			<option value={option.value} title={option.description}>
				{option.label}
			</option>
		{/each}
	</Select>
	
	{#if selectedOption()?.description}
		<div class="absolute top-full left-0 mt-1 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
			{selectedOption()?.description}
		</div>
	{/if}
</div>