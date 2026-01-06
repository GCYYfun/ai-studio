// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

// Global type declarations for AI Studio Web
declare module '$lib/types' {
	export * from '$lib/types/index.js';
}

export {};
