/**
 * API Key Manager
 * 
 * Manages MengLong API key storage and validation
 */

import { menglongApi } from '$lib/services/menglongApi';

const API_KEY_STORAGE_KEY = 'menglong_api_key';

export class ApiKeyManager {
  private static instance: ApiKeyManager;
  private apiKey: string | null = null;
  private isValidated = false;

  private constructor() {
    this.loadFromStorage();
  }

  static getInstance(): ApiKeyManager {
    if (!ApiKeyManager.instance) {
      ApiKeyManager.instance = new ApiKeyManager();
    }
    return ApiKeyManager.instance;
  }

  /**
   * Load API key from localStorage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(API_KEY_STORAGE_KEY);
      if (stored) {
        this.apiKey = stored;
        menglongApi.setApiKey(stored);
      }
    } catch (error) {
      console.warn('Failed to load API key from storage:', error);
    }
  }

  /**
   * Save API key to localStorage
   */
  private saveToStorage(key: string): void {
    try {
      localStorage.setItem(API_KEY_STORAGE_KEY, key);
    } catch (error) {
      console.warn('Failed to save API key to storage:', error);
    }
  }

  /**
   * Set and validate API key
   */
  async setApiKey(key: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Set the API key
      menglongApi.setApiKey(key);

      // Validate by checking connection
      const response = await menglongApi.checkConnection();

      if (response.success) {
        this.apiKey = key;
        this.isValidated = true;
        this.saveToStorage(key);
        return { success: true };
      } else {
        this.isValidated = false;
        return { 
          success: false, 
          error: response.error || 'API连接失败' 
        };
      }
    } catch (error) {
      this.isValidated = false;
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'API验证失败' 
      };
    }
  }

  /**
   * Get current API key
   */
  getApiKey(): string | null {
    return this.apiKey;
  }

  /**
   * Check if API key is set and validated
   */
  isConfigured(): boolean {
    return !!this.apiKey && this.isValidated;
  }

  /**
   * Check if API key is set (but not necessarily validated)
   */
  hasApiKey(): boolean {
    return !!this.apiKey;
  }

  /**
   * Clear API key
   */
  clearApiKey(): void {
    this.apiKey = null;
    this.isValidated = false;
    try {
      localStorage.removeItem(API_KEY_STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to remove API key from storage:', error);
    }
  }

  /**
   * Validate current API key
   */
  async validateApiKey(): Promise<boolean> {
    if (!this.apiKey) {
      return false;
    }

    try {
      const response = await menglongApi.checkConnection();
      this.isValidated = response.success;
      return this.isValidated;
    } catch (error) {
      this.isValidated = false;
      return false;
    }
  }

  /**
   * Get masked API key for display
   */
  getMaskedApiKey(): string {
    if (!this.apiKey) {
      return '';
    }
    if (this.apiKey.length <= 8) {
      return this.apiKey;
    }
    return `${this.apiKey.substring(0, 8)}...`;
  }
}

// Export singleton instance
export const apiKeyManager = ApiKeyManager.getInstance();
