/**
 * IndexedDB Storage Service
 * 
 * Provides persistent browser storage using IndexedDB for interview data.
 */

import type { StorageItem } from '../types';

export class IndexedDBStorage {
  private dbName = 'InterviewSimDB';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;

  /**
   * Initialize the database
   */
  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object stores
        if (!db.objectStoreNames.contains('files')) {
          const filesStore = db.createObjectStore('files', { keyPath: 'id' });
          filesStore.createIndex('type', 'type', { unique: false });
          filesStore.createIndex('uploadedAt', 'uploadedAt', { unique: false });
        }

        if (!db.objectStoreNames.contains('interviews')) {
          const interviewsStore = db.createObjectStore('interviews', { keyPath: 'id' });
          interviewsStore.createIndex('sessionId', 'sessionId', { unique: false });
          interviewsStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        if (!db.objectStoreNames.contains('analyses')) {
          const analysesStore = db.createObjectStore('analyses', { keyPath: 'id' });
          analysesStore.createIndex('processId', 'processId', { unique: false });
          analysesStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        if (!db.objectStoreNames.contains('batches')) {
          const batchesStore = db.createObjectStore('batches', { keyPath: 'id' });
          batchesStore.createIndex('batchId', 'batchId', { unique: false });
          batchesStore.createIndex('startTime', 'startTime', { unique: false });
        }

        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };
    });
  }

  /**
   * Save an item to a specific store
   */
  async saveItem<T>(storeName: string, id: string, data: T): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      
      const item: StorageItem<T> = {
        id,
        data,
        timestamp: new Date(),
        type: storeName
      };

      const request = store.put(item);

      request.onerror = () => {
        reject(new Error(`Failed to save item to ${storeName}`));
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }

  /**
   * Get an item from a specific store
   */
  async getItem<T>(storeName: string, id: string): Promise<T | null> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(id);

      request.onerror = () => {
        reject(new Error(`Failed to get item from ${storeName}`));
      };

      request.onsuccess = () => {
        const result = request.result as StorageItem<T> | undefined;
        resolve(result ? result.data : null);
      };
    });
  }

  /**
   * Get all items from a specific store
   */
  async getAllItems<T>(storeName: string): Promise<T[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onerror = () => {
        reject(new Error(`Failed to get all items from ${storeName}`));
      };

      request.onsuccess = () => {
        const results = request.result as StorageItem<T>[];
        resolve(results.map(item => item.data));
      };
    });
  }

  /**
   * Delete an item from a specific store
   */
  async deleteItem(storeName: string, id: string): Promise<boolean> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);

      request.onerror = () => {
        reject(new Error(`Failed to delete item from ${storeName}`));
      };

      request.onsuccess = () => {
        resolve(true);
      };
    });
  }

  /**
   * Clear all items from a specific store
   */
  async clearStore(storeName: string): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onerror = () => {
        reject(new Error(`Failed to clear store ${storeName}`));
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }

  /**
   * Query items by index
   */
  async queryByIndex<T>(
    storeName: string, 
    indexName: string, 
    value: any
  ): Promise<T[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(value);

      request.onerror = () => {
        reject(new Error(`Failed to query ${storeName} by ${indexName}`));
      };

      request.onsuccess = () => {
        const results = request.result as StorageItem<T>[];
        resolve(results.map(item => item.data));
      };
    });
  }

  /**
   * Query items by index range
   */
  async queryByIndexRange<T>(
    storeName: string,
    indexName: string,
    lowerBound: any,
    upperBound: any,
    lowerOpen = false,
    upperOpen = false
  ): Promise<T[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      
      const range = IDBKeyRange.bound(lowerBound, upperBound, lowerOpen, upperOpen);
      const request = index.getAll(range);

      request.onerror = () => {
        reject(new Error(`Failed to query ${storeName} by ${indexName} range`));
      };

      request.onsuccess = () => {
        const results = request.result as StorageItem<T>[];
        resolve(results.map(item => item.data));
      };
    });
  }

  /**
   * Count items in a store
   */
  async countItems(storeName: string): Promise<number> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.count();

      request.onerror = () => {
        reject(new Error(`Failed to count items in ${storeName}`));
      };

      request.onsuccess = () => {
        resolve(request.result);
      };
    });
  }

  /**
   * Get database size information
   */
  async getDatabaseInfo(): Promise<{
    name: string;
    version: number;
    stores: string[];
    totalItems: number;
  }> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const stores = Array.from(this.db.objectStoreNames);
    let totalItems = 0;

    for (const storeName of stores) {
      totalItems += await this.countItems(storeName);
    }

    return {
      name: this.dbName,
      version: this.dbVersion,
      stores,
      totalItems
    };
  }

  /**
   * Close the database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  /**
   * Delete the entire database
   */
  async deleteDatabase(): Promise<void> {
    this.close();
    
    return new Promise((resolve, reject) => {
      const deleteRequest = indexedDB.deleteDatabase(this.dbName);
      
      deleteRequest.onerror = () => {
        reject(new Error('Failed to delete database'));
      };
      
      deleteRequest.onsuccess = () => {
        resolve();
      };
    });
  }
}