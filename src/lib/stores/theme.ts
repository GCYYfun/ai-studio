import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export type Theme = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export interface ThemeState {
	theme: Theme;
	current: ResolvedTheme;
	systemPreference: ResolvedTheme;
}

// Default theme state - 确保默认为dark以匹配设计
const defaultState: ThemeState = {
	theme: 'dark',
	current: 'dark',
	systemPreference: 'dark'
};

// Create the theme store
function createThemeStore() {
	const { subscribe, set, update } = writable<ThemeState>(defaultState);

	// Get system preference
	function getSystemPreference(): ResolvedTheme {
		if (!browser) return 'dark';
		return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
	}

	// Resolve the current theme based on preference and system
	function resolveTheme(theme: Theme, systemPreference: ResolvedTheme): ResolvedTheme {
		if (theme === 'system') {
			return systemPreference;
		}
		return theme as ResolvedTheme;
	}

	// Apply theme to document
	function applyTheme(resolvedTheme: ResolvedTheme) {
		if (!browser) return;
		
		const root = document.documentElement;
		// 移除所有主题类
		root.classList.remove('light', 'dark');
		// 添加当前主题类
		root.classList.add(resolvedTheme);
		
		// 设置color-scheme以确保浏览器原生元素也使用正确主题
		root.style.colorScheme = resolvedTheme;
	}

	// Load theme from localStorage
	function loadTheme(): Theme {
		if (!browser) return 'dark';
		
		try {
			const stored = localStorage.getItem('ai-studio-theme');
			if (stored && ['light', 'dark', 'system'].includes(stored)) {
				return stored as Theme;
			}
		} catch (e) {
			console.warn('Failed to load theme from localStorage:', e);
		}
		
		return 'dark'; // 默认深色主题
	}

	// Save theme to localStorage
	function saveTheme(theme: Theme) {
		if (!browser) return;
		
		try {
			localStorage.setItem('ai-studio-theme', theme);
		} catch (e) {
			console.warn('Failed to save theme to localStorage:', e);
		}
	}

	// Initialize theme
	function init() {
		if (!browser) return;

		const systemPreference = getSystemPreference();
		const savedTheme = loadTheme();
		const current = resolveTheme(savedTheme, systemPreference);

		// 立即应用主题，避免闪烁
		applyTheme(current);

		set({
			theme: savedTheme,
			current,
			systemPreference
		});

		// Listen for system preference changes
		const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
		const handleChange = (e: MediaQueryListEvent) => {
			const newSystemPreference = e.matches ? 'dark' : 'light';
			update(state => {
				const newCurrent = resolveTheme(state.theme, newSystemPreference);
				applyTheme(newCurrent);
				return {
					...state,
					systemPreference: newSystemPreference,
					current: newCurrent
				};
			});
		};

		mediaQuery.addEventListener('change', handleChange);

		// Cleanup function
		return () => {
			mediaQuery.removeEventListener('change', handleChange);
		};
	}

	// Set theme
	function setTheme(newTheme: Theme) {
		update(state => {
			const current = resolveTheme(newTheme, state.systemPreference);
			applyTheme(current);
			saveTheme(newTheme);
			
			return {
				...state,
				theme: newTheme,
				current
			};
		});
	}

	// Toggle between light and dark (skips system)
	function toggle() {
		update(state => {
			const newTheme: Theme = state.current === 'dark' ? 'light' : 'dark';
			const current = resolveTheme(newTheme, state.systemPreference);
			applyTheme(current);
			saveTheme(newTheme);
			
			return {
				...state,
				theme: newTheme,
				current
			};
		});
	}

	return {
		subscribe,
		init,
		setTheme,
		toggle
	};
}

export const themeStore = createThemeStore();