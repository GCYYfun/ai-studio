/**
 * Common utility types
 */

// Component props types
export interface PageComponent {
    load?: () => Promise<PageData>;
    title: string;
    description?: string;
}

export interface PageData {
    [key: string]: any;
}

// Utility types
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export interface AsyncState<T> {
    data: T | null;
    loading: boolean;
    error: string | null;
}

// Navigation types
export interface NavItem {
    href: string;
    label: string;
    icon: string;
    active?: boolean;
}
