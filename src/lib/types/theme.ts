/**
 * Theme types
 */

export type Theme = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export interface ThemeConfig {
    theme: Theme;
    colors: ColorPalette;
    transitions: boolean;
}

export interface ColorPalette {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    accent: string;
}
