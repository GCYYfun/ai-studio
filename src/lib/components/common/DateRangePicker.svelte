<script lang="ts">
	import { Button, Input } from 'flowbite-svelte';
	import { CalendarMonthOutline } from 'flowbite-svelte-icons';
	
	interface DateRange {
		start: Date;
		end: Date;
	}
	
	interface Props {
		value?: DateRange;
		onchange?: (range: DateRange) => void;
		disabled?: boolean;
		class?: string;
	}
	
	let {
		value = {
			start: new Date(Date.now() - 24 * 60 * 60 * 1000),
			end: new Date()
		},
		onchange,
		disabled = false,
		class: className = ''
	}: Props = $props();
	
	let showPopover = $state(false);
	let startDateInput = $state('');
	let endDateInput = $state('');
	
	// 格式化日期显示
	function formatDate(date: Date): string {
		if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
			return '无效日期';
		}
		return date.toLocaleDateString('zh-CN');
	}
	
	// 格式化日期为 YYYY-MM-DD 格式
	function formatDateForInput(date: Date): string {
		if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
			return new Date().toISOString().split('T')[0];
		}
		return date.toISOString().split('T')[0];
	}
	
	// 从输入字符串解析日期
	function parseDateFromInput(dateString: string): Date {
		if (!dateString) {
			return new Date();
		}
		const date = new Date(dateString + 'T00:00:00');
		if (isNaN(date.getTime())) {
			return new Date();
		}
		return date;
	}
	
	// 显示文本状态
	let displayText = $state('选择日期范围');
	
	// 更新显示文本的函数
	function updateDisplayText() {
		if (!value || !value.start || !value.end) {
			displayText = '选择日期范围';
			return;
		}
		
		try {
			const startStr = formatDate(value.start);
			const endStr = formatDate(value.end);
			displayText = `${startStr} - ${endStr}`;
		} catch (error) {
			console.error('Error updating display text:', error);
			displayText = '选择日期范围';
		}
	}
	
	// 监听value变化并更新显示文本
	$effect(() => {
		updateDisplayText();
		if (value && value.start && value.end) {
			startDateInput = formatDateForInput(value.start);
			endDateInput = formatDateForInput(value.end);
		}
	});
	
	// 应用日期范围
	function applyDateRange() {
		const start = parseDateFromInput(startDateInput);
		const end = parseDateFromInput(endDateInput);
		
		// 验证日期范围
		if (start > end) {
			alert('开始日期不能晚于结束日期');
			return;
		}
		
		const newRange = { start, end };
		if (onchange) {
			onchange(newRange);
		}
		updateDisplayText();
		showPopover = false;
	}
	
	// 快速选择预设范围
	function selectPresetRange(days: number) {
		const end = new Date();
		const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
		
		const newRange = { start, end };
		if (onchange) {
			onchange(newRange);
		}
		updateDisplayText();
		showPopover = false;
	}
</script>

<div class="relative {className}">
	<Button
		color="alternative"
		{disabled}
		class="flex items-center space-x-2"
		onclick={() => showPopover = !showPopover}
	>
		<CalendarMonthOutline class="w-4 h-4" />
		<span class="text-sm">{displayText}</span>
	</Button>
	
	{#if showPopover}
		<div class="absolute top-full left-0 mt-2 w-80 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg z-50">
			<div class="space-y-4">
				<div>
					<h4 class="text-sm font-medium text-gray-900 dark:text-white mb-3">
						选择日期范围
					</h4>
				</div>
				
				<!-- 快速选择按钮 -->
				<div class="grid grid-cols-3 gap-2">
					<Button
						size="xs"
						color="light"
						onclick={() => selectPresetRange(1)}
					>
						今天
					</Button>
					<Button
						size="xs"
						color="light"
						onclick={() => selectPresetRange(7)}
					>
						最近7天
					</Button>
					<Button
						size="xs"
						color="light"
						onclick={() => selectPresetRange(30)}
					>
						最近30天
					</Button>
				</div>
				
				<!-- 自定义日期输入 -->
				<div class="space-y-3">
					<div>
						<label for="start-date" class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
							开始日期
						</label>
						<Input
							id="start-date"
							type="date"
							bind:value={startDateInput}
							class="text-sm"
						/>
					</div>
					
					<div>
						<label for="end-date" class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
							结束日期
						</label>
						<Input
							id="end-date"
							type="date"
							bind:value={endDateInput}
							class="text-sm"
						/>
					</div>
				</div>
				
				<!-- 操作按钮 -->
				<div class="flex justify-end space-x-2 pt-2 border-t border-gray-200 dark:border-gray-600">
					<Button
						size="xs"
						color="alternative"
						onclick={() => showPopover = false}
					>
						取消
					</Button>
					<Button
						size="xs"
						onclick={applyDateRange}
					>
						应用
					</Button>
				</div>
			</div>
		</div>
	{/if}
</div>