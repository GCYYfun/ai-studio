/**
 * Database Management Utilities
 * 
 * Tools for managing IndexedDB data - viewing, clearing, and deleting
 */

import { IndexedDBStorage } from './IndexedDBStorage';

export class DatabaseManager {
  private storage: IndexedDBStorage;

  constructor() {
    this.storage = new IndexedDBStorage();
  }

  /**
   * Get complete database information
   */
  async getDatabaseInfo() {
    try {
      await this.storage.initialize();
      const info = await this.storage.getDatabaseInfo();
      
      // Get detailed info for each store
      const storeDetails = [];
      for (const storeName of info.stores) {
        const count = await this.storage.countItems(storeName);
        const items = await this.storage.getAllItems(storeName);
        storeDetails.push({
          name: storeName,
          count,
          sampleItems: items.slice(0, 3) // First 3 items as sample
        });
      }

      return {
        ...info,
        storeDetails
      };
    } catch (error) {
      console.error('Failed to get database info:', error);
      return null;
    }
  }

  /**
   * Clear all data from a specific store
   */
  async clearStore(storeName: string): Promise<boolean> {
    try {
      await this.storage.initialize();
      await this.storage.clearStore(storeName);
      console.log(`✅ Cleared all data from store: ${storeName}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to clear store ${storeName}:`, error);
      return false;
    }
  }

  /**
   * Clear all uploaded files
   */
  async clearAllFiles(): Promise<boolean> {
    return await this.clearStore('files');
  }

  /**
   * Clear all interview data
   */
  async clearAllInterviews(): Promise<boolean> {
    return await this.clearStore('interviews');
  }

  /**
   * Clear all analysis data
   */
  async clearAllAnalyses(): Promise<boolean> {
    return await this.clearStore('analyses');
  }

  /**
   * Clear all settings
   */
  async clearAllSettings(): Promise<boolean> {
    return await this.clearStore('settings');
  }

  /**
   * Clear all data from all stores
   */
  async clearAllData(): Promise<boolean> {
    try {
      await this.storage.initialize();
      const info = await this.storage.getDatabaseInfo();
      
      for (const storeName of info.stores) {
        await this.storage.clearStore(storeName);
        console.log(`✅ Cleared store: ${storeName}`);
      }
      
      console.log('✅ All data cleared successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to clear all data:', error);
      return false;
    }
  }

  /**
   * Permanently delete the entire database
   */
  async deleteDatabase(): Promise<boolean> {
    try {
      await this.storage.deleteDatabase();
      console.log('✅ Database permanently deleted');
      return true;
    } catch (error) {
      console.error('❌ Failed to delete database:', error);
      return false;
    }
  }

  /**
   * Export all data for backup
   */
  async exportAllData() {
    try {
      await this.storage.initialize();
      const info = await this.storage.getDatabaseInfo();
      
      const exportData: Record<string, any[]> = {};
      
      for (const storeName of info.stores) {
        exportData[storeName] = await this.storage.getAllItems(storeName);
      }

      return {
        exportDate: new Date().toISOString(),
        databaseInfo: info,
        data: exportData
      };
    } catch (error) {
      console.error('Failed to export data:', error);
      return null;
    }
  }

  /**
   * Get storage usage estimate (if supported by browser)
   */
  async getStorageUsage() {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        return {
          quota: estimate.quota,
          usage: estimate.usage,
          usagePercentage: estimate.quota ? (estimate.usage! / estimate.quota * 100).toFixed(2) : 'Unknown'
        };
      } catch (error) {
        console.error('Failed to get storage estimate:', error);
      }
    }
    return null;
  }
}

// Browser console utilities
if (typeof window !== 'undefined') {
  const dbManager = new DatabaseManager();
  
  // Export to window for easy access in browser console
  (window as any).dbManager = dbManager;
  
  // Convenience functions
  (window as any).showDB = async () => {
    const info = await dbManager.getDatabaseInfo();
    console.log('📊 Database Information:', info);
    return info;
  };
  
  (window as any).clearFiles = async () => {
    return await dbManager.clearAllFiles();
  };
  
  (window as any).clearAllDB = async () => {
    return await dbManager.clearAllData();
  };
  
  (window as any).deleteDB = async () => {
    const confirm = window.confirm('⚠️ 确定要永久删除整个数据库吗？这个操作不可恢复！');
    if (confirm) {
      return await dbManager.deleteDatabase();
    }
    return false;
  };
  
  (window as any).exportDB = async () => {
    const data = await dbManager.exportAllData();
    if (data) {
      console.log('📦 Database Export:', data);
      // Create downloadable file
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `interview-db-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
    return data;
  };
  
  (window as any).storageUsage = async () => {
    const usage = await dbManager.getStorageUsage();
    console.log('💾 Storage Usage:', usage);
    return usage;
  };
  
  console.log(`
🗄️ Database Manager Loaded!

Available commands:
- showDB()      - 查看数据库信息
- clearFiles()  - 清除所有上传的文件
- clearAllDB()  - 清除所有数据
- deleteDB()    - 永久删除整个数据库
- exportDB()    - 导出数据库备份
- storageUsage() - 查看存储使用情况

Direct access:
- dbManager     - 数据库管理器实例
  `);
}