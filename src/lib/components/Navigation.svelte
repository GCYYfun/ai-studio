<script lang="ts">
	import { page } from '$app/state';
	import ThemeToggle from './ThemeToggle.svelte';
	import { onMount } from 'svelte';
	import { Button } from 'flowbite-svelte';

	const navItems = [
		{ href: '/', label: '首页', icon: 'home-outline', description: '欢迎页面和功能概览' },
		{
			href: '/playground',
			label: 'Playground',
			icon: 'play-outline',
			description: '模型测试和交互'
		},
		{ href: '/dashboard', label: '仪表板', icon: 'chart-outline', description: 'API统计和监控' }
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
<nav
	class="fixed top-0 right-0 left-0 z-40 border-b border-gray-200 bg-white lg:hidden dark:border-gray-700 dark:bg-gray-800"
>
	<div class="flex items-center justify-between px-4 py-3">
		<a href="/" class="flex items-center space-x-3">
			<div
				class="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600"
			>
				<svg class="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 20 20"
					><path
						d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.476.859h4.002z"
					/></svg
				>
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
				<svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20"
					><path
						fill-rule="evenodd"
						d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
						clip-rule="evenodd"
					/></svg
				>
			</Button>
		</div>
	</div>
</nav>

<!-- Mobile Overlay -->
{#if mounted && sidebarOpen}
	<div
		class="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
		onclick={closeSidebar}
		onkeydown={(e) => e.key === 'Escape' && closeSidebar()}
		role="button"
		tabindex="0"
		aria-label="Close sidebar"
	></div>
{/if}

<!-- Sidebar - 确保在桌面端始终显示 -->
<aside
	class="fixed inset-y-0 left-0 z-50 w-64 transform border-r border-gray-200 bg-white transition-transform duration-300 ease-in-out lg:translate-x-0 dark:border-gray-700 dark:bg-gray-800 {sidebarOpen
		? 'translate-x-0'
		: '-translate-x-full lg:translate-x-0'}"
>
	<div class="flex h-full flex-col">
		<!-- Logo Section -->
		<div
			class="flex h-16 items-center border-b border-gray-200 bg-white px-6 dark:border-gray-700 dark:bg-gray-800"
		>
			<div class="flex items-center space-x-3">
				<div
					class="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600"
				>
					<svg class="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 20 20"
						><path
							d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.476.859h4.002z"
						/></svg
					>
				</div>
				<div>
					<h1 class="text-lg font-semibold text-gray-900 dark:text-white">AI Studio</h1>
					<p class="text-xs text-gray-500 dark:text-gray-400">Web Platform</p>
				</div>
			</div>

			<!-- Close button for mobile -->
			<Button
				onclick={closeSidebar}
				color="light"
				class="ml-auto !p-1 lg:hidden"
				size="sm"
				aria-label="Close sidebar"
			>
				<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20"
					><path
						fill-rule="evenodd"
						d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
						clip-rule="evenodd"
					/></svg
				>
			</Button>
		</div>

		<!-- Navigation Links -->
		<nav class="flex-1 space-y-2 bg-white px-4 py-6 dark:bg-gray-800">
			{#each navItems as item}
				<a
					href={item.href}
					onclick={closeSidebar}
					class="group flex items-center rounded-lg p-3 text-base font-normal text-gray-900 transition-colors duration-200 hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700 {page
						.url.pathname === item.href
						? 'border-r-2 border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
						: ''}"
				>
					<svg
						class="h-5 w-5 flex-shrink-0 text-gray-500 transition duration-75 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white {page
							.url.pathname === item.href
							? 'text-blue-700 dark:text-blue-300'
							: ''}"
						fill="currentColor"
						viewBox="0 0 20 20"
					>
						{#if item.icon === 'home-outline'}
							<path
								d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"
							/>
						{:else if item.icon === 'play-outline'}
							<path
								fill-rule="evenodd"
								d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
								clip-rule="evenodd"
							/>
						{:else if item.icon === 'chart-outline'}
							<path
								d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"
							/>
						{/if}
					</svg>
					<div class="ml-3 flex-1">
						<div class="font-medium">{item.label}</div>
						<div class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
							{item.description}
						</div>
					</div>
				</a>
			{/each}
		</nav>

		<!-- Bottom Section -->
		<div class="border-t border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
			<!-- Theme Toggle (hidden on mobile since it's in header) -->
			<div class="mb-4 hidden items-center justify-between lg:flex">
				<span class="text-sm font-medium text-gray-700 dark:text-white">主题</span>
				<ThemeToggle />
			</div>

			<!-- Version Info -->
			<div class="text-xs text-gray-500 dark:text-gray-400">
				<div class="flex items-center justify-between">
					<span>版本 1.0.0</span>
					<span
						class="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
						>Beta</span
					>
				</div>
			</div>
		</div>
	</div>
</aside>
