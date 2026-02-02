<script lang="ts">
	import { page } from '$app/state';
	import ThemeToggle from './ThemeToggle.svelte';
	import { onMount } from 'svelte';
	import { ui } from '$lib/ui';
	const { Button, Icon } = ui;

	const navItems = [
		{ href: '/', label: '首页', icon: 'home', description: '欢迎页面和功能概览' },
		{ href: '/playground', label: 'Playground', icon: 'play', description: '模型测试和交互' },
		{ href: '/dashboard', label: '仪表板', icon: 'dashboard', description: 'API统计和监控' },
		{ href: '/interview-sim', label: '面试模拟', icon: 'user-group', description: '智能面试模拟和分析' },
		{ href: '/api-test', label: 'API测试', icon: 'cog', description: 'API基础设施测试' },
		{ href: '/test', label: 'UI测试', icon: 'palette', description: 'UI组件和主题测试' }
	];

	let sidebarOpen = $state(false);
	let mounted = $state(false);

	onMount(() => {
		mounted = true;
		
		const handleKeydown = (e: KeyboardEvent) => {
			if (e.key === 'Escape' && sidebarOpen) {
				closeSidebar();
			}
		};
		
		document.addEventListener('keydown', handleKeydown);
		
		return () => {
			document.removeEventListener('keydown', handleKeydown);
		};
	});

	function toggleSidebar() {
		sidebarOpen = !sidebarOpen;
	}

	function closeSidebar() {
		sidebarOpen = false;
	}
</script>

<!-- Mobile Navbar -->
<nav class="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
	<div class="px-4 py-3 flex items-center justify-between">
		<a href="/" class="flex items-center space-x-3">
			<div class="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
				<Icon name="lightning" size={20} class="text-white" />
			</div>
			<span class="text-lg font-semibold text-gray-900 dark:text-white">AI Studio</span>
		</a>
		
		<div class="flex items-center space-x-2">
			<ThemeToggle />
			<Button
				onclick={toggleSidebar}
				color="light"
				class="!p-2"
				size="sm"
				aria-label="Toggle sidebar"
			>
				<Icon name="menu" size={20} />
			</Button>
		</div>
	</div>
</nav>

<!-- Mobile Overlay -->
{#if mounted && sidebarOpen}
	<div 
		class="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
		onclick={closeSidebar}
		onkeydown={(e) => e.key === 'Escape' && closeSidebar()}
		role="button"
		tabindex="0"
		aria-label="Close sidebar"
	></div>
{/if}

<!-- Sidebar - 确保在桌面端始终显示 -->
<aside class="fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transform transition-transform duration-300 ease-in-out lg:translate-x-0 {sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}">
	<div class="flex flex-col h-full">
		<!-- Logo Section -->
		<div class="flex items-center h-16 px-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
			<div class="flex items-center space-x-3">
				<div class="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
					<Icon name="lightning" size={20} class="text-white" />
				</div>
				<div>
					<h1 class="text-lg font-semibold text-gray-900 dark:text-white">
						AI Studio
					</h1>
					<p class="text-xs text-gray-500 dark:text-gray-400">
						Web Platform
					</p>
				</div>
			</div>
			
			<!-- Close button for mobile -->
			<Button
				onclick={closeSidebar}
				color="light"
				class="lg:hidden ml-auto !p-1"
				size="sm"
				aria-label="Close sidebar"
			>
				<Icon name="close" size={16} />
			</Button>
		</div>

		<!-- Navigation Links -->
		<nav class="flex-1 px-4 py-6 space-y-2 bg-white dark:bg-gray-800">
			{#each navItems as item}
				<a 
					href={item.href}
					onclick={closeSidebar}
					class="group flex items-center p-3 text-base font-normal text-gray-900 rounded-lg dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 {page.url.pathname === item.href ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-r-2 border-blue-500' : ''}"
				>
					<Icon 
						name={item.icon} 
						size={20} 
						class="flex-shrink-0 w-5 h-5 text-gray-500 transition duration-75 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white {page.url.pathname === item.href ? 'text-blue-700 dark:text-blue-300' : ''}" 
					/>
					<div class="flex-1 ml-3">
						<div class="font-medium">{item.label}</div>
						<div class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
							{item.description}
						</div>
					</div>
				</a>
			{/each}
		</nav>

		<!-- Bottom Section -->
		<div class="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
			<!-- Theme Toggle (hidden on mobile since it's in header) -->
			<div class="hidden lg:flex items-center justify-between mb-4">
				<span class="text-sm font-medium text-gray-700 dark:text-white">主题</span>
				<ThemeToggle />
			</div>
			
			<!-- Version Info -->
			<div class="text-xs text-gray-500 dark:text-gray-400">
				<div class="flex items-center justify-between">
					<span>版本 1.0.0</span>
					<span class="px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium">Beta</span>
				</div>
			</div>
		</div>
	</div>
</aside>